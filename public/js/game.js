let keyboard_state = {}

//Button presses for next move
document.addEventListener("keydown", (e) => {
    var code = e.code;
    if(!(code in keyboard_state) || keyboard_state[code] == false) {
        processButton(code);
    }
    keyboard_state[code] = true;
})

document.addEventListener("keyup", (e) => {
    keyboard_state[e.code] = false;
})

let buttonActionMap ={
    "ArrowDown": "Down",
    "ArrowUp": "Up",
    "ArrowRight": "Right",
    "ArrowLeft": "Left",
    "KeyS": "StarDown",
    "KeyW": "StarUp",
    "KeyD": "StarRight",
    "KeyA": "StarLeft",
    "Space": "Wait",
    "KeyP": "Stop"
}

function processButton(code) {
    if(code in buttonActionMap) {
        document.getElementById("input").innerText = buttonActionMap[code];
        socket.emit("GameInput", buttonActionMap[code]);
    }
    if(code === "KeyQ") {
        scrubTime(-1);
    }
    if(code === "KeyE") {
        scrubTime(1);
    }
}

var context = document.getElementById("game").getContext("2d");
var mapName;
var stageMap;
var player;
let currentTimestep;
let currentTimeloop;
let tempTimestep;
let timeline = [];

// Load Drawings
var image_list = ["stage1", "teststage", "novision", "player1", "player1old", "player2", "ninjastar", "ninjastar-down", "ninjastar-up", "ninjastar-right", "ninjastar-left"];
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
    timeline = [];
})

socket.on("GameUpdate", (gameState) => {
    console.log(gameState);
    currentTimestep = gameState.timestep;
    currentTimeloop = gameState.timeloop;
    tempTimestep = currentTimestep;
    if(currentTimeloop === timeline.length) {
        timeline.push([]);
    }
    timeline[currentTimeloop].push(gameState);
    context.filter = 'grayscale(0)';
    drawBoard(gameState, true);
    document.getElementById("input").innerText = "";
})

function scrubTime(offset) {
    console.log(offset);
    // Unable to scumb time
    if(currentTimeloop === 0) {
        return;
    }
    if(tempTimestep + offset < 0 || tempTimestep + offset >= timeline[0].length) {
        return;
    }
    // Update timestep
    tempTimestep += offset;
    console.log(timeline[currentTimeloop][currentTimestep]);
    if(tempTimestep === currentTimestep) {
        // Display board normally
        context.filter = 'grayscale(0)';
        drawBoard(timeline[currentTimeloop][currentTimestep], true);
    }
    else if(tempTimestep < currentTimestep){
        context.filter = 'grayscale(1)';
        drawBoard(timeline[currentTimeloop][tempTimestep], false);
    }
    else{
        context.filter = 'grayscale(1)';
        drawBoard(timeline[currentTimeloop-1][tempTimestep], false);
    }
}

function drawBoard(gameState, hideVision) {
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
        console.log(ninjaStar.direction);
        let image = "";
        if(ninjaStar.direction[0] === -1 && ninjaStar.direction[1] === 0) {
            image = "ninjastar-up";
        }
        if(ninjaStar.direction[0] === 1 && ninjaStar.direction[1] === 0) {
            image = "ninjastar-down";
        }
        if(ninjaStar.direction[0] === 0 && ninjaStar.direction[1] === -1) {
            image = "ninjastar-left";
        }
        if(ninjaStar.direction[0] === 0 && ninjaStar.direction[1] === 1) {
            console.log(ninjaStar.direction);
            image = "ninjastar-right";
        }
        console.log(image);
        context.drawImage(images[image], ninjaStar.location[1] * 32, ninjaStar.location[0] * 32);
    })
    //Hide vision
    if(hideVision) {
        let visible = new Set(gameState.vision);
        stageMap.forEach((row, rowIdx) => {
            row.forEach((tile, colIdx) => {
                if(!visible.has(JSON.stringify([rowIdx, colIdx]))) {
                    context.drawImage(images["novision"], colIdx * 32, rowIdx * 32);
                }
            })
        })
    }
}