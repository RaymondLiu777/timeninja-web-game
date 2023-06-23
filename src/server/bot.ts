import { Socket } from "socket.io-client";

var client = require("socket.io-client");

export function startBot(port: string) {
    var socket: Socket = client.connect('http://localhost:' + port);

    socket.on("connect", () => {
        console.log("Bot connected at id: ", socket.id); 
        socket.emit("BotConnection");
    });  
    
    socket.on("GameStart", (args:any) => {
        startBot(port);
    })

    socket.on("GameUpdate", (args: any) => {
        socket.emit("GameInput", "Wait");
    });

    socket.on("GameEnd", (args: any) => {
        socket.disconnect();
    })
}