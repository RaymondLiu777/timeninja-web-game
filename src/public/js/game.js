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

Array.from(document.getElementsByClassName("mobile-button")).forEach((button) => {
    console.log(button);
    button.addEventListener("click", (e) => {
        e.preventDefault();
        processButton(button.value);
    })
});

var context = document.getElementById("game").getContext("2d");
context.textAlign = "center";
context.fillStyle = "white";
context.font = "48px serif";
var mapName;
var stageMap;
var player;
var maxTimestep; 
var maxTimeloop; 
let currentTimestep;
let currentTimeloop;
let tempTimestep;
let timeline = [];
let fullTimeline;
let gameText = "";
let gameOver;
let lastMove

// Load Drawings
var image_list = ["stage1", "teststage", "novision", "player1", "player1old", "player2", "player2old", "ninjastar", "ninjastar-down", "ninjastar-up", "ninjastar-right", "ninjastar-left"];
var images = {};
image_list.forEach((img_name)=> {
    let image_item = new Image();
    image_item.src = 'img/' + img_name + '.png';
    images[img_name] = image_item;
})

socket.on("GameStart", (startInfo) => {
    console.log(startInfo);
    document.getElementById("matchmaking").classList.add("hidden");
    document.getElementById("gameinfo").classList.remove("hidden");
    mapName = startInfo.id;
    stageMap = startInfo.map;
    player = startInfo.player;
    maxTimestep = startInfo.maxTimestep;
    maxTimeloop = startInfo.maxTimeloop;
    timeline = [];
    gameText = "";
    gameOver = false;
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
    let timeleft = maxTimestep - currentTimestep - 1;
    if(timeleft === 0) {
        document.getElementById("timeleft").style.fontWeight = "bold";
        document.getElementById("timeleft").innerText = "Timewarp incoming";
    }
    else {
        document.getElementById("timeleft").style.fontWeight = "normal";
        document.getElementById("timeleft").innerText = timeleft;
    }
})

socket.on("GameEnd", (gameInfo) => {
    console.log(gameInfo);
    document.getElementById("gameinfo").classList.add("hidden");
    document.getElementById("matchmaking").classList.remove("hidden");
    if(gameInfo.winner === -1) {
        gameText = "Tie Game";
    }
    else {
        if(gameInfo.winner === player) {
            gameText = "Winner";
        }
        else {
            gameText = "Loser";
        }
    }
    fullTimeline = gameInfo.fullTimeline;
    lastMove = currentTimeloop * maxTimestep + currentTimestep;
    tempTimestep = lastMove;
    console.log(timeline[Math.floor(tempTimestep/maxTimestep)][tempTimestep%maxTimestep]);
    drawBoard(timeline[currentTimeloop][currentTimestep], true);
    gameOver = true;
})

function scrubTime(offset) {
    console.log(offset);
    if(!gameOver) {
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
    else {
        gameText = "";
        tempTimestep += offset;
        if(tempTimestep < 0) {
            tempTimestep = lastMove;
        }
        if(tempTimestep > lastMove) {
            tempTimestep = 0;
        }
        drawBoard(fullTimeline[Math.floor(tempTimestep/maxTimestep)][tempTimestep%maxTimestep], false);
    }
}

function drawBoard(gameState, hideVision) {
    // Draw Map
    context.drawImage(images[mapName], 0, 0);
    //Draw enemies
    gameState.enemies.forEach((enemy) => {
        context.drawImage(images["player2old"], enemy[1] * 32, enemy[0] * 32);
    })
    // Draw present enemy (after game ends)
    if("enemy" in gameState) {
        context.drawImage(images["player2"], gameState.enemy[1] * 32, gameState.enemy[0] * 32);
    }
    // Draw past you
    gameState.pastSelf.forEach((pastLocation) => {
        context.drawImage(images["player1old"], pastLocation[1] * 32, pastLocation[0] * 32);
    })
    // Draw you
    context.drawImage(images["player1"], gameState.player[1] * 32, gameState.player[0] * 32);
    // Draw NinjaStars
    gameState.ninjaStars.forEach((ninjaStar) => {
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
            image = "ninjastar-right";
        }
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
    // Text
    context.fillText(gameText, 176, 176);
}