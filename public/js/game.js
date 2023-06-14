var context = document.getElementById("game").getContext("2d");
var mapName;
var stageMap;
var player;

// Load Drawings
var image_list = ["stage1", "teststage", "novision", "player1", "player2", "ninjastar"];
var images = {};
image_list.forEach((img_name)=> {
    let image_item = new Image();
    image_item.src = 'img/' + img_name + '.png';
    images[img_name] = image_item;

    image_item.addEventListener("load", () => ctx.drawImage(image_item, 0, 0));
})

socket.on("GameStart", (startInfo) => {
    mapName = startInfo.id;
    stageMap = startInfo.map;
    player = startInfo.player;
})

    
socket.on("GameUpdate", (gameState) => {
    // Draw Map
    context.drawImage(images[mapName], 0, 0);
    // Draw players
    context.drawImage(images["player1"], gameState.players[0][1] * 32, gameState.players[0][0] * 32);
    context.drawImage(images["player2"], gameState.players[1][1] * 32, gameState.players[1][0] * 32);
    // Draw NinjaStars
    gameState.ninjaStars.forEach((ninjaStar) => {
        context.drawImage(images["ninjastar"], ninjaStar.location[1] * 32, ninjaStar.location[0] * 32);
    })
    //Hide vision
    let visible = getVisionFrom(gameState.players[player]);
    stageMap.forEach((row, rowIdx) => {
        row.forEach((tile, colIdx) => {
            if(!visible.has(JSON.stringify([rowIdx, colIdx]))) {
                context.drawImage(images["novision"], colIdx * 32, rowIdx * 32);
            }
        })
    })
    document.getElementById("input").innerText = "";
})


function getVisionFrom(start) {
    let visibleTileSet = new Set();
    let queue = [start];
    const offsets = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    let i = 0;
    while(i < queue.length) {
        let tile = queue[i];
        i++;
        //Make sure it is in the map boundaries
        if(tile[0] < 0 || tile[0] >= stageMap.length || tile[1] < 0 || tile[1] >= stageMap[tile[0]].length){
            continue;
        }
        //Make sure tile has not already been searched
        if(visibleTileSet.has(JSON.stringify(tile))){
            continue;
        }
        //Make sure tile is visible
        if(!stageMap[tile[0]][tile[1]].vision) {
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
    return visibleTileSet;
}