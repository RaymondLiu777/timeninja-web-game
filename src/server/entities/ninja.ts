import { Entity, EntityState } from "./entity";
import { Direction } from "../directions";
import { GameData } from "../game";
import { NinjaStar } from "./ninjaStar";


export class NinjaState extends EntityState{
    location: number[];
    intent: string;
    controller: string;
    constructor(ninja: Ninja) {
        super(ninja.id, ninja.entityType);
        this.location = JSON.parse(JSON.stringify(ninja.location));
        this.intent = ninja.intent;
        this.controller = ninja.controller;
    }
}

export class Ninja extends Entity {
    entityType = "Ninja";
    controller:string;
    intent:string;
    ready:Boolean;
    dead:Boolean;

    constructor(game: GameData, location: number[], controller: string) {
        super(game, location);
        this.controller = controller;
        this.intent = "";
        this.ready = false;
        this.dead = false;
    }

    update(): void {
        if(this.intent === "Stop") {
            return;
        }
        //Move Player (Check is square is empty)
        if(Direction.isDirection(this.intent)) {
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
            if(entity.entityType == "NinjaStar") {
                let ninjaStar = entity as NinjaStar;
                //Same square Collision
                if(this.location.toString() === ninjaStar.location.toString()) {
                    this.dead = true;
                    entity.remove = true;
                }
                //Pass by eachother collision
                if(Direction.isDirection(this.intent)) {
                    let direction = Direction.convertToDirection(this.intent);
                    let lastLoc = this.location.map((a, i) => a + direction.opposite().offset[i]);
                    if(lastLoc.toString() === ninjaStar.location.toString() && direction.isEqual(ninjaStar.direction.opposite())) {
                        this.dead = true;
                        entity.remove = true;
                    }
                }
                
            }
        });
    }
    
    getState(): NinjaState {
        return new NinjaState(this);
    }

    setIntent(intent: string) {
        this.intent = intent;
        this.ready = true;
    }

}