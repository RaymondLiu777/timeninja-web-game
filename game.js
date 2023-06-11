const fs = require('fs');

const GameStates = {
    Unstarted: "Unstarted",
	InProgress: "InProgress",
	Finished: "Finished"
}

const directions_offsets = {
    Up: [-1, 0],
    Down: [1, 0],
    Left: [0, -1],
    Right: [0, 1],
};

const fileContent = fs.readFileSync("stage1.txt", 'utf-8');
const lines = fileContent.trim().split('\n');
const stage1Map = lines.map(line => line.trim().split(' ').map(Number).map((num) => {
    if(num === 0) {
        return {
            type: "Block",
            object: null
        }
    }
    if(num === 1) {
        return {
            type: "Empty",
            object: null
        }
    }
}));

class Game {

    constructor(io, gameId) {
        this.io = io;
        this.gameId = gameId;
        this.player1 = null;
        this.player2 = null;
        this.gameState = GameStates.Unstarted;
        this.game = null;
    }

    /**
     * Initialize Game Object
     */
    static createGame(io, games, gameId) {
        if(gameId in games) {
            console.log("Game ", gameId, " already created");
            return false;
        }
        games[gameId] = new Game(io, gameId);
        console.log("Created Game: ", gameId);
        return true;
    }

    /**
     * Tries to add player to game if there is empty spot
     */
    addPlayer(player) {
        if(player.game !== null) {
            console.log("Player: ", player.id, " is already in a game");
        }
        if(this.player1 === null) {
            player.game = this.gameId;
            this.player1 = player;
            console.log("Add Player: ", player.id, " to Game: ", this.gameId);
        }
        else if(this.player2 === null) {
            player.game = this.gameId;
            this.player2 = player;
            console.log("Add Player: ", player.id, " to Game: ", this.gameId);
            this.startGame();
        }
        else {
            console.log("Game ", this.gameId, " is full");
        }
    }

    /**
     * Remove player from game if they are in it
     * Terminates the game for all
     */
    removePlayer(playerId) {
        if(this.player1.id === playerId || this.player2.id === playerId) {
            if(this.player1 !== null) {
                this.player1.game = null;
            }
            if(this.player2 !== null) {
                this.player2.game = null;
            }
            this.player1 = null;
            this.player2 = null;
            this.game = null;
        }
        else {
            console.log("Player: ", playerId, " tried to leave game: ", this.gameId);
        }
        this.endGame();
    }

    startGame() {
        this.player1.socket.join(this.gameId);
        this.player2.socket.join(this.gameId);
        this.gameState = GameStates.InProgress;
        console.log("Starting Game: ", this.gameId);
        this.game = {
            players: [{
                location: [0, 7]
            },
            {
                location: [14, 7]
            }],
            ninjaStars: []
        }
        this.boardCastGameState();
    }

    /**
     * Handle Player Input
     */
    playerInput(playerId, move) {
        console.log("Player: ", playerId, " made move: ", move)
        if(this.gameState !== GameStates.InProgress) {
            return;
        }
        if(this.player1.id == playerId) {
            this.game.players[0].intent = move;
            this.game.players[0].ready = true;
        }
        else if(this.player2.id == playerId) {
            this.game.players[1].intent = move;
            this.game.players[1].ready = true;
        }
       else if(player === null) {
            console.log("Player: ", playerId, " attempted move in game: ", this.gameId);
            return;
        }
        if(this.game.players[0].ready == true && this.game.players[1].ready == true) {
            this.updateGame();
        }
    }


    
    /**
     * Game Logic
     */
    updateGame() {
        console.log("Update Game");
        if(this.gameState !== GameStates.InProgress) {
            return;
        }
        //Update Players
        this.game.players.forEach((player) => {
            let intent = player.intent;
            //Move Player (Check is square is empty)
            if(intent === "Up" || intent == "Down" || intent == "Right" || intent == "Left") {
                let offset = directions_offsets[intent];
                let [rowIndex, colIndex] = player.location.map((a, i) => a + offset[i]);
                if(stage1Map[rowIndex][colIndex].type == "Empty") {
                    player.location = [rowIndex, colIndex];
                }
            }
            //Player throws ninjastar
            if(intent === "StarUp" || intent == "StarDown" || intent == "StarRight" || intent == "StarLeft") {
                let offset = directions_offsets[intent.substring(4)];
                this.game.ninjaStars.push({
                    location: [player.location[0], player.location[1]],
                    direction: offset,
                    remove: false
                })
            }
            player.ready = false;
        })
        //Update NinjaStars
        this.game.ninjaStars.forEach((ninjaStar, idx) => {
            //Move ninjastar
            let [rowIndex, colIndex] = ninjaStar.location.map((a, i) => a + ninjaStar.direction[i]);
            if(stage1Map[rowIndex][colIndex].type == "Empty") {
                ninjaStar.location = [rowIndex, colIndex];
                //Check for collision with player
                this.game.players.forEach((player) => {
                    if(player.location[0] === ninjaStar.location[0] && player.location[1] === ninjaStar.location[1]){
                        this.endGame();
                    }
                })
            }
            else {
                ninjaStar.remove = true;
            }
        })
        //Remove ninjaStars
        this.game.ninjaStars = this.game.ninjaStars.filter((ninjaStar) => {
            return !ninjaStar.remove;
        })
        this.boardCastGameState();
    }

    boardCastGameState() {
        let gameState = {
            players: [
                this.game.players[0].location,
                this.game.players[1].location
            ],
            ninjaStars: this.game.ninjaStars.map((ninjaStar) => {
                return {
                    location: ninjaStar.location
                };
            })
        };
        this.io.to(this.gameId).emit("GameUpdate", gameState);
    }

    /**
     * End Game
     */
    endGame() {
        console.log("Ending Game: ", this.gameId);
        this.gameState = GameStates.Finished;
    }
}

module.exports = Game;