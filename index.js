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
    socket.on('message', async (msg) => {
        const guild = await client.guilds.fetch(process.env.GUILD_ID);
        let channel;
        if (!sockets.has(socket.id)){
            channel = await guild.channels.create(`${msg.author} ${socket.id}`, {type: "text"});
        }
        else {
            channel = sockets.get(socket.id).channel;
        }
        console.log(`Channel ${channel.id} created`);
        await channel.send(msg.text);
        sockets.set(socket.id, {socket,channel});
    });
    io.on('disconnect', async (socket) => {
        console.log("User disconnected");
        await sockets.get(socket.id).channel.delete();
    });
    client.on('message', async msg => {
        if (!msg.author.bot && msg.author === user) {
            const messageContent = {
                text: msg.content
            };
            console.log(`Sending message through ${socket.id}`);
            sockets.get(socket.id).socket.emit('message', messageContent);
        }
    });
});

client.login(process.env.BOT_TOKEN);