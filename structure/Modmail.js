const fs = require('fs');
const ChannelHandler = require('./ChannelHandler');

class Modmail {

    // A lot of this can probably be simplified but I wrote all of this in 2 days and I cba to fix this atm
    // TODO: Fix everything

    constructor(client) {

        this.client = client;
        this.cache = client.cache;
        this.mainServer = null;
        this.bansServer = null;
        this.logChannel = null;
        this.reminderChannel = null;

        const opts = client._options;

        this.anonColor = opts.anonColor;
        this.reminderInterval = opts.modmailReminderInterval || 30;
        this._reminderChannel = opts.modmailReminderChannel || null;
        this._logChannel = opts.logChannel || null;
        this.categories = opts.modmailCategory;

        this.updatedThreads = [];
        this.queue = [];
        this.spammers = {};
        this.replies = {};

        this.lastReminder = null;

        this.channels = new ChannelHandler(this, opts);
        this._ready = false;

    }

    init() {

        this.mainServer = this.client.mainServer;
        if (!this.mainServer) throw new Error(`Missing main server`);
        
        this.bansServer = this.client.bansServer;
        if (!this.bansServer) this.client.logger.warn(`Missing bans server`);

        if (!this.anonColor) this.anonColor = this.mainServer.me.highestRoleColor;

        this.replies = this.loadReplies();
        this.queue = this.client.cache.queue;

        if (this._reminderChannel) {
            this.reminderChannel = this.client.channels.resolve(this._reminderChannel);
            this.reminder = setInterval(this.sendReminder.bind(this), this.reminderInterval * 60 * 1000);
            this.sendReminder();
        }

        if (this._logChannel) {
            this.logChannel = this.client.channels.resolve(this._logChannel);
        }

        let logStr = `Started modmail handler for ${this.mainServer.name}`;
        if (this.bansServer) logStr += ` with ${this.bansServer.name} for ban appeals`;
        this.client.logger.info(logStr);
        //this.client.logger.info(`Fetching messages from discord for modmail`);
        // TODO: Fetch messages from discord in modmail channels

        this.channels.init();
        this._ready = true;

    }

    async getMember(user) {

        let result = this.mainServer.members.cache.get(user);
        if(!result) result = await this.mainServer.members.fetch(user).catch(() => {
            return null;
        });

        if (!result && this.bansServer) {
            result = this.bansServer.members.cache.get(user);
            if(!result) result = await this.bansServer.members.fetch(user).catch(() => {
                return null;
            });
            if (result) result.inAppealServer = true;
        }

        return result;

    }

    async getUser(user) {

        let result = this.client.users.cache.get(user);
        if (!result) result = await this.client.users.fetch(user).catch(() => {
            return null;
        });
        return result;

    }

