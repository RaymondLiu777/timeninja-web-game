import fs from 'fs';
import { GameMap } from "./gameMap";
import path from 'path';
import { Server } from 'socket.io';
import { Player } from './server';
import { Entity } from './entities/entity';
import { NinjaStar, NinjaStarState } from './entities/ninjaStar';
import { Ninja } from './entities/ninja';
import { GameStatus } from './gameStatus';

const mapFilepath = path.join(__dirname, 'teststage.txt');
const fileContent = fs.readFileSync(mapFilepath, 'utf-8');
const testMap = new GameMap(fileContent);

const MAX_TIME_STEP = 20;
const MAX_TIME_LOOP = 3;

interface PlayerState {
    location: number[];
    ready: boolean;
    intent: string;
}

interface GameState {
    players: PlayerState[];
    ninjaStars: NinjaStarState[];
}

export interface GameData {
    gameMap: GameMap;
    entityList: Entity[];
    ninjas: Ninja[];
    timestep: number;
    timeloop: number;
    timeline: GameState[][];
    gameStatus: GameStatus;
}

export class Game {
    io: Server;
    gameId: string;
    players: Player[];
    game: GameData;

    constructor(io: Server, gameId: string, player1: Player, player2: Player) {
        this.io = io;
        this.gameId = gameId;
        this.players = [player1, player2];
        this.game = {
            gameMap:testMap,
            entityList: [],
            ninjas: [],
            timestep: 0,
            timeloop: 0,
            timeline: [[],[],[]],
            gameStatus: GameStatus.Unstarted
        };
        this.initializeGameState();
        this.startGame();
    }

    initializeGameState() {
        this.game.entityList = [];
        this.game.ninjas = [];
        new Ninja(this.game, [1, 5], this.players[0].id );
        new Ninja(this.game, [9, 5], this.players[1].id );
    }

    startGame(): void {
        this.players[0].socket.join(this.gameId);
        this.players[1].socket.join(this.gameId);

        this.game.gameStatus = GameStatus.InProgress;
        console.log("Starting Game: ", this.gameId);
        //Send game start information 
        for(let i = 0; i < 2; i++) {
            this.players[i].socket.emit("GameStart", {
                id: "teststage",
                map: this.game.gameMap.map,
                player: i,
                maxTimestep: MAX_TIME_STEP,
                maxTimeloop: MAX_TIME_LOOP,
            });
        }
        // this.game.timeline[this.game.timeloop].push(JSON.parse(JSON.stringify(this.game.gameState)));
        this.boardCastGameState();
    }

    /**
     * Handle Player Input
     */
    playerInput(playerId: string, move: string) {
        // console.log("Player: ", playerId, " made move: ", move)
        if(this.game.gameStatus !== GameStatus.InProgress) {
            return;
        }
        this.players.forEach((player, idx) => {
            if(player.id == playerId) {
                this.game.ninjas[idx].setIntent(move);
            }
        })
        if(this.game.ninjas[0].ready == true && this.game.ninjas[1].ready == true) {
            this.updateGame();
        }
    }


    
    /**
     * Game Logic
     */
    updateGame() {
        if(this.game.gameStatus !== GameStatus.InProgress) {
            return;
        }
        //Update time and deal with time loops
        this.game.timestep += 1;
        if(this.game.timestep == MAX_TIME_STEP) {
            this.game.timestep = 0;
            this.game.timeloop += 1;
            this.initializeGameState();
        }
        if(this.game.timeloop === MAX_TIME_LOOP) {
            this.game.gameStatus = GameStatus.Tie;
            this.endGame();
            return;
        }
        // Update entities
        this.game.entityList.forEach((entity) => {
            entity.update();
        })
        // Remove entities
        this.game.entityList = this.game.entityList.filter((entity) => {
            return !(entity.remove === true);
        })
        // Check for collisions
        this.game.entityList.forEach((entity) => {
            entity.resolveCollision();
        })
        // Remove entities
        this.game.entityList = this.game.entityList.filter((entity) => {
            return !(entity.remove === true);
        })
       
        // let currentGameState = this.getCurrentGameState();
        // //Check for collision with player
        // let winner = [false, false]
        // currentGameState.ninjaStars.forEach((ninjaStar: NinjaStarState) => {
        //     [currentGameState.players[0].location, ...currentGameState.pastPlayers[0]].forEach((player) => {
        //         if(ninjaStar.location[0] === player[0] && ninjaStar.location[1] === player[1]) {
        //             winner[1] = true;
        //         }
        //     });
        //     [currentGameState.players[1].location, ...currentGameState.pastPlayers[1]].forEach((player) => {
        //         if(ninjaStar.location[0] === player[0] && ninjaStar.location[1] === player[1]) {
        //             winner[0] = true;
        //         }
        //     });
        // });

        //Make a copy of game state
        // this.game.timeline[this.game.timeloop].push(JSON.parse(JSON.stringify(this.game.gameState)));

        this.boardCastGameState();
        if(GameStatus.isDone(this.game.gameStatus)) {
            this.endGame();
        }
    }

