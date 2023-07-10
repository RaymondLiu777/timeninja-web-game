import { Entity, EntityState } from "./entities/entity";
import { Ninja, NinjaState } from "./entities/ninja";
import { NinjaStarState } from "./entities/ninjaStar";

interface GameState {
    states: EntityState[];
}

export enum TimelineEvent {
    RegularStep,
    RestartTimeloop,
    NoMoreTimeloops
}

export class TimeLine {
    readonly maxTimeStep: number;
    readonly maxTimeLoop: number;
    currentTimestep: number;
    currentTimeloop: number;
    history: GameState[][];

    constructor(maxTimeStep: number, maxTimeLoop: number) {
        this.maxTimeStep = maxTimeStep;
        this.maxTimeLoop = maxTimeLoop;
        this.currentTimestep = 0;
        this.currentTimeloop = 0;
        this.history = [[]];
    }

    advanceTimestep(): TimelineEvent {
        //Update time and deal with time loops
        this.currentTimestep += 1;
        if(this.currentTimestep == this.maxTimeStep) {
            this.currentTimestep = 0;
            this.currentTimeloop += 1;
            this.history.push([]);
            if(this.currentTimeloop === this.maxTimeLoop) {
                return TimelineEvent.NoMoreTimeloops;
            }
            else {
                return TimelineEvent.RestartTimeloop;
            }
        }
        return TimelineEvent.RegularStep;
    }

    storeState(entityList: Entity[]) {
        let gameState: GameState = {
            states: entityList.map((entity) => {
                return entity.getState()
            })
        }
        this.history[this.currentTimeloop].push(gameState);
        if(this.currentTimeloop != this.history.length - 1 || this.currentTimestep != this.history[this.currentTimeloop].length - 1) {
            console.log(JSON.stringify(this.history));
            console.log(this.currentTimeloop, this.currentTimestep);
            console.log(this.history.length, this.history[this.currentTimeloop].length);
            throw new Error("Timeline Error");
        }
    }

    getEntityTimeline(entityId: number): EntityState[] {
        let timeline: EntityState[] = [];
        this.history.forEach((round) => {
            round.forEach((gameState) => {
                gameState.states.filter((entityState) => {
                    return entityState.id === entityId;
                })
                .forEach((entityState) => {
                    timeline.push(entityState);
                })
            })
        })
        return timeline;
    }

    refactorTimeline(playerId: string) {
        return this.history.map((row, rowIdx) =>{
            return row.map((timeslice, colIdx) => {
                let player = timeslice.states.filter((entityState) => {
                    return (entityState.entityType === "PresentNinja") && (entityState as NinjaState).controller === playerId;
                }).map((entityState) => {
                    return (entityState as NinjaState).location;
                });
                let pastPlayer = timeslice.states.filter((entityState) => {
                    return (entityState.entityType === "PastNinja") && (entityState as NinjaState).controller === playerId;
                }).map((entityState) => {
                    return (entityState as NinjaState).location;
                });
                let enemy = timeslice.states.filter((entityState) => {
                    return (entityState.entityType === "PresentNinja") && (entityState as NinjaState).controller !== playerId;
                }).map((entityState) => {
                    return (entityState as NinjaState).location;
                });
                let pastEnemy = timeslice.states.filter((entityState) => {
                    return (entityState.entityType === "PastNinja") && (entityState as NinjaState).controller !== playerId;
                }).map((entityState) => {
                    return (entityState as NinjaState).location;
                });
                let ninjaStars = timeslice.states.filter((entityState) => {
                    return (entityState.entityType === "NinjaStar");
                });
                return {
                    timestep: colIdx,
                    timeloop: rowIdx,
                    player: player[0],
                    pastSelf: pastPlayer,
                    enemy: enemy[0],
                    enemies: pastEnemy,
                    ninjaStars: ninjaStars,
                    vision: [],
                }
            })
        })
    }
}


