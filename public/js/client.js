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