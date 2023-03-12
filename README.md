# djs-fm
DiscordJS File Manager

## Preview
```js
require("dotenv").config();
const { Client, GatewayIntentBits, REST, Routes, Events } = require("discord.js");
const { CommandBuilder, Handler } = require('djs-fm');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

const commandBuiler = new CommandBuilder(process.env.DISCORD_BOT_TOKEN, process.env.CLIENT_ID, REST, Routes);
const handler = new Handler('/config/handlers.json');

commandBuiler.build('/config/commands.json');

client.on('ready', () => {
  console.log("Ready: " + client.user.username);
});

client.on(Events.InteractionCreate, async (interaction) => {
  await handler.interaction(interaction, client);
});

client.on(Events.MessageCreate, async (event) => {
  await handler.prefix(event, client);
});

client.login(process.env['DISCORD_BOT_TOKEN']);
```

## Interested?
Contact the developer via [Discord](https://discord.gg/Urt5S2Ucju).