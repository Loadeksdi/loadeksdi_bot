import { bot } from "./discord";
import {
  Bot,
  DiscordMessage,
  startBot,
  WebSocketClient,
  WebSocketServer,
} from "./deps.ts";

class Socket {
  id: string;
  socket: WebSocketClient;

  constructor(id: string, socket: WebSocketClient) {
    this.id = id;
    this.socket = socket;
  }
}

interface SocketMessage {
  id: string;
  text: string;
}

const wss = new WebSocketServer(3000);
const webSockets: Socket[] = [];

wss.on("connection", function (ws: WebSocketClient) {
  ws.on("message", function (message: SocketMessage) {
    const socketObj = webSockets.find((socket) => socket.id === message.id);
    if (!socketObj) {
      webSockets.push(new Socket(message.id, ws));
      bot.helpers.channelCreate(bot, message.id);
    } else {
      bot.helpers.messageCreate(bot, message.id, message.text);
    }
    ws.send(message);
  });
  ws.on("close", function () {
    bot.helpers.channelDelete();
    webSockets.splice(webSockets.indexOf(ws), 1);
  });
});

bot.events.messageCreate = function (bot: Bot, message: DiscordMessage) {
  if (message.isFromBot) return;
  const socketObj = webSockets.find((socket) => socket.id === message.channel);
  if (socketObj) {
    socketObj.socket.emit("message", message.content);
  }
};

await startBot(bot);
