const fs = require('fs');
const Map = require("./map")

const GameStatus = {
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

const MAX_TIME_STEP = 20;
const MAX_TIME_LOOP = 3;

class Game {

    constructor(io, gameId, bot) {
        this.io = io;
        this.gameId = gameId;
        this.player1 = null;
        this.player2 = null;
        this.gameStatus = GameStatus.Unstarted;
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

    initialGameState() {
        return JSON.parse(JSON.stringify({
            players: [{
                location: [1, 5]
            },
            {
                location: [9, 5]
            }],
            ninjaStars: [],
        }));
    }

    startGame() {
        this.player1.socket.join(this.gameId);
        if(!this.botGame) {
            this.player2.socket.join(this.gameId);
        }
        this.gameStatus = GameStatus.InProgress;
        console.log("Starting Game: ", this.gameId);
        this.game = {
            gameState: this.initialGameState(),
            timestep: 0,
            timeloop: 0,
            timeline: [[],[],[]],
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
        if(this.gameStatus !== GameStatus.InProgress) {
            return;
        }
        if(this.player1.id == playerId) {
            this.game.gameState.players[0].intent = move;
            this.game.gameState.players[0].ready = true;
        }
        else if(this.player2.id == playerId) {
            this.game.gameState.players[1].intent = move;
            this.game.gameState.players[1].ready = true;
        }
       else if(player === null) {
            console.log("Player: ", playerId, " attempted move in game: ", this.gameId);
            return;
        }
        if(this.botGame) {
            this.AiMove();
        }
        if(this.game.gameState.players[0].ready == true && this.game.gameState.players[1].ready == true) {
            this.updateGame();
        }
    }


    
    /**
     * Game Logic
     */
    updateGame() {
        if(this.gameStatus !== GameStatus.InProgress) {
            return;
        }
        //Make a copy of game state
        this.game.timeline[this.game.timeloop].push(JSON.parse(JSON.stringify(this.game.gameState)));
        //Update time and deal with time loops
        this.game.timestep += 1;
        if(this.game.timestep == MAX_TIME_STEP) {
            this.game.timestep = 0;
            this.game.timeloop += 1;
            this.game.gameState = this.initialGameState();
        }
        if(this.game.timeloop === MAX_TIME_LOOP) {
            this.endGame();
            return;
        }

        //Update Players
        this.game.gameState.players.forEach((player) => {
            let intent = player.intent;
            if(intent === "Stop") {
                return;
            }
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
                this.game.gameState.ninjaStars.push({
                    location: [player.location[0], player.location[1]],
                    direction: offset,
                    remove: false
                })
            }
            player.ready = false;
        })
        //Update NinjaStars
        this.game.gameState.ninjaStars.forEach((ninjaStar, idx) => {
            //Move ninjastar
            let nextLoc = ninjaStar.location.map((a, i) => a + ninjaStar.direction[i]);
            if(testMap.isWalkable(nextLoc)) {
                ninjaStar.location = nextLoc;
            }
            else {
                ninjaStar.remove = true;
            }
        })
        //Remove ninjaStars
        this.game.gameState.ninjaStars = this.game.gameState.ninjaStars.filter((ninjaStar) => {
            return !ninjaStar.remove;
        })
        let currentGameState = this.getCurrentGameState();
        //Check for collision with player
        currentGameState.ninjaStars.forEach((ninjaStar) => {
            [currentGameState.players[0].location, ...currentGameState.pastPlayers[0]].forEach((player) => {
                if(ninjaStar.location[0] === player[0] && ninjaStar.location[1] === player[1]) {
                    this.endGame(1);
                }
            });
            [currentGameState.players[1].location, ...currentGameState.pastPlayers[1]].forEach((player) => {
                if(ninjaStar.location[0] === player[0] && ninjaStar.location[1] === player[1]) {
                    this.endGame(0);
                }
            });
        });
        this.boardCastGameState();
    }

    /**
     * Pick a move for the bot
     */
    AiMove() {
        this.game.gameState.players[1].intent = "Wait";
        this.game.gameState.players[1].ready = true;
    }

    boardCastGameState() {
        let currentGameState = this.getCurrentGameState();
        let player1Location = currentGameState.players[0].location;
        let player2Location = currentGameState.players[1].location;
        let pastLocations1 = currentGameState.pastPlayers[0];
        let pastLocations2 = currentGameState.pastPlayers[1];

        //Player 1
        let visionTiles1 = testMap.getVisionFromMultiple([player1Location, ...pastLocations1]);
        let player1GameState = {
            timestep: this.game.timestep,
            timeloop: this.game.timeloop,
            player: player1Location,
            pastSelf: pastLocations1,
            enemies: [],
            ninjaStars: currentGameState.ninjaStars.filter((ninjaStar) => {
                return visionTiles1.has(JSON.stringify(ninjaStar.location));
            }),
            vision: [...visionTiles1],
        };
        [player2Location, ...pastLocations2].forEach((playerLocation) => {
            if(visionTiles1.has(JSON.stringify(playerLocation))) {
                player1GameState.enemies.push(playerLocation)
            }
        })
        this.player1.socket.emit("GameUpdate", player1GameState)
        //Player 2
        let visionTiles2 = testMap.getVisionFromMultiple([player2Location, ...pastLocations2]);
        let player2GameState = {
            timestep: this.game.timestep,
            timeloop: this.game.timeloop,
            player: player2Location,
            pastSelf: pastLocations2,
            enemies: [],
            ninjaStars: currentGameState.ninjaStars.filter((ninjaStar) => {
                return visionTiles2.has(JSON.stringify(ninjaStar.location));
            })
            .map((ninjaStar) => {
                return {
                    location: ninjaStar.location
                };
            }),
            vision: [...visionTiles2],
        };
        [player1Location, ...pastLocations1].forEach((playerLocation) => {
            if(visionTiles2.has(JSON.stringify(playerLocation))) {
                player2GameState.enemies.push(playerLocation)
            }
        })
        if(!this.botGame) {
            this.player2.socket.emit("GameUpdate", player2GameState)
        }
    }

    getCurrentGameState() {
        let initialState = JSON.parse(JSON.stringify(this.game.gameState));
        initialState.pastPlayers= [[], []];
        for(let i = 0; i < this.game.timeloop; i++) {
            initialState.pastPlayers[0].push(this.game.timeline[i][this.game.timestep].players[0].location);
            initialState.pastPlayers[1].push(this.game.timeline[i][this.game.timestep].players[1].location);
            initialState.ninjaStars.push(...this.game.timeline[i][this.game.timestep].ninjaStars)
        }
        return initialState;
    }

    /**
     * End Game
     * result 0=player1 wins, 1=player2 wins, -1=tie
     */
    endGame(result) {
        console.log("Ending Game: ", this.gameId);
        if(result === 0) {
            console.log("Player1 Wins");
        }
        if(result === 1) {
            console.log("Player2 Wins");
        }
        if(result === -1) {
            console.log("Tie");
        }
        this.gameStatus = GameStatus.Finished;
    }
}

module.exports = Game;