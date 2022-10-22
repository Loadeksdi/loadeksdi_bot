require("dotenv").config({ path: __dirname + "/.env" });
const Discord = require("discord.js");
const client = new Discord.Client();
const Koa = require("koa");
const cors = require("@koa/cors");
const koaBody = require("koa-body");
const ratelimit = require("koa-ratelimit");
const fetch = require("node-fetch");
const app = new Koa();
const db = new Map();
const sockets = new Map();
const accountsIds = new Map();
let emittableData;

app.use(cors());
app.use(koaBody());
app.use(ratelimit({
  driver: "memory",
  db: db,
  duration: 60000,
  errorMessage: "Chill, go take a break or something.",
  id: (ctx) => ctx.ip,
  headers: {
    remaining: "Rate-Limit-Remaining",
    reset: "Rate-Limit-Reset",
    total: "Rate-Limit-Total",
  },
  max: 100,
  disableHeader: false,
}));

const server = require("http").createServer(app.callback());
const whitelist = [
  "http://localhost:63342",
  "http://localhost:5500",
  "https://www.loadeksdi.com",
  "https://loadeksdi.com",
];

const io = require("socket.io")(server, {
  cors: {
    origin: function (origin, callback) {
      if (whitelist.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
  },
});

let user;
let socketId;

app.use(async (ctx) => {
  console.log("Access to page OK");
  ctx.body = "OK";
});

client.on("ready", async () => {
  console.log(`Logged in as ${client.user.tag}!`);
  user = await client.users.fetch(process.env.USER_ID);
});

async function gatherData() {
  emittableData = (await Promise.all([
    fetchLoLData(process.env.MAIN_ACC),
    fetchLoLData(process.env.SMURF_ACC),
  ])).map((acc) => ({
    name: acc[0].summonerName,
    tier: acc[0].tier,
    rank: acc[0].rank,
    lp: acc[0].leaguePoints,
    wr: acc[0].wins / (acc[0].wins + acc[0].losses),
  }));
}

async function init() {
  setInterval(gatherData, 30 * 60 * 1000);
  server.listen(3000);
}

io.on("connection", async (socket) => {
  console.log("Connected");
  socket.emit("accinfo", emittableData);
  let channel;
  socket.on("message", async (msg) => {
    socketId = msg.id;
    if (!sockets.has(socketId)) {
      const guild = await client.guilds.fetch(process.env.GUILD_ID);
      channel = await guild.channels.create(`${msg.author} ${socketId}`, {
        type: "text",
      });
      console.log(`Channel ${socketId} created`);
      sockets.set(socketId, { socket, channel });
    } else {
      channel = sockets.get(socketId).channel;
    }
    await channel.send(msg.text);
  });
  socket.on("disconnect", async () => {
    console.log("User disconnected");
    if (channel) {
      await channel.delete();
    }
  });
});

client.on("message", async (msg) => {
  if (!msg.author.bot && msg.author === user) {
    const messageContent = {
      text: msg.content,
    };
    console.log(`Sending message through ${socketId}`);
    sockets.get(socketId).socket.emit("message", messageContent);
  }
});

async function fetchLoLData(name) {
  if (!accountsIds.has(name)) {
    const summoner = await (await fetch(
      encodeURI(
        `https://euw1.api.riotgames.com/lol/summoner/v4/summoners/by-name/${name}?api_key=${process.env.RIOT_API_KEY}`,
      ),
    )).json();
    accountsIds.set(name, summoner.id);
  }
  const id = accountsIds.get(name);
  return await (await fetch(
    `https://euw1.api.riotgames.com/lol/league/v4/entries/by-summoner/${id}?api_key=${process.env.RIOT_API_KEY}`,
  )).json();
}

init();
client.login(process.env.BOT_TOKEN);
