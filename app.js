const express = require("express");
const { createServer } = require("http");
const { Server } = require("socket.io");
const path = require('path');
const game = require('./server');

const app = express();
app.use(express.static('public'));

const httpServer = createServer(app);
const io = new Server(httpServer);

let port = 3000;
httpServer.listen(port);
console.log(`Server listening on port ${port}`)

game.startServer(io);

io.on("connection", (socket) => {
    // ...
    console.log("Connection from: " + socket.id);
    game.createConnection(socket);
});