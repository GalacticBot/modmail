const { Collection } = require("discord.js");
const path = require('path');
const fs = require('fs');

class Registry {

    constructor (client) {

        this.client = client;

        this.commands = new Collection();

    }

    find (name) {

        return this.commands.find((c) => c.name === name.toLowerCase() || c.aliases?.includes(name.toLowerCase()));

    }

    loadCommands () {

        const commandsDir = path.join(process.cwd(), 'structure', 'commands');
        const files = fs.readdirSync(commandsDir);

        for (const file of files) {
            
            const commandPath = path.join(commandsDir, file);
            const commandClass = require(commandPath);

            if (typeof commandClass !== 'function') {
                delete require.cache[commandPath];
                continue;
            }

            const command = new commandClass(this.client);
            if (this.commands.has(command.name)) this.client.logger.warn(`Command by name ${command.name} already exists, skipping duplicate at path ${commandPath}`);
            else this.commands.set(command.name, command);

        }

    }

}

module.exports = Registry;