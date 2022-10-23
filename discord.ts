import { createBot, Intents } from "./deps.ts";

export const bot = createBot({
  token: Deno.env.get("DISCORD_TOKEN") as string,
  intents: Intents.Guilds | Intents.GuildMessages | Intents.MessageContent,
  events: {},
});
