import { GameData } from "../game";
import { Ninja } from "./ninja";


export class PresentNinja extends Ninja {
    entityType = "PresentNinja";
    constructor(game: GameData, location: number[], controller: string){
        super(game, location, controller);
        this.game.ninjas.push(this);
    }
}