    async handleUser(message) {

        const { author, content } = message;
        const member = await this.getMember(author.id);
        if (!member) return; // No member object found in main or bans server?

        const now = Math.floor(Date.now() / 1000);
        const lastActivity = this.client.cache.lastActivity[author.id];
        //console.log(now - lastActivity, lastActivity, now)
        if (!lastActivity || now - lastActivity > 30 * 60) {
            await author.send(`Thank you for your message, we'll get back to you soon!`);
        }
        this.client.cache.lastActivity[author.id] = now;

        const { cache } = this.client;

        // Anti spam
        if (!this.spammers[author.id]) this.spammers[author.id] = { start: now, count: 1, timeout: false, warned: false };
        else {
            if (this.spammers[author.id].timeout) {
                if (now - this.spammers[author.id].start > 5 * 60) this.spammers[author.id] = { start: now, count: 1, timeout: false, warned: false };
                else return;
            } else if (this.spammers[author.id].count > 5 && now - this.spammers[author.id].start < 15) {
                this.spammers[author.id].timeout = true;
                if (!this.spammers[author.id].warned) {
                    this.spammers[author.id].warned = true;
                    await author.send(`I've blocked you for spamming, please try again in 5 minutes`);
                    if (cache._channels[author.id]) await cache._channels[author.id].send(`I've blocked ${author.tag} from DMing me as they were spamming.`);
                }
            } else {
                if (now - this.spammers[author.id].start > 15) this.spammers[author.id] = { start: now, count: 1, timeout: false, warned: false };
                else this.spammers[author.id].count++;
            }
        }

        const pastModmail = await this.cache.loadModmailHistory(author.id)
            .catch((err) => {
                this.client.logger.error(`Error during loading of past mail:\n${err.stack}`);
                return { error: true };
            });
        if (pastModmail.error) return author.send(`Internal error, this has been logged.`);
        
        const channel = await this.channels.load(member, pastModmail)
            .catch((err) => {
                this.client.logger.error(`Error during channel handling:\n${err.stack}`);
                return { error: true };
            });
        if (channel.error) return author.send(`Internal error, this has been logged.`);
        if (!cache._channels) cache._channels = {};
        cache._channels[author.id] = channel;

        const embed = {
            footer: {
                text: member.id
            },
            author: {
                name: member.user.tag,
                // eslint-disable-next-line camelcase
                icon_url: member.user.displayAvatarURL({ dynamic: true })
            },
            // eslint-disable-next-line no-nested-ternary
            description: content && content.length ? content.length > 2000 ? `${content.substring(0, 2000)}...\n\n**Content cut off**` : content : `**__MISSING CONTENT__**`,
            color: member.highestRoleColor,
            fields: [],
            timestamp: new Date()
        };

        const attachments = message.attachments.map((att) => att.url);
        if (message.attachments.size) {
            embed.fields.push({
                name: '__Attachments__',
                value: attachments.join('\n').substring(0, 1000)
            });
        }

        pastModmail.push({ attachments, author: author.id, content, timestamp: Date.now(), isReply: false });
        if (!this.updatedThreads.includes(author.id)) this.updatedThreads.push(author.id);
        if (!this.queue.includes(author.id)) this.queue.push(author.id);
        

        this.log({ author, action: `${author.tag} (${author.id}) sent new modmail`, content });

        await channel.send({ embed }).catch((err) => {
            this.client.logger.error(`channel.send errored:\n${err.stack}\nContent: "${content}"`);
        });

    }

    async sendCannedResponse({ message, responseName, anon }) {

        const content = this.getCanned(responseName);
        if (!content) return {
            error: true,
            msg: `No canned reply by the name \`${responseName}\` exists`
        };

        return this.sendResponse({ message, content, anon });

    }

    // Send reply from channel
    async sendResponse({ message, content, anon }) {

        const { channel, member, author } = message;
        if (!this.categories.includes(channel.parentID)) return {
            error: true,
            msg: `This command only works in modmail channels.`
        };

        // Resolve target user from cache
        const chCache = this.cache.channels;
        const result = Object.entries(chCache).find(([, val]) => {
            return val === channel.id;
        });

        if (!result) return {
            error: true,
            msg: `This doesn't seem to be a valid modmail channel. Cache might be out of sync. **[MISSING TARGET]**`
        };

        // Ensure target exists, this should never run into issues
        const [userId] = result;
        const targetMember = await this.getMember(userId);
        if (!targetMember) return {
            error: true,
            msg: `User seems to have left.\nReport this if the user is still present.`
        };

        this.log({ author, action: `${author.tag} replied to ${targetMember.user.tag}`, content, target: targetMember.user });
        await message.delete().catch(this.client.logger.warn.bind(this.client.logger));
        return this.send({ target: targetMember, staff: member, content, anon });

    }

    // Send modmail with the modmail command
    async sendModmail({ message, content, anon, target }) {

        const targetMember = await this.getMember(target.id);
        if (!targetMember) return {
            error: true,
            msg: `Cannot find member.`
        };

        const { member: staff, author } = message;

        // Send to channel in server & target
        const sent = await this.send({ target: targetMember, staff, anon, content });
        if (sent.error) return sent;

        // Inline response
        await message.channel.send('Delivered.').catch(this.client.logger.error.bind(this.client.logger));
        this.log({ author, action: `${author.tag} sent a message to ${targetMember.user.tag}`, content, target: targetMember.user });

        

    }

