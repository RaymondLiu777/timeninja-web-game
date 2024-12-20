
interface MapItem {
    name: string,
    walkable: boolean,
    vision: boolean,
}

export class GameMap {
    map: MapItem[][];

    constructor(mapString: string) {
        const lines = mapString.trim().split('\n');
        this.map = lines.map(line => line.trim().split(' ').map(Number).map((num) => {
            if(num === 0) {
                return {
                    name: "Hole",
                    walkable: false,
                    vision: false
                }
            }
            else if(num === 1) {
                return {
                    name: "Path",
                    walkable: true,
                    vision: true
                }
            }
            else if(num === 2) {
                return {
                    name: "Block",
                    walkable: false,
                    vision: false
                }
            }
            else {
                console.log("Unable to read map: ", num);
                return {
                    name: "Block",
                    walkable: false,
                    vision: false
                }
            }
        }));
    }

    isOutOfBounds(coord: number[]) : boolean {
        return coord[0] < 0 || coord[0] >= this.map.length || coord[1] < 0 || coord[1] >= this.map[coord[0]].length
    }

    isWalkable(coord: number[]) : boolean {
        if(this.isOutOfBounds(coord)){
            return false;
        }
        return this.map[coord[0]][coord[1]].walkable;
    }

    getVisionFrom(start: number[]): Set<string> {
        let visibleTileSet = new Set<string>();
        let queue = [start];
        const offsets = [[-1, 0], [1, 0], [0, -1], [0, 1]];
        let i = 0;
        while(i < queue.length) {
            let tile = queue[i];
            i++;
            //Make sure it is in the map boundaries
            if(this.isOutOfBounds(tile)){
                continue;
            }
            //Make sure tile has not already been searched
            if(visibleTileSet.has(JSON.stringify(tile))){
                continue;
            }
            //Make sure tile is visible
            if(!this.map[tile[0]][tile[1]].vision) {
                continue;
            }
            //Check to see if the tiles before was visible
            let visible = true;
            if(tile[0] > start[0]) {
                let offset = [-1, 0];
                let lastTile = tile.map((a, i) => a + offset[i])
                if(!visibleTileSet.has(JSON.stringify(lastTile))){
                    visible = false;
                }
            }
            else if(tile[0] < start[0]) {
                let offset = [1, 0];
                let lastTile = tile.map((a, i) => a + offset[i])
                if(!visibleTileSet.has(JSON.stringify(lastTile))){
                    visible = false;
                }
            }
            if(tile[1] > start[1]) {
                let offset = [0, -1];
                let lastTile = tile.map((a, i) => a + offset[i])
                if(!visibleTileSet.has(JSON.stringify(lastTile))){
                    visible = false;
                }
            }
            else if(tile[1] < start[1]) {
                let offset = [0, 1];
                let lastTile = tile.map((a, i) => a + offset[i])
                if(!visibleTileSet.has(JSON.stringify(lastTile))){
                    visible = false;
                }
            }
            //Add to queue + set
            if(visible) {
                visibleTileSet.add(JSON.stringify(tile));
                //Add surrounding tiles
                offsets.forEach((direction) => {
                    let lastTile = tile.map((a, i) => a + direction[i]);
                    queue.push(lastTile);
                })
            }
        }
        // Add vision around corners
        let diagonals = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
        diagonals.forEach((diagonal) => {
            let tile = start.map((a, i) => a + diagonal[i]);
            if(!this.isOutOfBounds(tile) && this.map[tile[0]][tile[1]].vision) {
                visibleTileSet.add(JSON.stringify(tile));
            }
        })
        return visibleTileSet;
    }

    getVisionFromMultiple(locations: number[][]) {
        let totalVision = new Set();
        locations.forEach((location) => {
            totalVision = new Set([...this.getVisionFrom(location), ...totalVision]);
        })
        return totalVision;
    }
}