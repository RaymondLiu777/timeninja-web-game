import { GameData } from "../game";
import { Ninja, NinjaState } from "./ninja";


export class PastNinja extends Ninja {
    entityType: string = "PastNinja"; 
    timeline: NinjaState[];
    timestep: number;
    constructor(game:GameData, ninjaTimeline: NinjaState[]){
        super(game, ninjaTimeline[0].location, ninjaTimeline[0].controller);
        this.timeline = ninjaTimeline;
        this.timestep = 0;
    }

    update(): void {
        super.setIntent(this.timeline[this.timestep].intent);
        this.timestep += 1;
        super.update();
    }
}