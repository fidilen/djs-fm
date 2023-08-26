const VERSION = '10';

const InteractionType = {
    "1": { name: "PING", key: "" },
    "2": { name: "APPLICATION_COMMAND", key: "commandName" },
    "3": { name: "MESSAGE_COMPONENT", key: "customId" },
    "4": { name: "APPLICATION_COMMAND_AUTOCOMPLETE", key: "commandName" },
    "5": { name: "MODAL_SUBMIT", key: "customId" }
};

// https://discord.com/developers/docs/resources/channel
const ChannelType = {
    "GUILD_TEXT": 0,
    "DM": 1,
    "PUBLIC_THREAD": 11,
    "PRIVATE_THREAD": 12
};

//---------- Command Builder 
class CommandBuilder {
    constructor(bot_token, client_id, REST, Routes) {
        this.bot_token = bot_token;
        this.client_id = client_id;
        this.REST = REST;
        this.Routes = Routes;
    }

    async build(module) {
        let data;

        const rest = new this.REST({ version: VERSION }).setToken(this.bot_token);

        const json = await getModule(module);

        try {
            if (json.guild_id) {
                data = await rest.put(this.Routes.applicationGuildCommands(this.client_id, json.guild_id), { body: json.commands });
            } else {
                data = await rest.put(this.Routes.applicationCommands(this.client_id), { body: json.commands });
            }
        } catch (error) {
            console.error(error);
        }

        return data;
    }
}

//---------- Handler 
class Handler {
    constructor(json_handlers) {
        this.json_handlers = require(process.cwd() + json_handlers);
    }

    async generic(key, event, client, utils) {
        if (this.json_handlers[key]) {
            await requireParams(this.json_handlers[key], event, client, utils);
        }
    }

    async interaction(interaction, client, utils) {
        const type = InteractionType[interaction.type];
        const handler = type.name;
        const id = interaction[type.key];

        if (handler && id && this.json_handlers[handler] && this.json_handlers[handler][id]) {
            await requireParams(this.json_handlers[handler][id], interaction, client, utils);
        }
    }

    async all(event, client, utils) {
        if (event.author.id == client.user.id) return;

        const handler = this.json_handlers?.MESSAGE_CREATE?.ALL;

        if (handler) {
            await requireParams(handler, event, client, utils);
        }
    }

    async prefix(event, client, utils) {
        if (event.author.id == client.user.id || event.author.bot) return;

        const prefix = event.content?.split(' ')?.shift();
        const handler = this.json_handlers?.MESSAGE_CREATE?.PREFIX;

        if (handler && handler[prefix]) {
            await requireParams(handler[prefix], event, client, utils);
        }
    }

    async channel(event, client, utils) {
        if (event.author.id == client.user.id || event.author.bot) return;

        const channel = event.channelId;
        const handler = this.json_handlers?.MESSAGE_CREATE?.CHANNEL;

        if (handler && handler[channel]) {
            await requireParams(handler[channel], event, client, utils);
        }
    }

    async mention(event, client, utils) {
        if (event.author.id == client.user.id || event.author.bot) return;

        if (event.mentions?.users?.size == 0) return;

        const mentions = event.mentions?.users.map(u => { return u.id });

        if (mentions.length == 0) return;

        const handler = this.json_handlers?.MESSAGE_CREATE?.MENTION || null;

        if (handler == null) {
            return;
        }

        for (let id of mentions) {
            if (handler[id]) {
                await requireParams(handler[id], event, client, utils);
            }
        }
    }

    async dm(event, client, utils) {
        if (event.author.id == client.user.id || event.author.bot) return;

        if (!event.channel.isDMBased()) return;

        const handler = this.json_handlers?.MESSAGE_CREATE?.DM;

        if (handler) {
            await requireParams(handler, event, client, utils);
        }
    }

    async bot(event, client, utils) {
        if (!event.author.bot) return;

        const handler = this.json_handlers?.MESSAGE_CREATE?.BOT;

        if (handler) {
            await requireParams(handler, event, client, utils);
        }
    }

    async reactionAdd(event, user, client, utils) {
        if (user.bot) return;

        const handler = this.json_handlers?.MESSAGE_REACTION_ADD;

        if (handler) {
            await requireParams(handler, { reaction: event, user: user }, client, utils);
        }
    }

    async reactionDelete(event, user, client, utils) {
        if (user.bot) return;

        const handler = this.json_handlers?.MESSAGE_REACTION_DELETE;

        if (handler) {
            await requireParams(handler, { reaction: event, user: user }, client, utils);
        }
    }
}

//---------- Utils
const Utils = {
    splitMessage: function (message, limit = 2000) {
        let content = [];

        while (message.length > limit) {
            let index = getSplitIndex(message, limit);

            content.push(message.substring(0, index));

            message = message.substring(index + (index < message.length && message[index] === '\n' ? 1 : 0), message.length);
        }

        content.push(message);

        return content;
    },

    sleep: async function sleep(ms) {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                resolve();
            }, ms || 0);
        });
    }
}

//---------- functions
function getSplitIndex(string, limit) {
    let index = string.substring(0, limit).lastIndexOf('\n\n');

    if (index <= 0) index = string.substring(0, limit).lastIndexOf('\n');
    if (index <= 0) index = string.substring(0, limit - 1).lastIndexOf('.') + 1;
    if (index <= 0) index = string.substring(0, limit - 1).lastIndexOf(',') + 1;
    if (index <= 0) index = string.substring(0, limit - 1).lastIndexOf(' ') + 1;
    if (index <= 0) index = limit;

    return index;
}

async function requireParams(module, event, client, utils) {
    utils = utils ? utils : {};
    utils['require'] = _require;
    utils['getModule'] = getModule;
    utils['sleep'] = sleep;

    try {
        return require(process.cwd() + module)(event, client, utils);
    } catch (e) {
        console.error(e.message);
    }
}

async function getModule(module) {
    try {
        return require(process.cwd() + module);
    } catch (e) {
        console.error(e.message);
    }
}

async function _require(module) {
    try {
        return require(module);
    } catch (e) {
        console.error(e.message);
    }
}

async function sleep(ms) {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            resolve();
        }, ms || 0);
    });
}

module.exports = { CommandBuilder, Handler, Utils };