    boardCastGameState() {
        for(let i = 0; i < 2; i++) {
            let playerLocation = this.game.ninjas[i].location;
            let otherPlayers = this.game.ninjas.filter((_ninja, index) => {
                return index != i;
            })
            let visionTiles = this.game.gameMap.getVisionFromMultiple([playerLocation/*, ...pastLocations1*/]);
            let playerGameState = {
                timestep: this.game.timestep,
                timeloop: this.game.timeloop,
                player: playerLocation,
                pastSelf: [],
                enemies: otherPlayers.filter((ninja: Ninja)=>{return visionTiles.has(JSON.stringify(ninja.location))})
                    .map((ninja: Ninja) => {return ninja.location}),
                ninjaStars: this.game.entityList.filter((entity: Entity) => {
                    return entity.entityType === "NinjaStar" && visionTiles.has(JSON.stringify(entity.location));
                }).map((ninjaStar: Entity) => {
                    return ninjaStar.getState();
                }),
                vision: [...visionTiles],
            };
            console.log(playerGameState);
            this.players[i].socket.emit("GameUpdate", playerGameState)
        }
    }

    // getCurrentGameState() {
    //     let initialState = JSON.parse(JSON.stringify(this.game.gameState));
    //     initialState.pastPlayers= [[], []];
    //     for(let i = 0; i < this.game.timeloop; i++) {
    //         initialState.pastPlayers[0].push(this.game.timeline[i][this.game.timestep].players[0].location);
    //         initialState.pastPlayers[1].push(this.game.timeline[i][this.game.timestep].players[1].location);
    //         initialState.ninjaStars.push(...this.game.timeline[i][this.game.timestep].ninjaStars)
    //     }
    //     return initialState;
    // }

    /**
     * End Game
     * result 0=player1 wins, 1=player2 wins, -1=tie
     */
    endGame() {
        console.log("Ending Game: ", this.gameId, "result: ", this.game.gameStatus);
        //Send full timeline
        this.io.to(this.gameId).emit("GameEnd", {
            winner: this.game.gameStatus,
            // fullTimeline: this.refactorTimeline(),
        })
        this.io.in(this.gameId).socketsLeave(this.gameId);
    }

    // refactorTimeline() {
    //     return this.game.timeline.map((row, rowIdx) =>{
    //         return row.map((timeslice, colIdx) => {
    //             let pastPlayer = [];
    //             let pastEnemy = [];
    //             let ninjaStars = [];
    //             for(let i = 0; i < rowIdx; i++) {
    //                 pastPlayer.push(this.game.timeline[i][colIdx].players[0].location);
    //                 pastEnemy.push(this.game.timeline[i][colIdx].players[1].location);
    //                 ninjaStars.push(...this.game.timeline[i][colIdx].ninjaStars)
    //             }
    //             return {
    //                 timestep: colIdx,
    //                 timeloop: rowIdx,
    //                 player: timeslice.players[0].location,
    //                 pastSelf: pastPlayer,
    //                 enemy: timeslice.players[1].location,
    //                 enemies: pastEnemy,
    //                 ninjaStars: [...timeslice.ninjaStars, ...ninjaStars],
    //                 vision: [],
    //             }
    //         })
    //     })
    // }
}