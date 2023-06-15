const Game = require("./game");

var io;
var players = {};
var games = {};

/**
 * Set Up Server Variables
 */
exports.startServer = function(sio){
    io = sio;
}

/**
 * Add new player
 */
exports.createConnection = function(socket){
    players[socket.id] = {
        id: socket.id,
        socket: socket,
        game: null
    };

    socket.on("CreateGame", (args) => {
        if(Game.createGame(io, games, args.id, args.bot)) {
            games[args.id].addPlayer(players[socket.id]);
        }
    })

    socket.on("JoinGame", (gameId) => {
        if(gameId in games === false) {
            console.log("Unable to find " + gameId);
            return;
        }
        games[gameId].addPlayer(players[socket.id]);
    })

    socket.on("GameInput", (args) => {
        let gameId = players[socket.id].game;
        if(gameId !== null && gameId in games) {
            games[gameId].playerInput(socket.id, args);
        }
    })

    socket.on("disconnect", () => {
        let gameId = players[socket.id].game;
        if(gameId !== null && gameId in games) {
            games[gameId].removePlayer(socket.id);
        }
        delete players[socket.id];
    })
}