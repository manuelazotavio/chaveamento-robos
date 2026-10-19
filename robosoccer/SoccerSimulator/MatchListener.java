/*
	Receives match events from the GameController
*/
public interface MatchListener {

	// A goal was scored. timeA = scored by Match.TeamAClass
	public void onGoal(boolean timeA);

	// Game is over (end of 2nd half, or golden goal scored)
	public void onGameEnded();
}
