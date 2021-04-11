require('dotenv').config({path: __dirname + '/.env'});
const Discord = require('discord.js');
const client = new Discord.Client();
const Koa = require('koa');
const cors = require('@koa/cors');
const koaBody = require('koa-body');
const ratelimit = require('koa-ratelimit');

const app = new Koa();
const db = new Map();
const sockets = new Map();

app.use(cors());
app.use(koaBody());
app.use(ratelimit({
    driver: 'memory',
    db: db,
    duration: 60000,
    errorMessage: 'Chill, go take a break or something.',
    id: (ctx) => ctx.ip,
    headers: {
        remaining: 'Rate-Limit-Remaining',
        reset: 'Rate-Limit-Reset',
        total: 'Rate-Limit-Total'
    },
    max: 100,
    disableHeader: false
}));

const server = require('http').createServer(app.callback());
const whitelist = ['http://localhost:63342', 'https://www.loadeksdi.com', 'https://loadeksdi.com'];

const io = require('socket.io')(server, {
    cors:
        {
            origin: function (origin, callback) {
		        console.log(origin);
                if (whitelist.indexOf(origin) !== -1) {
                    callback(null, true)
                } else {
                    callback(new Error('Not allowed by CORS'))
                }
            }
        }
});
server.listen(3000);
let user;
let socketId;

app.use(async (ctx) => {
    console.log("Access to page OK");
    ctx.body = 'OK';
});

client.on('ready', async () => {
    console.log(`Logged in as ${client.user.tag}!`);
    user = await client.users.fetch(process.env.USER_ID);
});

io.on('connection', (socket) => {
    console.log("Connected");
    let channel;
    socket.on('message', async (msg) => {
        const guild = await client.guilds.fetch(process.env.GUILD_ID);
        socketId = msg.id;
        if (!sockets.has(socketId)){
            channel = await guild.channels.create(`${msg.author} ${socketId}`, {type: "text"});
            console.log(`Channel ${socketId} created`);
            sockets.set(socketId, {socket,channel});
        }
        else {
            channel = sockets.get(socketId).channel;
        }
        await channel.send(msg.text);
    });
    socket.on('disconnect', async () => {
        console.log("User disconnected");
        if (channel){
            await channel.delete();
        }
    });
});

client.on('message', async msg => {
    if (!msg.author.bot && msg.author === user) {
        const messageContent = {
            text: msg.content
        };
        console.log(`Sending message through ${socketId}`);
        sockets.get(socketId).socket.emit('message', messageContent);
    }
});

client.login(process.env.BOT_TOKEN);