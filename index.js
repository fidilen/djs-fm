const VERSION = '10';

const InteractionType = {
    "1": { name: "PING", key: "" },
    "2": { name: "APPLICATION_COMMAND", key: "commandName" },
    "3": { name: "MESSAGE_COMPONENT", key: "customId" },
    "4": { name: "APPLICATION_COMMAND_AUTOCOMPLETE", key: "" },
    "5": { name: "MODAL_SUBMIT", key: "customId" }
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

//---------- Command Builder 
class Handler {
    constructor(json_handlers) {
        this.json_handlers = require(process.cwd() + json_handlers);
    }

    async interaction(interaction, client, utils) {
        const type = InteractionType[interaction.type];
        const handler = type.name;
        const id = interaction[type.key];

        if (handler && id && this.json_handlers[handler] && this.json_handlers[handler][id]) {
            await requireUncached(this.json_handlers[handler][id], interaction, client, utils);
        }
    }

    async all(event, client, utils) {
        if (event.author.id == client.user.id) return;

        const handler = this.json_handlers?.MESSAGE_CREATE?.ALL;

        if (handler) {
            await requireUncached(handler, event, client, utils);
        }
    }

    async prefix(event, client, utils) {
        if (event.author.id == client.user.id) return;

        const prefix = event.content?.split(' ')?.shift();
        const handler = this.json_handlers?.MESSAGE_CREATE?.PREFIX;

        if (handler && handler[prefix]) {
            await requireUncached(handler[prefix], event, client, utils);
        }
    }

    async channel(event, client, utils) {
        if (event.author.id == client.user.id) return;

        const channel = event.channelId;
        const handler = this.json_handlers?.MESSAGE_CREATE?.CHANNEL;

        if (handler && handler[channel]) {
            await requireUncached(handler[channel], event, client, utils);
        }
    }

    async mention(event, client, utils) {
        if (event.author.id == client.user.id) return;

        if (event.mentions?.users?.size == 0) return;

        const mentions = event.mentions?.users.map(u => { return u.id });

        if (mentions.length == 0) return;

        const handler = this.json_handlers?.MESSAGE_CREATE?.MENTION || null;

        if (handler == null) {
            return;
        }

        for (let id of mentions) {
            if (handler[id]) {
                await requireUncached(handler[id], event, client, utils);
            }
        }
    }
}

async function requireUncached(module, event, client, utils) {
    utils = utils ? utils : {};
    utils['require'] = getModule;
    utils['sleep'] = sleep;

    try {
        delete require.cache[require.resolve(process.cwd() + module)];
        return require(process.cwd() + module)(event, client, utils);
    } catch (e) {
        console.error(e.message);
    }
}

async function getModule(module) {
    try {
        delete require.cache[require.resolve(process.cwd() + module)];
        return require(process.cwd() + module);
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

module.exports = { CommandBuilder, Handler };