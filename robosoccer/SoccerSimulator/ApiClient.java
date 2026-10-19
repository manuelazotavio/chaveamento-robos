import java.io.*;
import java.net.*;
import java.util.*;

/*
	HTTP client for the chaveamento-robos API.
	Uses HttpURLConnection so it runs on the Java bundled with Processing 3.
	All calls are blocking: run them outside the draw thread.
*/
public class ApiClient {

	public static class Resposta {
		public int status;
		public String corpo;

		public boolean ok(){
			return status >= 200 && status < 300;
		}

		public String erro(){
			try{
				String erro = Json.getString(Json.parse(corpo), "erro");
				if(erro != null)
					return erro;
			}catch(Exception e){}
			return "HTTP " + status + (corpo == null || corpo.isEmpty() ? "" : ": " + corpo);
		}
	}

	private final TorneioConfig config;
	private String token;

	ApiClient(TorneioConfig config){
		this.config = config;
	}

	public void autenticar(){
		String json = "{\"email\":\"" + Json.escape(config.email) + "\",\"senha\":\"" + Json.escape(config.senha) + "\"}";
		Resposta r = enviar("POST", "/auth/login", json, false);
		if(!r.ok())
			throw new RuntimeException("Falha no login (" + config.email + "): HTTP " + r.status);

		token = Json.getString(Json.parse(r.corpo), "token");
		if(token == null)
			throw new RuntimeException("Login sem token na resposta");
	}

	/*
		Team id -> team name
	*/
	public Map<Long, String> carregarTimes(){
		Resposta r = requisitar("GET", "/api/times", null);
		if(!r.ok())
			throw new RuntimeException("Erro ao carregar times: " + r.erro());

		Map<Long, String> nomes = new HashMap<Long, String>();
		for(Object t : (List)Json.parse(r.corpo))
			nomes.put(Json.getLong(t, "id"), Json.getString(t, "nome"));
		return nomes;
	}

	public List<Object> carregarPartidas(){
		Resposta r = requisitar("GET", "/torneios/" + config.torneioId + "/chaveamento", null);
		if(!r.ok())
			throw new RuntimeException("Erro ao carregar o chaveamento: " + r.erro());
		return (List<Object>)Json.parse(r.corpo);
	}

	public Resposta iniciarPartida(long partidaId){
		return requisitar("POST", "/partidas/" + partidaId + "/iniciar", null);
	}

	public Resposta resetarPartida(long partidaId){
		return requisitar("POST", "/partidas/" + partidaId + "/resetar", null);
	}

	/*
		Registers one goal. No closing rules are sent, so the API never
		finishes the match by itself: the final result is sent at the end.
	*/
	public Resposta registrarGol(long partidaId, boolean timeA){
		String json = "{\"vencedorRound\":\"" + (timeA ? "TIME_A" : "TIME_B") + "\"}";
		return requisitar("POST", "/partidas/" + partidaId + "/rounds", json);
	}

	public Resposta registrarResultado(long partidaId, int placarA, int placarB, String observacao){
		String json = "{\"placarTimeA\":" + placarA + ",\"placarTimeB\":" + placarB;
		if(observacao != null && !observacao.trim().isEmpty())
			json += ",\"observacao\":\"" + Json.escape(observacao) + "\"";
		json += "}";
		return requisitar("POST", "/partidas/" + partidaId + "/resultado", json);
	}

	/*
		Authenticated request. Logs in again once if the token expired.
	*/
	private Resposta requisitar(String metodo, String caminho, String corpo){
		if(token == null)
			autenticar();

		Resposta r = enviar(metodo, caminho, corpo, true);
		if(r.status == 401 || r.status == 403){
			autenticar();
			r = enviar(metodo, caminho, corpo, true);
		}
		return r;
	}

	private Resposta enviar(String metodo, String caminho, String corpo, boolean comToken){
		HttpURLConnection con = null;
		try{
			con = (HttpURLConnection)new URL(config.apiBaseUrl + caminho).openConnection();
			con.setRequestMethod(metodo);
			con.setConnectTimeout(10000);
			con.setReadTimeout(15000);
			con.setRequestProperty("Accept", "application/json");
			if(comToken && token != null)
				con.setRequestProperty("Authorization", "Bearer " + token);

			if(corpo != null){
				con.setDoOutput(true);
				con.setRequestProperty("Content-Type", "application/json; charset=UTF-8");
				try(OutputStream out = con.getOutputStream()){
					out.write(corpo.getBytes("UTF-8"));
				}
			}else if(metodo.equals("POST")){
				con.setDoOutput(true);
				con.setFixedLengthStreamingMode(0);
			}

			Resposta r = new Resposta();
			r.status = con.getResponseCode();
			InputStream in = r.status >= 400 ? con.getErrorStream() : con.getInputStream();
			r.corpo = ler(in);
			return r;
		}catch(IOException e){
			throw new RuntimeException("Sem conexao com a API (" + config.apiBaseUrl + "): " + e.getMessage());
		}finally{
			if(con != null)
				con.disconnect();
		}
	}

	private static String ler(InputStream in) throws IOException{
		if(in == null)
			return "";
		ByteArrayOutputStream out = new ByteArrayOutputStream();
		byte[] buf = new byte[4096];
		int n;
		while((n = in.read(buf)) > 0)
			out.write(buf, 0, n);
		in.close();
		return out.toString("UTF-8");
	}
}