    async send({ target, staff, anon, content }) {

        const embed = {
            author: {
                name: anon ? `${this.mainServer.name.toUpperCase()} STAFF` : staff.user.tag,
                // eslint-disable-next-line camelcase
                icon_url: anon ? this.mainServer.iconURL({ dynamic: true }) : staff.user.displayAvatarURL({ dynamic: true })
            },
            description: content,
            color: anon ? this.anonColor : staff.highestRoleColor
        };

        // Dm the user
        const sent = await target.send({ embed }).catch((err) => {
            this.client.logger.warn(`Error during DMing user: ${err.message}`);
            return {
                error: true,
                msg: `Failed to send message to target.`
            };
        });
        if (sent.error) return sent;

        if (anon) embed.author = {
            name: `${staff.user.tag} (ANON)`,
            // eslint-disable-next-line camelcase
            icon_url: staff.user.displayAvatarURL({ dynamic: true })
        };

        return this.channels.send(target, embed, { author: staff.id, content, timestamp: Date.now(), isReply: true, anon });

    }

    async markread(message, args) {

        const { author } = message;

        if (!this.categories.includes(message.channel.parentID) && !args.length) return {
            error: true,
            msg: `This command only works in modmail channels without arguments.`
        };

        let response = null,
            user = null;

        if (args.length) {

            // Eventually support marking several threads read at the same time
            const [id] = args;
            user = await this.client.resolveUser(id, true);
            let channel = await this.client.resolveChannel(id);

            if (channel) {

                const chCache = this.cache.channels;
                const result = Object.entries(chCache).find(([, val]) => {
                    return val === channel.id;
                });

                if (!result) return {
                    error: true,
                    msg: `That doesn't seem to be a valid modmail channel. Cache might be out of sync. **[MISSING TARGET]**`
                };
                    
                user = await this.client.resolveUser(result[0]);
                response = await this.channels.markread(user.id, channel, author);
                
            } else if (user) {

                const _ch = this.cache.channels[user.id];
                if (_ch) channel = await this.client.resolveChannel(_ch);

                response = await this.channels.markread(user.id, channel, author);
                
            } else return `Could not resolve ${id} to a target.`;

        }

        if (!response) {
            const { channel } = message;
            const chCache = this.cache.channels;
            const result = Object.entries(chCache).find(([, val]) => {
                return val === channel.id;
            });

            if (!result) return {
                error: true,
                msg: `This doesn't seem to be a valid modmail channel. Cache might be out of sync. **[MISSING TARGET]**`
            };

            const [userId] = result;
            user = await this.getUser(userId);
            response = await this.channels.markread(userId, channel, author);
        }

        
        if (response.error) return response;
        this.log({ author, action: `${author.tag} marked ${user.tag}'s thread as read`, target: user });
        return 'Done';

    }

    async sendReminder() {

        const channel = this.reminderChannel;
        const amount = this.queue.length;

        if (!amount) {
            if (this.lastReminder) {
                await this.lastReminder.delete();
                this.lastReminder = null;
            }
            return;
        }

        const str = `${amount} modmail in queue.`;
        this.client.logger.debug(`Sending modmail reminder, #mm: ${amount}`);
        if (this.lastReminder) {
            if (channel.lastMessage.id === this.lastReminder.id) return this.lastReminder.edit(str);
            await this.lastReminder.delete();
        }
        this.lastReminder = await channel.send(str);

    }

    async log({ author, content, action, target }) {
        
        const embed = {
            author: {
                name: action,
                // eslint-disable-next-line camelcase
                icon_url: author.displayAvatarURL({ dynamic: true })
            },
            description: content ? `\`\`\`${content}\`\`\`` : '',
            color: this.mainServer.me.highestRoleColor
        };
        if (target) {
            embed.footer = {
                text: `Staff: ${author.id} | Target: ${target.id}`
            };
        }

        this.logChannel.send({ embed }).catch(this.client.logger.error.bind(this.client.logger));

    }

    getCanned(name) {
        return this.replies[name.toLowerCase()];
    }

    loadReplies() {

        this.client.logger.info('Loading canned replies');
        if (!fs.existsSync('./canned_replies.json')) return {};
        return JSON.parse(fs.readFileSync('./canned_replies.json', { encoding: 'utf-8' }));

    }

    saveReplies() {

        this.client.logger.info('Saving canned replies');
        fs.writeFileSync('./canned_replies.json', JSON.stringify(this.replies));

    }

}

module.exports = Modmail;