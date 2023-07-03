import { Entity } from "./entity";
import { Direction } from "../directions";
import { GameData } from "../game";
import { NinjaStar } from "./ninjaStar";


export interface PlayerState {
    id: number;
    location: number[];
    intent: string;
}

export class Ninja extends Entity {
    entityType = "Player";
    controller:string;
    intent:string;
    ready:Boolean;

    constructor(game: GameData, location: number[], controller: string) {
        super(game, location);
        this.controller = controller;
        this.intent = "";
        this.ready = false;
        this.game.ninjas.push(this);
    }

    update(): void {
        if(this.intent === "Stop") {
            return;
        }
        //Move Player (Check is square is empty)
        if(this.intent === "Up" || this.intent === "Down" || this.intent === "Right" || this.intent === "Left") {
            let direction = Direction.convertToDirection(this.intent);
            let nextLoc = this.location.map((a, i) => a + direction.offset[i]);
            if(this.game.gameMap.isWalkable(nextLoc)) {
                this.location = nextLoc;
            }
        }
        //Player throws ninjastar
        if(this.intent === "StarUp" || this.intent === "StarDown" || this.intent === "StarRight" || this.intent === "StarLeft") {
            let direction = Direction.convertToDirection(this.intent.substring(4));
            new NinjaStar(this.game, direction.nextLocation(this.location), direction);
        }
        this.ready = false;
    }
    
    resolveCollision(): void {
        this.game.entityList.forEach((entity) => {
            if(this == entity) {
                return;
            }
        });
    }
    
    getState(): PlayerState {
        return JSON.parse(JSON.stringify({
            id: this.id,
            location: this.location,
            intent: this.intent,
        }))
    }

    setIntent(intent: string) {
        this.intent = intent;
        this.ready = true;
    }

}