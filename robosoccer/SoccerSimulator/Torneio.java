import java.util.*;
import java.util.concurrent.*;

/*
	Connects the simulator to the chaveamento-robos API:
	lists the matches of the tournament, loads the Team classes of the
	selected match, sends every goal and the final result.

	API calls run on a single background thread (in order), so the
	draw loop never blocks. Simulator changes happen only on the
	Processing thread (key events and draw).
*/
public class Torneio implements MatchListener {

	public static final int TELA_SELECAO = 0;
	public static final int TELA_JOGO = 1;

	public static class PartidaInfo {
		public long id;
		public String fase;
		public String status;
		public Long timeAId, timeBId;
		public int placarA, placarB;

		public boolean jogavel(){
			return timeAId != null && timeBId != null && !"FINALIZADA".equals(status);
		}
	}

	private final String configPath;
	private final GameController controller;
	private TorneioConfig config;
	private ApiClient api;

	private final ExecutorService worker = Executors.newSingleThreadExecutor(new ThreadFactory(){
		public Thread newThread(Runnable r){
			Thread t = new Thread(r, "torneio-api");
			t.setDaemon(true);
			return t;
		}
	});

	public volatile int tela = TELA_SELECAO;
	public volatile boolean carregando = false;
	public volatile List<PartidaInfo> partidas = new ArrayList<PartidaInfo>();
	private volatile Map<Long, String> nomesTimes = new HashMap<Long, String>();
	public volatile int selecionada = 0;

	public volatile String mensagem = "";
	public volatile boolean mensagemErro = false;

	// Match being played
	public volatile PartidaInfo atual;
	public volatile int golsA, golsB;
	public volatile boolean resultadoEnviado = false;

	Torneio(String configPath, GameController controller){
		this.configPath = configPath;
		this.controller = controller;
		controller.setMatchListener(this);
	}

	/*
		Reads torneio.properties and loads teams and matches from the API
	*/
	public void recarregar(){
		try{
			config = TorneioConfig.carregar(configPath);
		}catch(Exception e){
			erro(e.getMessage());
			return;
		}
		api = new ApiClient(config);

		carregando = true;
		info("Carregando chaveamento do torneio #" + config.torneioId + "...");
		final ApiClient cliente = api;
		worker.submit(new Runnable(){ public void run(){
			try{
				cliente.autenticar();
				nomesTimes = cliente.carregarTimes();

				List<PartidaInfo> lista = new ArrayList<PartidaInfo>();
				for(Object p : cliente.carregarPartidas())
					lista.add(lerPartida(p));

				partidas = lista;
				selecionada = primeiraJogavel(lista);
				info(lista.isEmpty() ? "Nenhuma partida no chaveamento do torneio #" + config.torneioId : lista.size() + " partidas carregadas");
			}catch(Exception e){
				erro(e.getMessage());
			}finally{
				carregando = false;
			}
		}});
	}

	private PartidaInfo lerPartida(Object p){
		PartidaInfo info = new PartidaInfo();
		info.id = Json.getLong(p, "id");
		info.fase = Json.getString(p, "fase");
		info.status = Json.getString(p, "status");
		info.timeAId = Json.getLong(p, "timeAId");
		info.timeBId = Json.getLong(p, "timeBId");
		info.placarA = Json.getInt(p, "placarTimeA", 0);
		info.placarB = Json.getInt(p, "placarTimeB", 0);
		return info;
	}

	private int primeiraJogavel(List<PartidaInfo> lista){
		for(int i = 0; i < lista.size(); i++)
			if(lista.get(i).jogavel())
				return i;
		return 0;
	}

	public String nomeDoTime(Long timeId){
		if(timeId == null)
			return "A definir";
		String nome = nomesTimes.get(timeId);
		return nome != null ? nome : "Time #" + timeId;
	}

	public void mover(int delta){
		int n = partidas.size();
		if(n == 0)
			return;
		selecionada = Math.max(0, Math.min(n - 1, selecionada + delta));
	}

	/*
		Loads the selected match into the simulator.
		Must be called from the Processing thread.
	*/
	public void abrirSelecionada(){
		if(carregando || config == null || partidas.isEmpty())
			return;

		PartidaInfo p = partidas.get(selecionada);
		if(!p.jogavel()){
			erro("Partida #" + p.id + " ja finalizada ou sem os dois times definidos");
			return;
		}

		Class<? extends Team> classeA = resolverClasse(p.timeAId);
		if(classeA == null)
			return;
		Class<? extends Team> classeB = resolverClasse(p.timeBId);
		if(classeB == null)
			return;

		Judge judge = controller.getJudge();
		judge.setDuration(config.duracaoSegundos);
		judge.setGoldenGoal(config.golDeOuro);

		atual = p;
		controller.setTeamNames(nomeDoTime(p.timeAId), nomeDoTime(p.timeBId));
		controller.setMatch(new Match(classeA, classeB, config.jogadoresPorTime));

		tela = TELA_JOGO;
		comecarDoZero();
	}

