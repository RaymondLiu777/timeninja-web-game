const express = require("express");
const { createServer } = require("http");
import { Server, Socket } from 'socket.io';
import { startServer, createConnection } from './server/server';
import { startBot } from './server/bot';
var path = require('path');

const app = express();
app.use(express.static(path.join(__dirname, 'public')));

const httpServer = createServer(app);
const io = new Server(httpServer);

const PORT = process.env.PORT || '3000'
httpServer.listen(PORT);
console.log(`Server listening on port ${PORT}`)

startServer(io);

io.on("connection", (socket: Socket) => {
    // ...
    console.log("Connection from: " + socket.id);
    createConnection(socket);
});

startBot(PORT);