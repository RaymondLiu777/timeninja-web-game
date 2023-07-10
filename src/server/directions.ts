
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
        switch(direction.toLowerCase()){
            case "up":
                return new Direction(Direction.Up);
            case "down":
                return new Direction(Direction.Down);
            case "left":
                return new Direction(Direction.Left);
            case "right":
                return new Direction(Direction.Right);
        }
        throw new Error("Undefined Direction");
    }

    static isDirection(direction: string): boolean {
        let lowerDir = direction.toLowerCase();
        return lowerDir === "up" || lowerDir === "down" || lowerDir === "right" || lowerDir === "left";
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