	/*
		Restarts the current match (simulator and API score)
	*/
	public void reiniciarPartida(){
		if(atual == null)
			return;
		controller.resetGame();
		comecarDoZero();
	}

	public void voltarParaLista(){
		if(controller.isRunning())
			controller.pauseGame();
		tela = TELA_SELECAO;
		atual = null;
		recarregar();
	}

	public boolean jogoEncerrado(){
		return controller.getJudge().isOver();
	}

	/*
		Clears the score on the API and marks the match as started,
		so goals are counted from 0 x 0
	*/
	private void comecarDoZero(){
		golsA = golsB = 0;
		resultadoEnviado = false;

		final long id = atual.id;
		final String nomes = nomeDoTime(atual.timeAId) + " x " + nomeDoTime(atual.timeBId);
		info("Partida #" + id + " carregada: " + nomes + ". Espaco para comecar.");
		chamarApi("preparar a partida #" + id, new Callable<ApiClient.Resposta>(){ public ApiClient.Resposta call(){
			ApiClient.Resposta r = api.resetarPartida(id);
			return r.ok() ? api.iniciarPartida(id) : r;
		}});
	}

	/*
		***** Callbacks from GameController (Processing thread)
	*/

	public void onGoal(final boolean timeA){
		if(atual == null || tela != TELA_JOGO)
			return;

		if(timeA)
			golsA++;
		else
			golsB++;

		final long id = atual.id;
		info("Gol de " + nomeDoTime(timeA ? atual.timeAId : atual.timeBId) + "! " + golsA + " x " + golsB);
		chamarApi("registrar gol", new Callable<ApiClient.Resposta>(){ public ApiClient.Resposta call(){
			return api.registrarGol(id, timeA);
		}});
	}

	public void onGameEnded(){
		if(atual == null || tela != TELA_JOGO)
			return;

		if(golsA == golsB){
			erro("Fim de jogo empatado em " + golsA + " x " + golsB + ". Ative jogo.golDeOuro ou registre o vencedor no painel web.");
			return;
		}
		enviarResultado();
	}

	/*
		Sends the final score. The API finishes the match and moves the
		winner to the next match of the bracket.
	*/
	public void enviarResultado(){
		if(atual == null || resultadoEnviado || !jogoEncerrado() || golsA == golsB)
			return;

		final long id = atual.id;
		final int a = golsA, b = golsB;
		final String vencedor = nomeDoTime(a > b ? atual.timeAId : atual.timeBId);
		final String observacao = controller.getJudge().wentToGoldenGoal() ? "Decidido no gol de ouro" : null;

		info("Enviando resultado " + a + " x " + b + "...");
		worker.submit(new Runnable(){ public void run(){
			try{
				ApiClient.Resposta r = api.registrarResultado(id, a, b, observacao);
				if(r.ok()){
					resultadoEnviado = true;
					info("Vitoria de " + vencedor + " (" + a + " x " + b + ")! Resultado enviado. M para voltar a lista.");
				}else{
					erro("Falha ao enviar resultado: " + r.erro() + ". Tecle E para tentar de novo.");
				}
			}catch(Exception e){
				erro("Falha ao enviar resultado: " + e.getMessage() + ". Tecle E para tentar de novo.");
			}
		}});
	}

	private void chamarApi(final String acao, final Callable<ApiClient.Resposta> chamada){
		worker.submit(new Runnable(){ public void run(){
			try{
				ApiClient.Resposta r = chamada.call();
				if(!r.ok())
					erro("Falha ao " + acao + ": " + r.erro());
			}catch(Exception e){
				erro("Falha ao " + acao + ": " + e.getMessage());
			}
		}});
	}

	/*
		Finds the Team class configured for a team id (time.<id>=Class)
	*/
	private Class<? extends Team> resolverClasse(Long timeId){
		String nome = config.classeDoTime(timeId);
		if(nome == null || nome.isEmpty()){
			erro("Sem classe para " + nomeDoTime(timeId) + ". Adicione time." + timeId + "=NomeDaClasse em torneio.properties e tecle C.");
			return null;
		}

		try{
			Class<?> c = Class.forName(nome);
			if(!Team.class.isAssignableFrom(c)){
				erro("A classe " + nome + " nao implementa Team");
				return null;
			}
			// Make sure the team can be built before handing it to the simulator
			c.newInstance();
			return (Class<? extends Team>)c;
		}catch(ClassNotFoundException e){
			erro("Classe " + nome + " nao encontrada. Coloque " + nome + ".java na pasta do sketch e reinicie o Processing.");
		}catch(Throwable e){
			erro("Erro ao criar o time " + nome + ": " + e);
		}
		return null;
	}

	private void info(String texto){
		System.out.println("[Torneio] " + texto);
		mensagem = texto;
		mensagemErro = false;
	}

	private void erro(String texto){
		System.out.println("[Torneio] ERRO: " + texto);
		mensagem = texto;
		mensagemErro = true;
	}
}
