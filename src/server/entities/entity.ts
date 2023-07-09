import { GameData } from "../game";

export abstract class Entity {

    game: GameData;
    location: number[];
    remove?: boolean;
    id: number;
    private static idCount = 0;

    abstract readonly entityType: string;
    abstract update(): void;
    abstract resolveCollision(): void;
    abstract getState(): any;

    constructor(game: GameData, location: number[]) {
        game.entityList.push(this);
        this.game = game;
        this.location = location;
        this.id = Entity.idCount;
        Entity.idCount += 1;
    }
}

export abstract class EntityState {
    id: number;
    entityType: string;
    constructor(id: number, entityType: string) {
        this.id = id;
        this.entityType = entityType;
    }
}