import { GameMap } from "../server/gameMap";

const eqSet = (xs: Set<any>, ys: Set<any>) =>
    xs.size === ys.size &&
    [...xs].every((x) => ys.has(x));

test("Straight Map Vision Test", () => {
    const mapstring = 
    "2 2 2 2 2 2 2\n" +
    "2 1 1 1 1 1 2\n" +
    "2 1 2 1 2 1 2\n" +
    "2 1 1 1 1 1 2\n" +
    "2 1 2 1 2 1 2\n" +
    "2 1 1 1 1 1 2\n" +
    "2 2 2 2 2 2 2\n";
    const expected_tiles = [[1,3], [2,3], [3,3], [4,3], [5,3], [3,1], [3,2], [3,4], [3,5]];
    let testMap = new GameMap(mapstring);
    let visionTiles = testMap.getVisionFrom([3, 3]);
    expect(visionTiles.size).toBe(expected_tiles.length);
    const expected = new Set(expected_tiles.map(row => JSON.stringify(row)));
    expect(eqSet(visionTiles, expected)).toBe(true);
})

test("Diagonal Map Vision Test", () => {
    const mapstring = 
    "2 2 2 2 2 2 2\n" +
    "2 1 1 1 1 1 2\n" +
    "2 1 1 1 1 1 2\n" +
    "2 1 1 1 1 1 2\n" +
    "2 1 1 1 1 1 2\n" +
    "2 1 1 1 1 1 2\n" +
    "2 2 2 2 2 2 2\n";
    const expected_tiles = [
        [1,1], [1,2], [1,3], [1,4], [1,5],
        [2,1], [2,2], [2,3], [2,4], [2,5],
        [3,1], [3,2], [3,3], [3,4], [3,5],
        [4,1], [4,2], [4,3], [4,4], [4,5],
        [5,1], [5,2], [5,3], [5,4], [5,5],
    ];
    let testMap = new GameMap(mapstring);
    let visionTiles = testMap.getVisionFrom([3, 3]);
    expect(visionTiles.size).toBe(expected_tiles.length);
    const expected = new Set(expected_tiles.map(row => JSON.stringify(row)));
    expect(eqSet(visionTiles, expected)).toBe(true);
})