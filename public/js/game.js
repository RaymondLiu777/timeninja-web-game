var context = document.getElementById("game").getContext("2d");

// Load Drawings
var image_list = ["stage1", "player1", "player2", "ninjastar"];
var images = {};
image_list.forEach((img_name)=> {
    let image_item = new Image();
    image_item.src = 'img/' + img_name + '.png';
    images[img_name] = image_item;

    image_item.addEventListener("load", () => ctx.drawImage(image_item, 0, 0))
})
    
socket.on("GameUpdate", (gameState) => {
    console.log(gameState);
    context.drawImage(images["stage1"], 0, 0);
    context.drawImage(images["player1"], gameState.players[0][1] * 32, gameState.players[0][0] * 32)
    context.drawImage(images["player2"], gameState.players[1][1] * 32, gameState.players[1][0] * 32)
    gameState.ninjaStars.forEach((ninjaStar) => {
        context.drawImage(images["ninjastar"], ninjaStar.location[1] * 32, ninjaStar.location[0] * 32)
    })
})