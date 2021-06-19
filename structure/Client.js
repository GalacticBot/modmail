const { Client } = require('discord.js');
const fs = require('fs');

// eslint-disable-next-line no-unused-vars
const { TextChannel, GuildMember } = require('./extensions');
const { Logger } = require('../logger');
const Modmail = require('./Modmail');
const Registry = require('./Registry');
const Resolver = require('./Resolver');

class ModmailClient extends Client {

    constructor(options) {

        super(options.clientOptions);

        this._options = options;
        this._ready = false;

        this.prefix = options.prefix;

        this.logger = new Logger(this, options.loggerOptions);
        this.modmail = new Modmail(this);
        this.registry = new Registry(this);
        this.resolver = new Resolver(this);

        this.on('ready', () => {
            this.logger.info(`Client ready, logged in as ${this.user.tag}`);
        });

        this.cache = null;

    }

    async init() {

        this.registry.loadCommands();

        this.on('message', this.handleMessage.bind(this));

        if (fs.existsSync('./persistent_cache.json')) {
            this.logger.info('Loading cache');
            this.cache = JSON.parse(fs.readFileSync('./persistent_cache.json', { encoding: 'utf-8' }));
        } else {
            this.logger.info('Cache file missing, creating...');
            this.cache = {};
            this.saveCache();
        }

        this.logger.info(`Logging in`);
        await this.login(this._options.discordToken);
        await this.ready();

        this.mainServer = this.guilds.cache.get(this._options.mainGuild);
        this.bansServer = this.guilds.cache.get(this._options.bansGuild) || null;
        this.logger.info(`Starting up modmail handler`);
        this.modmail.init();

        process.on('exit', this.saveCache.bind(this));
        process.on('SIGINT', () => {
            this.saveCache.bind(this);
            // eslint-disable-next-line no-process-exit
            process.exit();
        });

        this._ready = true;

        this.cacheSaver = setInterval(this.saveCache.bind(this), 1 * 60 * 1000);

    }

    saveCache() {
        this.logger.debug('Saving cache');
        delete this.cache._channels;
        fs.writeFileSync('./persistent_cache.json', JSON.stringify(this.cache));
    }

    ready() {

        return new Promise((resolve) => {
            if (this._ready) resolve();
            this.once('ready', resolve);
        });

    }

    async handleMessage(message) {

        if (!this._ready) return;
        if (message.author.bot) return;

        // No command handling in dms, at least for now
        if (!message.guild) return this.modmail.handleUser(message);

        const { prefix } = this;
        const { channel, guild, content, member } = message;
        if (guild.id !== this.mainServer.id) return;
        if (!content || !content.startsWith(prefix)) return;

        const roles = member.roles.cache.map((r) => r.id);
        if(!roles.some((r) => this._options.staffRoles.includes(r)) && !member.hasPermission('ADMINISTRATOR')) return;

        const [rawCommand, ...args] = content.split(' ');
        const commandName = rawCommand.substring(prefix.length).toLowerCase();
        const command = this.registry.find(commandName);
        if (!command) return;
        message._caller = commandName;

        if (command.showUsage && !args.length) {

            let helpStr = `**${command.name}**\nUsage: ${this.prefix}${command.name} ${command.usage}`;
            if (command.aliases) helpStr += `\nAliases: ${command.aliases.join(', ')}`;
            return channel.send(helpStr).catch(this.logger.error.bind(this.logger));

        }

        this.logger.debug(`Executing command ${command.name}`);
        const result = await command.execute(message, args).catch((err) => {
            this.logger.error(`Command ${command.name} errored during execution:\n${err.stack}`);
            return {
                error: true,
                msg: `Command ${command.name} ran into an error during execution. This has been logged.`
            };
        });

        if (!result) return;
        
        if (result.error) return channel.send(result.msg).catch(this.logger.error.bind(this.logger));
        else if (result.response) return channel.send(result.response).catch(this.logger.error.bind(this.logger));
        else if (typeof result === 'string') return channel.send(result).catch(this.logger.error.bind(this.logger));

    }

    resolveUser(input) {
        return this.resolver.resolveUser(input);
    }

    async prompt(str, { author, channel, time }) {

        if (!channel && author) channel = await author.createDM();
        if (!channel) throw new Error(`Missing channel for prompt, must pass at least author.`);
        await channel.send(str);
        return channel.awaitMessages((m) => m.author.id === author.id, { max: 1, time: time || 30000, errors: ['time'] })
            .then((collected) => {
                return collected.first();
            })
            .catch((error) => { //eslint-disable-line no-unused-vars, handle-callback-err
                return null;
            });

    }

}

module.exports = ModmailClient;