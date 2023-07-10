import { GameData } from "../game";
import { Entity, EntityState } from "./entity";
import { Direction } from "../directions";

export class NinjaStarState extends EntityState{
    location: number[];
    direction: number[];
    constructor(ninjaStar: NinjaStar) {
        super(ninjaStar.id, ninjaStar.entityType);
        this.location = JSON.parse(JSON.stringify(ninjaStar.location));
        this.direction = JSON.parse(JSON.stringify(ninjaStar.direction));
    }
}

export class NinjaStar extends Entity {
    direction: Direction;
    entityType = "NinjaStar";

    constructor(gameInfo: GameData, location: number[], direction: Direction) {
        super(gameInfo, location);
        this.location = location;
        this.direction = direction;
    }

    update(): void {
        let nextLoc = this.direction.nextLocation(this.location);
        if(this.game.gameMap.isWalkable(nextLoc)) {
            this.location = nextLoc;
        }
        else {
            this.remove = true;
        }
    }

    resolveCollision(): void {
        this.game.entityList.forEach((entity) => {
            if(this == entity) {
                return;
            }
            if(entity.entityType == this.entityType) {
                let ninjaStar = entity as NinjaStar;
                //Same square Collision
                if(this.location.toString() === ninjaStar.location.toString()) {
                    this.remove = true;
                    entity.remove = true;
                }
                //Pass by eachother collision
                let lastLoc = this.location.map((a, i) => a + this.direction.opposite().offset[i]);
                if(lastLoc.toString() === ninjaStar.location.toString() && this.direction.isEqual(ninjaStar.direction.opposite())) {
                    this.remove = true;
                    entity.remove = true;
                }
            }
        })
    }

    getState(): NinjaStarState {
        return new NinjaStarState(this);
    }
}