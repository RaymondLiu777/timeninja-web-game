const Map = require("./map");

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
    testMap = new Map(mapstring);
    visionTiles = testMap.getVisionFrom([3, 3]);
    expect(visionTiles.length).toBe(expected_tiles.length);
    const expected = expected_tiles.map(row => row.join(',')).sort().join(' ');
    const actual = visionTiles.map(row => row.join(',')).sort().join(' ');
    expect(actual).toBe(expected);
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
    testMap = new Map(mapstring);
    visionTiles = testMap.getVisionFrom([3, 3]);
    expect(visionTiles.length).toBe(expected_tiles.length);
    const expected = expected_tiles.map(row => row.join(',')).sort().join(' ');
    const actual = visionTiles.map(row => row.join(',')).sort().join(' ');
    expect(actual).toBe(expected);
})