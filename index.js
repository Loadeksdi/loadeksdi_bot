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
const whitelist = ['http://localhost:63342', 'http://loadeksdi.github.io'];
const io = require('socket.io')(server, {
    cors:
        {
            origin: function (origin, callback) {
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

client.on('ready', async () => {
    console.log(`Logged in as ${client.user.tag}!`);
    user = await client.users.fetch(process.env.USER_ID);
});

io.on('connection', (socket) => {
    console.log("Connected");
    socket.on('message', async (msg) => {
        const discordMessage = await user.send(`**${msg.author}** said: ${msg.text}`);
        sockets.set(discordMessage.id, socket);
    });
});

client.on('message', async msg => {
    if (msg.author.bot) {
        return;
    }
    if (msg.author === user && msg.reference) {
        const messageContent = {
            text: msg.content
        };
        sockets.get(msg.reference.messageID).emit('message', messageContent);
    }
});

client.login(process.env.BOT_TOKEN);