const fs = require('fs');
const Map = require("./map")

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

const fileContent = fs.readFileSync("teststage.txt", 'utf-8');
const testMap = new Map(fileContent);

class Game {

    constructor(io, gameId, bot) {
        this.io = io;
        this.gameId = gameId;
        this.player1 = null;
        this.player2 = null;
        this.gameState = GameStates.Unstarted;
        this.game = null;
        this.botGame = bot;
        if(bot) {
            this.player2 = {id: bot};
        }
    }

    /**
     * Initialize Game Object
     */
    static createGame(io, games, gameId, bot) {
        if(gameId in games) {
            console.log("Game ", gameId, " already created");
            return false;
        }
        games[gameId] = new Game(io, gameId, bot);
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
            if(this.botGame) {
                this.startGame();
            }
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
        if(!this.botGame) {
            this.player2.socket.join(this.gameId);
        }
        this.gameState = GameStates.InProgress;
        console.log("Starting Game: ", this.gameId);
        this.game = {
            players: [{
                location: [1, 5]
            },
            {
                location: [9, 5]
            }],
            ninjaStars: []
        }
        //Send game start information
        this.player1.socket.emit("GameStart", {
            id: "teststage",
            map: testMap.map,
            player: 0
        });
        if(!this.botGame) {
            this.player2.socket.emit("GameStart", {
                id: "teststage",
                map: testMap.map,
                player: 1
            });
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
        if(this.botGame) {
            this.AiMove();
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
                let nextLoc = player.location.map((a, i) => a + offset[i]);
                if(testMap.isWalkable(nextLoc)) {
                    player.location = nextLoc;
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
            let nextLoc = ninjaStar.location.map((a, i) => a + ninjaStar.direction[i]);
            if(testMap.isWalkable(nextLoc)) {
                ninjaStar.location = nextLoc;
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

    /**
     * Pick a move for the bot
     */
    AiMove() {
        this.game.players[1].intent = "Wait";
        this.game.players[1].ready = true;
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