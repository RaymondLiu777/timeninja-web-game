const socket = io();

socket.on("connect", () => {
    console.log(socket.id); 
});  

socket.on("test", (data) => {
    console.log(data)
    document.getElementById("test").innerHTML = data;
})

document.getElementById("create-game-btn").addEventListener("click", (e) => {
    e.preventDefault();
    var gameId = document.getElementById('gameId').value;
    console.log("CreateGame", gameId);
    socket.emit("CreateGame", gameId);
})

document.getElementById("join-game-btn").addEventListener("click", (e) => {
    e.preventDefault();
    var gameId = document.getElementById('gameId').value;
    console.log("JoinGame", gameId);
    socket.emit("JoinGame", gameId);
})

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