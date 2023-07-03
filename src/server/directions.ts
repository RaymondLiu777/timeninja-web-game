
export class Direction {
    static readonly Up = [-1, 0];
    static readonly Down = [1, 0];
    static readonly Left = [0, -1];
    static readonly Right = [0, 1];

    offset: number[];

    constructor(offset:number[]) {
        this.offset = offset;
    }

    static convertToDirection(direction: string): Direction {
        switch(direction){
            case "Up":
                return new Direction(Direction.Up);
            case "Down":
                return new Direction(Direction.Down);
            case "Left":
                return new Direction(Direction.Left);
            case "Right":
                return new Direction(Direction.Right);
        }
        throw new Error("Undefined Direction");
    }

    isEqual(direction: Direction): Boolean {
        return this.offset[0] === direction.offset[0] && this.offset[1] === direction.offset[1]; 
    }

    opposite(): Direction {
        return new Direction([this.offset[0] * -1, this.offset[1] * -1]);
    }

    nextLocation(location: number[]): number[] {
        return location.map((a, i) => a + this.offset[i])
    }
}