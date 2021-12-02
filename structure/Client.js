const { Client } = require('discord.js');

// eslint-disable-next-line no-unused-vars
const { TextChannel, GuildMember } = require('./extensions');
const { Logger } = require('../logger');
const Modmail = require('./Modmail');
const Registry = require('./Registry');
const Resolver = require('./Resolver');
const Cache = require('./Cache');

class ModmailClient extends Client {

    constructor (options) {

        super(options.clientOptions);

        this._options = options;
        this._ready = false;

        this.prefix = options.prefix;

        this.logger = new Logger(this, options.loggerOptions);
        this.registry = new Registry(this);
        this.resolver = new Resolver(this);
        this.cache = new Cache(this);
        this.modmail = new Modmail(this);

        this.on('ready', () => {
            this.logger.info(`Client ready, logged in as ${this.user.tag}`);
        });

    }

    async init () {

        this.registry.loadCommands();

        this.on('message', this.handleMessage.bind(this));

        this.cache.load();

        this.logger.info(`Logging in`);
        const promise = this.ready();
        await this.login(this._options.discordToken);
        await promise;

        this.mainServer = this.guilds.cache.get(this._options.mainGuild);
        this.bansServer = this.guilds.cache.get(this._options.bansGuild) || null;
        this.logger.info(`Starting up modmail handler`);
        await this.modmail.init();

        process.on('exit', () => {
            this.logger.warn('process exiting');
            this.cache.savePersistentCache();
            this.cache.saveModmailHistory(this.modmail);
        });
        process.on('SIGINT', () => {
            this.logger.warn('received sigint');
            // this.cache.save();
            // this.cache.saveModmailHistory(this.modmail);
            // eslint-disable-next-line no-process-exit
            process.exit();
        });

        process.on('unhandledRejection', (reason, prom) => {
            this.logger.error(`Unhandled promise rejection at: ${prom}\nReason: ${reason}`);
        });

        this._ready = true;
        await this.modmail.reminderChannel.send(`Modmail bot booted and ready.`);

    }

    ready () {

        return new Promise((resolve) => {
            if (this._ready) resolve();
            this.once('ready', resolve);
        });

    }

    async handleMessage (message) {

        if (!this._ready) return;
        if (message.author.bot) return;

        // No command handling in dms, at least for now
        if (!message.guild) try {
            return this.modmail.handleUser(message);
        } catch (err) {
            this.logger.error(`Error during user handle:\n${err.stack}`);
            return;
        }

        const { prefix } = this;
        const { channel, guild, content, member } = message;
        if (![ this.mainServer.id, this.bansServer?.id || '0' ].includes(guild.id)) return;
        if (!content || !content.startsWith(prefix)) return;

        const roles = member.roles.cache.map((r) => r.id);
        if (!roles.some((r) => this._options.staffRoles.includes(r)) && !member.hasPermission('ADMINISTRATOR')) return;

        const [ rawCommand, ...args ] = content.split(' ');
        const commandName = rawCommand.substring(prefix.length);
        const command = this.registry.find(commandName);
        if (!command) return;
        message._caller = commandName;

        if (command.showUsage && !args.length) {

            let helpStr = `**${command.name}**\nUsage: ${this.prefix}${command.name} ${command.usage}`;
            if (command.aliases) helpStr += `\nAliases: ${command.aliases.join(', ')}`;
            return channel.send(helpStr).catch(err => this.logger.error(`Client.handleMessage errored at channel.send:\n${err.stack}`));

        }

        this.logger.debug(`${message.author.tag} is executing command ${command.name}`);
        const clean = message.content.replace(`${this.prefix}${commandName}`, '').trim();
        const result = await command.execute(message, { args: [ ...args ], clean }).catch((err) => {
            this.logger.error(`Command ${command.name} errored during execution:\nARGS: [ "${args.join('", "')}" ]\n${err.stack}`);
            return {
                error: true,
                msg: `Command ${command.name} ran into an error during execution. This has been logged.`
            };
        });

        if (!result) return;
        
        if (result.error) return channel.send(result.msg).catch(err => this.logger.error(`Client.load errored at channel.send:\n${err.stack}`));
        else if (result.response) return channel.send(result.response).catch(err => this.logger.error(`Client.load errored at channel.send:\n${err.stack}`));
        else if (typeof result === 'string') return channel.send(result).catch(err => this.logger.error(`Client.load errored at channel.send:\n${err.stack}`));

    }

    resolveUser (...args) {
        return this.resolver.resolveUser(...args);
    }

    resolveUsers (...args) {
        return this.resolver.resolveUsers(...args);
    }

    resolveChannels (...args) {
        return this.resolver.resolveChannels(...args);
    }

    resolveChannel (...args) {
        return this.resolver.resolveChannel(...args);
    }

    async prompt (str, { author, channel, time }) {

        if (!channel && author) channel = await author.createDM();
        if (!channel) throw new Error(`Missing channel for prompt, must pass at least author.`);
        await channel.send(str).catch(err => this.logger.error(`Client.prompt errored at channel.send:\n${err.stack}`));
        return channel.awaitMessages((m) => m.author.id === author.id, { max: 1, time: time || 30000, errors: [ 'time' ] })
            .then((collected) => {
                return collected.first();
            })
            .catch((error) => { // eslint-disable-line no-unused-vars, handle-callback-err
                return null;
            });

    }

}

module.exports = ModmailClient;