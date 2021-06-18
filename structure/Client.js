const { Client } = require('discord.js');

const { Logger } = require('../logger');
const Modmail = require('./Modmail');
const Registry = require('./Registry');

class ModmailClient extends Client {

    constructor(options) {

        super(options.clientOptions);

        this._options = options;
        this._ready = false;

        this.logger = new Logger(this, options.loggerOptions);
        this.modmail = new Modmail(this);
        this.registry = new Registry(this);

        this.on('ready', () => {
            this.logger.info(`Client ready, logged in as ${this.user.tag}`);
        });

    }

    async init() {

        this.logger.info(`Logging in`);
        await this.login(this._options.discordToken);
        this.logger.info(`Starting up modmail`);
        this.modmail.init();
        this.registry.loadCommands();

        this.on('message', this.handleMessage.bind(this));

        this._ready = true;

    }

    async handleMessage(message) {

        if (!message.guild) return this.modmail.handleUser(message);

        const { channel, guild } = message;

    }

}

module.exports = ModmailClient;