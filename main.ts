import {
  Channel,
  ChannelTypes,
  startBot,
  WebSocketClient,
  WebSocketServer,
} from "./deps.ts";
import { bot } from "./discord.ts";

class Socket {
  id: string;
  socket: WebSocketClient;
  channel: any;

  constructor(id: string, socket: WebSocketClient, channel: any) {
    this.id = id;
    this.socket = socket;
    this.channel = channel;
  }
}

interface SocketMessage {
  id: string;
  text: string;
  nickname: string;
}

const wss = new WebSocketServer(3000);
const webSockets: Socket[] = [];

let categoryChannel: Channel;

wss.on("connection", function (ws: WebSocketClient) {
  ws.on("message", async function (message: string) {
    console.log(`Received message: ${message}`);
    const socketMessage: SocketMessage = JSON.parse(message);
    const socketObj = webSockets.find((socket) =>
      socket.id === socketMessage.id
    );
    const discordMessage: string =
      `${socketMessage.nickname} says: ${socketMessage.text}`;
    if (!socketObj) {
      const socketId: string = `${socketMessage.nickname}-${socketMessage.id}`;
      const channel = await bot.helpers.createChannel(
        categoryChannel.guildId,
        {
          name: socketId,
          type: ChannelTypes.GuildText,
          parentId: categoryChannel.id,
        },
      );
      bot.helpers.sendMessage(channel.id, { content: discordMessage });
      webSockets.push(new Socket(socketId, ws, channel));
    } else {
      bot.helpers.sendMessage(socketObj.channel.id, {
        content: discordMessage,
      });
    }
  });
  ws.on("close", function () {
    const socketObj = webSockets.find((socket) => socket.socket === ws);
    if (socketObj) {
      bot.helpers.deleteChannel(socketObj.channel.id);
      webSockets.splice(webSockets.indexOf(socketObj), 1);
    }
  });
});

bot.events.ready = async function (bot): Promise<void> {
  console.log("Successfully connected to gateway");
  categoryChannel = await bot.helpers.createChannel(
    Deno.env.get("DISCORD_GUILD_ID") as string,
    {
      name: "ws-messages",
      type: ChannelTypes.GuildCategory,
    },
  );
};

bot.events.messageCreate = async function (_, message): Promise<void> {
  if (message.isFromBot) return;
  const socketObj = webSockets.find((socket) =>
    socket.channel.id === message.channelId
  );
  if (socketObj) {
    socketObj.socket.send(JSON.stringify({ text: message.content }));
    console.log(`Sent message: ${message.content}`);
  }
};

await startBot(bot);
