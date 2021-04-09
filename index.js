const Discord = require('discord.js');
const client = new Discord.Client();
const Koa = require('koa');
const cors = require('@koa/cors');
//const router = require('@koa/router');
const koaBody = require('koa-body');
const ratelimit = require('koa-ratelimit');
const app = new Koa();
const db = new Map();

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

let user;

client.on('ready', async () => {
    console.log(`Logged in as ${client.user.tag}!`);
    user = await client.users.fetch(process.env.USER_ID);
});

client.on('message', msg => {
    if (msg.author === user){
        console.log(msg);
    }
});

app.use(async ctx => {
    if (ctx.request.is('application/json')) {
        ctx.status = 200;
        const msg = ctx.request.body.message;
        user.send(`*${JSON.stringify(msg.author)}* said: ${JSON.stringify(msg.text)}`);
    }
});

app.listen(3000);
client.login(process.env.BOT_TOKEN);