var context = document.getElementById("game").getContext("2d");
var mapName;
var stageMap;
var player;

// Load Drawings
var image_list = ["stage1", "teststage", "novision", "player1", "player1old", "player2", "ninjastar"];
var images = {};
image_list.forEach((img_name)=> {
    let image_item = new Image();
    image_item.src = 'img/' + img_name + '.png';
    images[img_name] = image_item;
})

socket.on("GameStart", (startInfo) => {
    mapName = startInfo.id;
    stageMap = startInfo.map;
    player = startInfo.player;
})

    
socket.on("GameUpdate", (gameState) => {
    console.log(gameState);
    // Draw Map
    context.drawImage(images[mapName], 0, 0);
    //Draw enemies
    gameState.enemies.forEach((enemy) => {
        context.drawImage(images["player2"], enemy[1] * 32, enemy[0] * 32);
    })
    // Draw past you
    gameState.pastSelf.forEach((pastLocation) => {
        context.drawImage(images["player1old"], pastLocation[1] * 32, pastLocation[0] * 32);
    })
    // Draw you
    context.drawImage(images["player1"], gameState.player[1] * 32, gameState.player[0] * 32);
    // Draw NinjaStars
    gameState.ninjaStars.forEach((ninjaStar) => {
        context.drawImage(images["ninjastar"], ninjaStar.location[1] * 32, ninjaStar.location[0] * 32);
    })
    //Hide vision
    let visible = new Set(gameState.vision);
    stageMap.forEach((row, rowIdx) => {
        row.forEach((tile, colIdx) => {
            if(!visible.has(JSON.stringify([rowIdx, colIdx]))) {
                context.drawImage(images["novision"], colIdx * 32, rowIdx * 32);
            }
        })
    })
    document.getElementById("input").innerText = "";
})
