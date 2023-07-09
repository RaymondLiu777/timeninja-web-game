import fs from 'fs';
import { GameMap } from "./gameMap";
import path from 'path';
import { Server } from 'socket.io';
import { Player } from './server';
import { Entity, EntityState } from './entities/entity';
import { Ninja, NinjaState } from './entities/ninja';
import { GameStatus } from './gameStatus';
import { PresentNinja } from './entities/presentNinja';
import { TimeLine, TimelineEvent } from './timeline';
import { PastNinja } from './entities/pastNinja';

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

export interface GameData {
    gameMap: GameMap;
    entityList: Entity[];
    ninjas: PresentNinja[];
    timeline: TimeLine;
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
            timeline: new TimeLine(MAX_TIME_STEP, MAX_TIME_LOOP),
            gameStatus: GameStatus.Unstarted
        };
        this.initializeGameState();
        this.startGame();
    }

    initializeGameState() {
        // Create past ninjas
        let newEntityList: Entity[] = [];
        this.game.entityList.filter((entity) => {
            return entity.entityType === "PastNinja" || entity.entityType === "PresentNinja";
        }).forEach((ninja) => {
            newEntityList.push(new PastNinja(this.game, this.game.timeline.getEntityTimeline(ninja.id) as NinjaState[]))
        })
        this.game.entityList = newEntityList;
        this.game.ninjas = [];
        new PresentNinja(this.game, [1, 5], this.players[0].id );
        new PresentNinja(this.game, [9, 5], this.players[1].id );
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
        this.addStateToTimeLine();
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
        // Take next timeline step + deal with any loops
        let event = this.game.timeline.advanceTimestep();
        if(event === TimelineEvent.RestartTimeloop) {
            this.initializeGameState();
        }
        if(event === TimelineEvent.NoMoreTimeloops) {
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

        this.checkForGameOver();

        this.boardCastGameState();

        this.addStateToTimeLine();

        if(GameStatus.isDone(this.game.gameStatus)) {
            this.endGame();
        }
    }

    addStateToTimeLine() {
        this.game.timeline.storeState(this.game.entityList);
    }

    boardCastGameState() {
        for(let i = 0; i < 2; i++) {
            let player = this.players[i];
            let playerLocation = this.game.ninjas[i].location;
            let pastLocations = this.game.entityList.filter((entity) => {
                    return entity.entityType === "PastNinja" && (entity as Ninja).controller === player.id;
                }).map((ninja)=>{
                    return ninja.location;
                });
            let otherPlayers = this.game.entityList.filter((entity) => {
                return (entity.entityType === "PastNinja" || entity.entityType === "PresentNinja") && (entity as Ninja).controller != player.id;
            }) as Ninja[];
            let visionTiles = this.game.gameMap.getVisionFromMultiple([playerLocation, ...pastLocations]);
            let playerGameState = {
                timestep: this.game.timeline.currentTimestep,
                timeloop: this.game.timeline.currentTimeloop,
                player: playerLocation,
                pastSelf: pastLocations,
                enemies: otherPlayers.filter((ninja: Ninja)=>{return visionTiles.has(JSON.stringify(ninja.location))})
                    .map((ninja: Ninja) => {return ninja.location}),
                ninjaStars: this.game.entityList.filter((entity: Entity) => {
                    return entity.entityType === "NinjaStar" && visionTiles.has(JSON.stringify(entity.location));
                }).map((ninjaStar: Entity) => {
                    return ninjaStar.getState();
                }),
                vision: [...visionTiles],
            };
            player.socket.emit("GameUpdate", playerGameState)
        }
    }

    checkForGameOver() {
        let dead = [false, false];
        this.game.entityList.filter((entity) => {
            return entity.entityType === "PresentNinja" || entity.entityType === "PastNinja";
        }).forEach((entity)=> {
            let ninja = entity as Ninja;
            if(ninja.dead) {
                this.players.forEach((player, idx) => {
                    if(ninja.controller === player.id) {
                        dead[idx] = true;
                    }
                })
                
            }
        })
        if(dead[0] && dead[1]) {
            this.game.gameStatus = GameStatus.Tie;
        }
        else if(dead[0]) {
            this.game.gameStatus = GameStatus.Player2Win;
        }
        else if(dead[1]) {
            this.game.gameStatus = GameStatus.Player1Win;
        }
    }

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