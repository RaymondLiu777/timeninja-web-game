const socket = io();

socket.on("connect", () => {
    console.log(socket.id); 
});  

//Create game button
document.getElementById("create-game-btn").addEventListener("click", (e) => {
    e.preventDefault();
    var gameId = document.getElementById('gameId').value;
    console.log("CreateGame", gameId);
    socket.emit("CreateGame", {id: gameId, bot: false});
})

//Create bot game
document.getElementById("bot-game-btn").addEventListener("click", (e) => {
    e.preventDefault();
    var gameId = document.getElementById('gameId').value;
    console.log("JoinGame", gameId);
    socket.emit("CreateGame", {id: gameId, bot: true});
})

//Join someone's lobby
document.getElementById("join-game-btn").addEventListener("click", (e) => {
    e.preventDefault();
    var gameId = document.getElementById('gameId').value;
    console.log("JoinGame", gameId);
    socket.emit("JoinGame", gameId);
})

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
    "KeyA": "StarLeft"
}

function processButton(code) {
    if(code in buttonActionMap) {
        document.getElementById("input").innerText = buttonActionMap[code];
        socket.emit("GameInput", buttonActionMap[code]);
    }
}

//Next move field
document.getElementById("next-move-btn").addEventListener("click", (e) => {
    e.preventDefault();
    let move = document.getElementById('next-move').value;
    if(move.split(" ")[0] === "script") {
        scripting(move);

    }
    else {
        console.log("GameInput", move);
        socket.emit("GameInput", move);
    }
    document.getElementById('next-move').value = "";
})

async function scripting(script) {
    let moves = script.split(" ")
    for(let i = 1; i < moves.length; i++) {
        setTimeout(() => {
            socket.emit("GameInput", moves[i]);
        }, 2000 * i)
    }
}