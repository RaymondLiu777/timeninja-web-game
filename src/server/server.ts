import { Game } from "./game";
import { Socket, Server } from 'socket.io';
import { GameStatus } from "./gameStatus";

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
var botId:string|null = null;

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
        if(!readyToJoin(socket.id)){
            console.log("Player unable to create game");
            return;
        }
        // Look for game
        let gameId = args.id;
        if(gameQueue.has(args.id)) {
            console.log("Game: ", args.id, " has already been created");
            return;
        }
        if(ongoingGames.has(args.id)) {
            if(ongoingGames.get(args.id)?.game.gameStatus ) {
                // Game already ended
                ongoingGames.delete(args.id);
            }
            else {
                console.log("Game: ", args.id, " already started");
                return;
            }
        }
        if(args.bot) {
            if(botId != null) {
                let player1 = players.get(socket.id)!;
                let player2 = players.get(botId)!;
                botId = null;
                player1.game = gameId;
                player2.game = gameId;
                ongoingGames.set(gameId, new Game(io, gameId, player1, player2));
            }
            else{
                console.log("No bot found");
            }
        }
        else {
            gameQueue.set(gameId, socket.id);
        }
    })

    socket.on("JoinGame", (gameId: string) => {
        //Check if current in game
        if(!readyToJoin(socket.id)){
            console.log("Player unable to join game");
            return;
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
            if(!GameStatus.isDone(ongoingGames.get(gameId)!.game.gameStatus)){
                ongoingGames.get(gameId)!.game.gameStatus = GameStatus.Disconnect;
                ongoingGames.get(gameId)!.endGame();
            }
            ongoingGames.delete(gameId);
        }
        players.delete(socket.id);
    })

    socket.on("BotConnection", () => {
        botId = socket.id;
    })
}

function readyToJoin(socketId:string) {
    let player = players.get(socketId);
    if(player == undefined) {
        console.log("Player could not be found: ", socketId);
        return false;
    }
    if(player.game != null) {
        let game = ongoingGames.get(player.game);
        if(game == undefined){
            return true;
        }
        else if(GameStatus.isDone(game.game.gameStatus)) {
            ongoingGames.delete(player.game);
            console.log("Deleted game")
            return true
        }
        else {
            return false;
        }
    }
    return true;
}