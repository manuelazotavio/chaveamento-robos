GameController controller;
Torneio torneio;

float SCALE = 300f;

void settings(){
  // Placeholder teams: the real ones are loaded when a match is selected
  controller = new GameController(new Match(
    // Team A Class
    CustomTeamA.class,
    // Team B Class
    CustomTeamB.class,
    // Number of robots on each side
    2
  ));

  controller.getSimulator().setFieldSize(2.44f, 1.82f);
  size((int)controller.getWidth(SCALE) + 200, (int)controller.getHeight(SCALE) + 100);
}

void setup(){
	torneio = new Torneio(sketchPath("torneio.properties"), controller);
	torneio.recarregar();
}

void draw(){

	background(255);

	if(torneio.tela == Torneio.TELA_SELECAO){
		drawSelecao();
		return;
	}

	controller.run();

	translate(100, 0);
	controller.draw(this, SCALE);
	translate(-100, 0);

	drawStatusTorneio();
}

/*
	Match selection screen: lists the matches of the tournament bracket
*/
void drawSelecao(){
	background(24, 28, 36);

	fill(255);
	textAlign(LEFT);
	textSize(30);
	text("RoboSoccer - Selecione a partida", 40, 60);

	textSize(14);
	fill(170);
	text("Setas: escolher   ENTER: carregar partida   C: recarregar chaveamento e torneio.properties", 40, 90);

	java.util.List<Torneio.PartidaInfo> partidas = torneio.partidas;
	int linhaAltura = 34;
	int topo = 130;
	int visiveis = (height - topo - 90) / linhaAltura;
	int inicio = constrain(torneio.selecionada - visiveis / 2, 0, max(0, partidas.size() - visiveis));

	if(torneio.carregando){
		fill(200);
		textSize(18);
		text("Carregando...", 40, topo + 20);
	}

	for(int i = inicio; i < min(partidas.size(), inicio + visiveis); i++){
		Torneio.PartidaInfo p = partidas.get(i);
		float y = topo + (i - inicio) * linhaAltura;

		if(i == torneio.selecionada){
			noStroke();
			fill(60, 90, 160);
			rect(30, y, width - 60, linhaAltura - 4, 4);
		}

		fill(p.jogavel() ? 255 : 130);
		textSize(16);
		textAlign(LEFT);
		text("#" + p.id + "  " + p.fase, 40, y + 21);
		text(torneio.nomeDoTime(p.timeAId) + "  x  " + torneio.nomeDoTime(p.timeBId), 250, y + 21);

		textAlign(RIGHT);
		String placar = "FINALIZADA".equals(p.status) || "EM_ANDAMENTO".equals(p.status) ? p.placarA + " x " + p.placarB + "   " : "";
		text(placar + p.status, width - 40, y + 21);
	}

	drawMensagem(height - 40);
}

/*
	Tournament bar under the field
*/
void drawStatusTorneio(){
	Torneio.PartidaInfo p = torneio.atual;
	if(p == null)
		return;

	float y = controller.getHeight(SCALE) + 10;
	noStroke();
	fill(0, 0, 0, 150);
	rect(0, y - 5, width, height - y + 5);

	fill(255);
	textAlign(LEFT);
	textSize(16);
	text("Partida #" + p.id + " (" + p.fase + ")   " + torneio.nomeDoTime(p.timeAId) + " (azul) " + torneio.golsA + " x " + torneio.golsB + " " + torneio.nomeDoTime(p.timeBId) + " (amarelo)", 20, y + 18);

	fill(190);
	textSize(13);
	text("ESPACO: iniciar/pausar   I: reiniciar partida (zera na API)   R: reposicionar   E: reenviar resultado   M: voltar a lista", 20, y + 40);

	drawMensagem(y + 70);
}

void drawMensagem(float y){
	if(torneio.mensagem == null || torneio.mensagem.isEmpty())
		return;

	textAlign(LEFT);
	textSize(14);
	if(torneio.mensagemErro)
		fill(255, 110, 110);
	else
		fill(140, 230, 140);
	text(torneio.mensagem, 20, y - 14, width - 40, 40);
}

/*
	Finds out what is closer to the ball that can be moved,
	and then move to that position
*/
public void mouseDragged(){
	if(torneio.tela != Torneio.TELA_JOGO)
		return;

	// Checks what is closest to the mouse cursos (Robots and Ball)
	PVector mousePoint = new PVector((mouseX - 100) / SCALE, (mouseY - 150) / SCALE);

	float closestDist = 0.1f;
	Simulatable closest = controller.getSimulator().ball;

	for(Simulatable s: controller.getSimulator().simulatables){
		// Skip if not Ball or Robot
		if(!(s instanceof Ball || s instanceof Robot))
			continue;

		float dist = PVector.sub(s.getRealPosition(), mousePoint).mag();
		if(closestDist > dist){
			closestDist = dist;
			closest = s;
		}
	}

	if(closest != null){
		closest.position.set(mousePoint);
		closest.speed = new PVector();
		closest.accel = new PVector();
	}
}

public void keyPressed(){

	if(torneio.tela == Torneio.TELA_SELECAO){
		if(key == CODED && keyCode == UP){
			torneio.mover(-1);
		}else if(key == CODED && keyCode == DOWN){
			torneio.mover(1);
		}else if(key == ENTER || key == RETURN){
			torneio.abrirSelecionada();
		}else if(key == 'c' || key == 'C'){
			torneio.recarregar();
		}
		return;
	}

	if(key == ' '){
		if(torneio.jogoEncerrado()){
			System.out.println("Game is over");
		}else if(!controller.hasStarted()){
			System.out.println("Start game");
			controller.resetGame();
			controller.resumeGame();
		}else if(controller.isRunning()){
			System.out.println("Pause game");
			controller.pauseGame();
		}else{
			System.out.println("Resume game");
			controller.resumeGame();
		}
	}else if(key == 'i' || key == 'I'){
		torneio.reiniciarPartida();
	}else if(key == 'r' || key == 'R'){
		controller.restartPositions(null);
	}else if(key == 'e' || key == 'E'){
		torneio.enviarResultado();
	}else if(key == 'm' || key == 'M'){
		torneio.voltarParaLista();
	}else if(key == 'd'){
		String debug = "DEBUG:";
		debug += "\nisRunning:"+controller.isRunning();
		debug += "\nController Robots:"+controller.robots.size();
		for(Robot r:controller.robots)
			debug += "\n\t"+r+" ["+r.position.x+","+r.position.y+"]";

		debug += "\nSimulatables:"+controller.getSimulator().simulatables.size();
		for(Simulatable r:controller.getSimulator().simulatables)
			debug += "\n\t"+r;

		System.out.println(debug);
	}

}
