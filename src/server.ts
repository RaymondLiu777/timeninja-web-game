import { Game } from "./game";
import { Socket, Server } from 'socket.io';

interface createGameEvent {
    id:string;
    bot:boolean;
}

export interface Player {
    id: string;
    socket: Socket;
    game: string | null;
}

var io: Server;
var players = new Map<string, Player>();
var ongoingGames = new Map<string, Game>();
var gameQueue = new Map<string, string>();
var bot:string = "";

/**
 * Set Up Server Variables
 */
export function startServer(sio: Server){
    io = sio;
}

/**
 * Add new player
 */
export function createConnection(socket: Socket){
    players.set(socket.id, 
        {
            id: socket.id,
            socket: socket,
            game: null
        });

    socket.on("CreateGame", (args: createGameEvent) => {
        //Check if current in game
        let player = players.get(socket.id);
        if(player != null && player.game != null) {
            let game = ongoingGames.get(player.game);
            if(game != null && game.gameStatus === "Finished") {
                ongoingGames.delete(player.game);
            }
            else {
                return;
            }
        }
        let gameId = args.id;
        if(gameQueue.has(args.id)) {
            console.log("Game: ", args.id, " has already been created");
            return;
        }
        if(ongoingGames.has(args.id)) {
            if(ongoingGames.get(args.id)?.gameStatus == "Finished") {
                // Game already ended
                ongoingGames.delete(args.id);
            }
            else {
                console.log("Game: ", args.id, " already started");
                return;
            }
        }
        gameQueue.set(gameId, socket.id);
        if(args.bot) {
            //TODO bot games
        }
    })

    socket.on("JoinGame", (gameId: string) => {
        //Check if current in game
        let player = players.get(socket.id);
        if(player != null && player.game != null) {
            let game = ongoingGames.get(player.game);
            if(game != null && game.gameStatus === "Finished") {
                ongoingGames.delete(player.game);
            }
            else {
                return;
            }
        }
        if(gameQueue.has(gameId)) {
            let player1 = players.get(gameQueue.get(gameId)!)!;
            let player2 = players.get(socket.id)!;
            player1.game = gameId;
            player2.game = gameId;
            ongoingGames.set(gameId, new Game(io, gameId, player1, player2));
            gameQueue.delete(gameId);
        }
        else {
            console.log("Unable to find game: " + gameId);
        }
    })

    socket.on("GameInput", (args: string) => {
        let gameId = players.get(socket.id)?.game;
        if(gameId != undefined && ongoingGames.has(gameId)) {
            ongoingGames.get(gameId)?.playerInput(socket.id, args);
        }
    })

    socket.on("disconnect", () => {
        let gameId = players.get(socket.id)?.game;
        if(gameId != null && ongoingGames.has(gameId)) {
            ongoingGames.get(gameId)?.endGame(-1);
        }
        players.delete(socket.id);
    })
}