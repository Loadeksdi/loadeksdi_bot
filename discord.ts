import { Bot, config, createBot, Intents } from "./deps";

export const bot: Bot = createBot({
  token: config().DISCORD_TOKEN,
  intents: Intents.Guilds | Intents.GuildMessages | Intents.MessageContent |
    Intents.GuildChannels,
  events: {
    ready() {
      console.log("Successfully connected to gateway");
    },
  },
});
