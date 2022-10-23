import { Channel, ChannelTypes, startBot } from "./deps.ts";
import { bot } from "./discord.ts";

class Socket {
  id: string;
  socket: WebSocket;
  channel: any;

  constructor(id: string, socket: WebSocket, channel: any) {
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

const webSockets: Socket[] = [];

let categoryChannel: Channel;

async function handleConn(conn: Deno.Conn) {
  const httpConn = Deno.serveHttp(conn);
  for await (const e of httpConn) {
    e.respondWith(handle(e.request));
  }
}

function handle(req: Request) {
  if (req.headers.get("upgrade") != "websocket") {
    return new Response("not trying to upgrade as websocket.");
  }
  const { socket, response } = Deno.upgradeWebSocket(req);
  socket.onopen = () => console.log("New socket opened");
  socket.onmessage = (e: MessageEvent) => {
    handleMessage(e.data, socket);
  };
  socket.onerror = (e: Event) => console.log("Socket error:", e);
  socket.onclose = () => handleDisconnection(socket);
  return response;
}

const handleMessage = async (
  message: string,
  socket: WebSocket,
): Promise<void> => {
  console.log(`Received message: ${message}`);
  const socketMessage: SocketMessage = JSON.parse(message);
  const socketId: string = `${socketMessage.nickname}-${socketMessage.id}`;
  const socketObj = webSockets.find((socket) => socket.id === socketId);
  const discordMessage: string =
    `${socketMessage.nickname} says: ${socketMessage.text}`;
  if (!socketObj) {
    const channel = await bot.helpers.createChannel(
      categoryChannel.guildId,
      {
        name: socketId,
        type: ChannelTypes.GuildText,
        parentId: categoryChannel.id,
      },
    );
    bot.helpers.sendMessage(channel.id, { content: discordMessage });
    webSockets.push(new Socket(socketId, socket, channel));
  } else {
    bot.helpers.sendMessage(socketObj.channel.id, {
      content: discordMessage,
    });
  }
};

const handleDisconnection = (ws: WebSocket): void => {
  const socketObj = webSockets.find((socket) => socket.socket === ws);
  if (socketObj) {
    bot.helpers.deleteChannel(socketObj.channel.id);
    webSockets.splice(webSockets.indexOf(socketObj), 1);
  }
};

bot.events.ready = async function (bot): Promise<void> {
  categoryChannel = await bot.helpers.createChannel(
    Deno.env.get("DISCORD_GUILD_ID") as string,
    {
      name: "ws-messages",
      type: ChannelTypes.GuildCategory,
    },
  );
  console.log("Successfully connected to gateway");
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

const port = Deno.env.get("PORT");

if (port) {
  const listener = Deno.listen({ port: Number(port) });
  console.log(`Listening on port ${port}`);
  for await (const conn of listener) {
    handleConn(conn);
  }
}
