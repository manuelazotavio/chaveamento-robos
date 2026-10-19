import processing.core.*;
import processing.*;
import java.util.*;

public class Judge{

	private float BALL_OUTSIDE_TIME_LIMIT = 0.5f;
	private float ROBOT_TAKEN_OUTSIDE_TIME = 5f;
	private float BALL_STOPPED_TIME_LIMIT = 5f;
	private float GAME_DURATION = 60 * 5;

	private GameController controller;
	private GameSimulator simulator;

	// Robots that have been taken out of field for some reason
	private HashSet<Robot> takenOutRobots = new HashSet<Robot>();
	private HashMap<Robot, Timer> takenOutTimers = new HashMap<Robot, Timer>();

	Judge(GameController controller){
		this.controller = controller;
	}

	// Set the time for the entire game (defaults to 5min)
	float duration = GAME_DURATION;
	public void setDuration(float duration){
		this.duration = duration;
	}

	// If tied at the end, play on until the next goal (golden goal)
	boolean goldenGoal = false;
	public void setGoldenGoal(boolean goldenGoal){
		this.goldenGoal = goldenGoal;
	}

	// The actual game half time (1st, 2nd, 3 = golden goal, 4 = ended)
	private static final int HALF_GOLDEN_GOAL = 3;
	private static final int HALF_ENDED = 4;
	int gameHalf = 1;

	public boolean isOver(){
		return gameHalf >= HALF_ENDED;
	}

	// If the game went to golden goal
	private boolean wentToGoldenGoal = false;
	public boolean wentToGoldenGoal(){
		return wentToGoldenGoal;
	}

	float time;
	float realTime = 0;
	public void judge(float time){
		// Integrate time, only if no glitches and simulation is running
		if(time - this.time < 0.2 && controller.isRunning())
			realTime += time - this.time;

		this.time = time;

		// Skip Judging if is paused
		if(!controller.isRunning())
			return;

		// Check if Ball is outside field for a long time
		checkBallOutside();

		// Check if Ball is stopped for a long time
		checkBallStopped();

		// Remove robots from game, if they are outside
		checkRobotsOutside();

		// Put back robots that have been outside for longer time
		putBackRobotsOutside();

		// Check if scored goals
		checkGoal();

		// A golden goal ends the game
		if(isOver())
			return;

		// If no player in the game, re-position players
		checkNoPlayer();

		// Check end of Half
		checkEndOfHalf();
	}

	/*
		Returns the time to show in the UI
	*/
	public float getCurrentTime(){
		return realTime;
	}

	/*
		Returns the current state
	*/
	public String getCurrentState(){
		if(isOver())
			return "ENDED";

		String running = controller.isRunning() ? "Running" : "Stopped";
		String half = gameHalf + " half";
		if(gameHalf == HALF_GOLDEN_GOAL)
			half = "GOLDEN GOAL";

		return half + " - " + running;
	}

	private void setHalf(int half){
		gameHalf = half;

		if(half == 1){
			wentToGoldenGoal = false;
		}

		if(half == 2){
			controller.initTeamSides(false);
			controller.restartPositions(TeamSide.LEFT);
			controller.resumeGame();
		}

		if(half == HALF_GOLDEN_GOAL){
			wentToGoldenGoal = true;
			controller.restartPositions(null);
		}

		if(half >= HALF_ENDED){
			controller.restartPositions(null);
			controller.pauseGame();
			controller.onGameEnded();
		}
	}

	private Timer ballOutsideTimer = new Timer(BALL_OUTSIDE_TIME_LIMIT, true);
	private boolean isOut = false;
	private void checkBallOutside(){
		Ball b = simulator.ball;

		if(b.colliding(simulator.fieldArea)){
			ballOutsideTimer.reset(time);
		}else{
			if(ballOutsideTimer.triggered(time)){
				controller.moveBallToSpot(null);
			}
		}
	}

	private Timer ballStoppedTimer = new Timer(BALL_STOPPED_TIME_LIMIT, true);
	private void checkBallStopped(){
		Ball b = simulator.ball;

		if(b.getRealSpeed().magSq() == 0){
			if(ballStoppedTimer.triggered(time)){
				controller.moveBallToSpot(null);
			}
		}else{
			ballStoppedTimer.reset(time);
		}
	}

	private void checkRobotsOutside(){
		for(Robot r:controller.getRobots()){
			if(takenOutRobots.contains(r))
				continue;

			if(!simulator.fieldArea.colliding(r)){
				controller.removeRobot(r);
			}
		}
	}

	private void putBackRobotsOutside(){
		for(Robot r:controller.getRobots()){
			if(!takenOutRobots.contains(r))
				continue;

			Timer outTimer = takenOutTimers.get(r);
			if(outTimer.triggered(time)){
				controller.startRobot(r);
			}
		}
	}

	private void checkGoal(){
		Ball b = simulator.ball;
		boolean scored = false;

		if(b.colliding(simulator.goalLeft) && !b.colliding(simulator.fieldArea)){
			controller.addPointsFor(TeamSide.RIGHT, 1);
			controller.restartPositions(TeamSide.LEFT);
			scored = true;
		}else if(b.colliding(simulator.goalRight) && !b.colliding(simulator.fieldArea)){
			controller.addPointsFor(TeamSide.LEFT, 1);
			controller.restartPositions(TeamSide.RIGHT);
			controller.resumeGame();
			scored = true;
		}

		if(scored && gameHalf == HALF_GOLDEN_GOAL)
			setHalf(HALF_ENDED);
	}

	private void checkNoPlayer(){
		int playerCount = 0;
		for(Robot r:controller.getRobots()){
			if(!takenOutRobots.contains(r))
				playerCount++;
		}

		if(playerCount <= 0){
			controller.restartPositions(null);
			controller.resumeGame();
		}
	}

	private void checkEndOfHalf(){
		if(gameHalf <= 1 && realTime > duration / 2){
			setHalf(2);
		}else if(gameHalf == 2 && realTime > duration){
			boolean tied = controller.getPointsFor(TeamSide.LEFT) == controller.getPointsFor(TeamSide.RIGHT);
			setHalf(tied && goldenGoal ? HALF_GOLDEN_GOAL : HALF_ENDED);
		}
	}

	/*
		***** Callbacks from Controller
	*/

	/*
		Did reset everything
	*/
	public void onGameControllerReseted(){
		simulator = controller.getSimulator();
		takenOutRobots.clear();
		setHalf(1);

		time = realTime = 0;
	}

	public void onRobotRegistered(Robot r, TeamSide side){
		takenOutRobots.add(r);
		takenOutTimers.put(r, new Timer(ROBOT_TAKEN_OUTSIDE_TIME));
	}

	public void onRobotUnegistered(Robot r){
		takenOutRobots.remove(r);
	}

	public void onRobotPlaced(Robot r){
		takenOutRobots.remove(r);
	}

	public void onRobotRemoved(Robot r){
		takenOutRobots.add(r);
		takenOutTimers.get(r).reset(time);
	}


		

}