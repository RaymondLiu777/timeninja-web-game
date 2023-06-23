import fs from 'fs';
import { GameMap } from "./gameMap";
import path from 'path';
import { Server } from 'socket.io';
import { Player } from './server';

const GameStatus = {
    Unstarted: "Unstarted",
	InProgress: "InProgress",
	Finished: "Finished"
}

const directions_offsets: {[key: string]: number[]} = {
    Up: [-1, 0],
    Down: [1, 0],
    Left: [0, -1],
    Right: [0, 1],
};

const mapFilepath = path.join(__dirname, 'teststage.txt');
const fileContent = fs.readFileSync(mapFilepath, 'utf-8');
const testMap = new GameMap(fileContent);

const MAX_TIME_STEP = 20;
const MAX_TIME_LOOP = 3;

interface NinjaStarState {
    location: number[];
    direction: number[];
    remove: boolean;
}

interface PlayerState {
    location: number[];
    ready: boolean;
    intent: string;
}

interface GameState {
    players: PlayerState[];
    ninjaStars: NinjaStarState[];
}

interface GameInfo {
    gameState: GameState;
    timestep: number;
    timeloop: number;
    timeline: GameState[][];
}

export class Game {
    io: Server;
    gameId: string;
    player1: Player;
    player2: Player;
    gameStatus: string;
    game: GameInfo;

    constructor(io: Server, gameId: string, player1: Player, player2: Player) {
        this.io = io;
        this.gameId = gameId;
        this.player1 = player1;
        this.player2 = player2;
        this.gameStatus = GameStatus.Unstarted;
        this.game = {
            gameState: this.initialGameState(),
            timestep: 0,
            timeloop: 0,
            timeline: [[],[],[]],
        };
        this.startGame();
    }

    initialGameState(): GameState {
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

    startGame(): void {
        this.player1.socket.join(this.gameId);
        this.player2.socket.join(this.gameId);

        this.gameStatus = GameStatus.InProgress;
        console.log("Starting Game: ", this.gameId);
        //Send game start information
        this.player1.socket.emit("GameStart", {
            id: "teststage",
            map: testMap.map,
            player: 0,
            maxTimestep: MAX_TIME_STEP,
            maxTimeloop: MAX_TIME_LOOP,
        });
        this.player2.socket.emit("GameStart", {
            id: "teststage",
            map: testMap.map,
            player: 1,
            maxTimestep: MAX_TIME_STEP,
            maxTimeloop: MAX_TIME_LOOP,
        });
        this.boardCastGameState();
    }

    /**
     * Handle Player Input
     */
    playerInput(playerId: string, move: string) {
        // console.log("Player: ", playerId, " made move: ", move)
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
        else {
            console.log("Player: ", playerId, " attempted move in game: ", this.gameId);
            return;
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
            this.endGame(-1);
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
        let winner = [false, false]
        currentGameState.ninjaStars.forEach((ninjaStar: NinjaStarState) => {
            [currentGameState.players[0].location, ...currentGameState.pastPlayers[0]].forEach((player) => {
                if(ninjaStar.location[0] === player[0] && ninjaStar.location[1] === player[1]) {
                    winner[1] = true;
                }
            });
            [currentGameState.players[1].location, ...currentGameState.pastPlayers[1]].forEach((player) => {
                if(ninjaStar.location[0] === player[0] && ninjaStar.location[1] === player[1]) {
                    winner[0] = true;
                }
            });
        });
        this.boardCastGameState();
        if(winner[0] && winner[1]) {
            this.endGame(-1);
        }
        else if(winner[0]) {
            this.endGame(0);
        }
        else if(winner[1]) {
            this.endGame(1);
        }
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
            enemies: <number[][]>[],
            ninjaStars: currentGameState.ninjaStars.filter((ninjaStar: NinjaStarState) => {
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
            enemies: <number[][]>[],
            ninjaStars: currentGameState.ninjaStars.filter((ninjaStar: NinjaStarState) => {
                return visionTiles2.has(JSON.stringify(ninjaStar.location));
            }),
            vision: [...visionTiles2],
        };
        [player1Location, ...pastLocations1].forEach((playerLocation) => {
            if(visionTiles2.has(JSON.stringify(playerLocation))) {
                player2GameState.enemies.push(playerLocation)
            }
        })
        this.player2.socket.emit("GameUpdate", player2GameState)

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
    endGame(result: number) {
        if(this.gameStatus === GameStatus.Finished) {
            console.log("Game already ended");
            return;
        }
        console.log("Ending Game: ", this.gameId, "result: ", result);
        this.gameStatus = GameStatus.Finished;
        // Add final state of board
        this.game.timeline[this.game.timeloop].push(JSON.parse(JSON.stringify(this.game.gameState)));
        //Send full timeline
        this.io.to(this.gameId).emit("GameEnd", {
            winner: result,
            fullTimeline: this.refactorTimeline(),
        })
        this.io.in(this.gameId).socketsLeave(this.gameId);
    }

    refactorTimeline() {
        return this.game.timeline.map((row, rowIdx) =>{
            return row.map((timeslice, colIdx) => {
                let pastPlayer = [];
                let pastEnemy = [];
                let ninjaStars = [];
                for(let i = 0; i < rowIdx; i++) {
                    pastPlayer.push(this.game.timeline[i][colIdx].players[0].location);
                    pastEnemy.push(this.game.timeline[i][colIdx].players[1].location);
                    ninjaStars.push(...this.game.timeline[i][colIdx].ninjaStars)
                }
                return {
                    timestep: colIdx,
                    timeloop: rowIdx,
                    player: timeslice.players[0].location,
                    pastSelf: pastPlayer,
                    enemy: timeslice.players[1].location,
                    enemies: pastEnemy,
                    ninjaStars: [...timeslice.ninjaStars, ...ninjaStars],
                    vision: [],
                }
            })
        })
    }
}