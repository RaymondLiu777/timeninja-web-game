export enum GameStatus {
    Unstarted = "Unstarted",
	InProgress = "InProgress",
	Tie = "Tie",
    Player1Win = "Player1Win",
    Player2Win = "Player2Win",
    Disconnect = "Disconnect"
}

export namespace GameStatus {
    export function isDone(gameStatus: GameStatus): Boolean {
        return gameStatus === GameStatus.Tie || gameStatus === GameStatus.Player1Win 
            || gameStatus === GameStatus.Player2Win || gameStatus === GameStatus.Disconnect;
    }
}