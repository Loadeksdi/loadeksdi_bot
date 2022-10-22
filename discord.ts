import { config, createBot, Intents } from "./deps.ts";

export const bot = createBot({
  token: config().DISCORD_TOKEN,
  intents: Intents.Guilds | Intents.GuildMessages | Intents.MessageContent,
  events: {},
});
