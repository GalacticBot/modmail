const fs = require('fs');

class Modmail {

    // A lot of this can probably be simplified but I wrote all of this in 2 days and I cba to fix this atm
    // TODO: Fix everything

    constructor(client) {

        this.client = client;
        this.mainServer = null;
        this.bansServer = null;

        const opts = client._options;

        this.categories = opts.modmailCategory;
        this.graveyardInactive = opts.graveyardInactive;
        this.readInactive = opts.readInactive;
        this.channelSweepInterval = opts.channelSweepInterval;
        this.saveInterval = opts.saveInterval;
        this.anonColor = opts.anonColor;
        this.reminderInterval = opts.modmailReminderInterval || 30;
        this._reminderChannel = opts.modmailReminderChannel || null;
        this.reminderChannel = null;

        this.updatedThreads = [];
        this.queue = [];
        this.mmcache = {};
        this.spammers = {};
        this.replies = {};
        this.awaitingChannel = {};

        this.lastReminder = null;

    }

    init() {

        this.mainServer = this.client.mainServer;
        if (!this.mainServer) throw new Error(`Missing main server`);
        
        this.bansServer = this.client.bansServer;
        if (!this.bansServer) this.client.logger.warn(`Missing bans server`);

        if (!this.anonColor) this.anonColor = this.mainServer.me.highestRoleColor;
        
        const { channels } = this.mainServer;
        this.newMail = channels.resolve(this.categories[0]);
        this.readMail = channels.resolve(this.categories[1]);
        this.graveyard = channels.resolve(this.categories[2]);

        this.replies = this.loadReplies();
        this.queue = this.client.cache.queue || [];
        if (this._reminderChannel) {
            this.reminderChannel = this.client.channels.resolve(this._reminderChannel);
            this.reminder = setInterval(this.sendReminder.bind(this), this.reminderInterval * 60 * 1000);
        }

        // Sweep graveyard every 30 min and move stale channels to graveyard
        this.sweeper = setInterval(this.sweepChannels.bind(this), this.channelSweepInterval * 60 * 1000);
        this.saver = setInterval(this.saveHistory.bind(this), this.saveInterval * 60 * 1000);

        let logStr = `Started modmail handler for ${this.mainServer.name}`;
        if (this.bansServer) logStr += ` with ${this.bansServer.name} for ban appeals`;
        this.client.logger.info(logStr);
        //this.client.logger.info(`Fetching messages from discord for modmail`);
        // TODO: Fetch messages from discord in modmail channels

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
            if (result) result.banned = true;
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
        if (!this.client.cache.lastActivity) this.client.cache.lastActivity = {};
        const lastActivity = this.client.cache.lastActivity[author.id];
        //console.log(now - lastActivity, lastActivity, now)
        if (!lastActivity || now - lastActivity > 30 * 60) {
            await author.send(`Thank you for your message, we'll get back to you soon!`);
        }
        this.client.cache.lastActivity[author.id] = now;

        const { cache } = this.client;
        if (!cache.channels) cache.channels = {};

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

        const pastModmail = await this.loadHistory(author.id)
            .catch((err) => {
                this.client.logger.error(`Error during loading of past mail:\n${err.stack}`);
                return { error: true };
            });
        if (pastModmail.error) return author.send(`Internal error, this has been logged.`);
        
        const channel = await this.loadChannel(member, pastModmail)
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
        this.queue.push(author.id);

        await channel.send({ embed }).catch((err) => {
            this.client.logger.error(`channel.send errored:\n${err.stack}\nContent: "${content}"`);
        });

    }

    /**
     * Process channels for incoming modmail
     *
     * @param {GuildMember} member
     * @param {string} id
     * @param {Array<object>} history
     * @return {TextChannel} 
     * @memberof Modmail
     */
    loadChannel(member, history) {

        if (this.awaitingChannel[member.id]) return this.awaitingChannel[member.id];
        // eslint-disable-next-line no-async-promise-executor
        const promise = new Promise(async (resolve, reject) => {

            const channelID = this.client.cache.channels[member.id];
            const guild = this.mainServer;
            const { user } = member;
            let channel = guild.channels.resolve(channelID);
            const { context } = this.client._options;

            if (this.newMail.children.size >= 45) this.overflow();

            if (!channel) { // Create and populate channel
                channel = await guild.channels.create(`${user.username}_${user.discriminator}`, {
                    parent: this.newMail.id
                });

                // Start with user info embed
                const embed = {
                    author: { name: user.tag },
                    thumbnail: {
                        url: user.displayAvatarURL({ dynamic: true })
                    },
                    fields: [
                        {
                            name: '__User Data__',
                            value: `**User:** <@${user.id}>\n` +
                                `**Account created:** ${user.createdAt.toDateString()}\n`,
                            inline: false
                        }
                    ],
                    footer: { text: `• User ID: ${user.id}` },
                    color: guild.me.highestRoleColor
                };
                if (member.banned) embed.description = `**__USER IS IN BANLAND__**`;
                else embed.fields.push({
                    name: '__Member Data__',
                    value: `**Nickname:** ${member.nickname || 'N/A'}\n` +
                        `**Server join date:** ${member.joinedAt.toDateString()}\n` +
                        `**Roles:** ${member.roles.cache.map((r) => `<@&${r.id}>`).join(' ')}`,
                    inline: false
                });
                await channel.send({ embed });

                // Load in context
                const len = history.length;
                for (let i = context < len ? context : len; i > 0; i--) {
                    const entry = history[len - i];
                    if (!entry) continue;
                    if (entry.markread) {
                        i++;
                        continue;
                    }

                    const user = await this.client.resolveUser(entry.author).catch(this.client.logger.error.bind(this.client.logger));
                    const mem = await this.getMember(user.id).catch(this.client.logger.error.bind(this.client.logger));
                    if (!user) return reject(new Error(`Failed to find user`));

                    const embed = {
                        footer: {
                            text: user.id
                        },
                        author: {
                            name: user.tag + (entry.anon ? ' (ANONYMOUS REPLY)' : ''),
                            // eslint-disable-next-line camelcase
                            icon_url: user.displayAvatarURL({ dynamic: true })
                        },
                        description: entry.content,
                        color: mem?.highestRoleColor || 0,
                        fields: [],
                        timestamp: new Date(entry.timestamp)
                    };

                    if (entry.attachments && entry.attachments.length) embed.fields.push({
                        name: '__Attachments__',
                        value: entry.attachments.join('\n').substring(0, 1000)
                    });

                    await channel.send({ embed });
                    
                }

                this.client.cache.channels[user.id] = channel.id;

            }

            // Ensure the right category
            //if (channel.parentID !== this.newMail.id)
            await channel.edit({ parentID: this.newMail.id, lockPermissions: true }).catch((err) => {
                this.client.logger.error(`Error during channel transition:\n${err.stack}`);
            });
            delete this.awaitingChannel[user.id];
            resolve(channel);

        });

        this.awaitingChannel[member.id] = promise;
        return promise;

    }

    async sendCannedResponse({ message, responseName, anon }) {

        const content = this.getCanned(responseName);
        if (!content) return {
            error: true,
            msg: `No canned reply by the name \`${responseName}\` exists`
        };

        return this.sendResponse({ message, content, anon });

    }

    async sendResponse({ message, content, anon }) {

        const { channel, member, author } = message;
        if (!this.categories.includes(channel.parentID)) return {
            error: true,
            msg: `This command only works in modmail channels.`
        };

        const chCache = this.client.cache.channels;
        const result = Object.entries(chCache).find(([, val]) => {
            return val === channel.id;
        });

        if (!result) return {
            error: true,
            msg: `This doesn't seem to be a valid modmail channel. Cache might be out of sync. **[MISSING TARGET]**`
        };

        const [userId] = result;
        const targetUser = await this.getUser(userId);
        //const targetMember = await this.getMember(userId);

        if (!targetUser) return {
            error: true,
            msg: `User seems to have left.\nReport this if the user is still present.`
        };

        const history = await this.loadHistory(userId);
        history.push({ author: member.id, content, timestamp: Date.now(), isReply: true, anon });
        if (this.queue.includes(userId)) this.queue.splice(this.queue.indexOf(userId), 1);

        const embed = {
            author: {
                name: anon ? `${this.mainServer.name.toUpperCase()} STAFF` : author.tag,
                // eslint-disable-next-line camelcase
                icon_url: anon ? this.mainServer.iconURL({ dynamic: true }) : author.displayAvatarURL({ dynamic: true })
            },
            description: content,
            color: anon ? this.anonColor : member.highestRoleColor
        };

        const sent = await targetUser.send({ embed }).catch((err) => {
            this.client.logger.warn(`Error during DMing user: ${err.message}`);
            return {
                error: true,
                msg: `Failed to send message to target.`
            };
        });

        if (sent.error) return sent;

        if (anon) embed.author = {
            name: `${author.tag} (ANON)`,
            // eslint-disable-next-line camelcase
            icon_url: author.displayAvatarURL({ dynamic: true })
        };
        await channel.send({ embed }).catch((err) => {
            this.client.logger.error(`channel.send errored:\n${err.stack}\nContent: "${content}"`);
        });

        if (this.readMail.children.size > 45) this.sweepChannels({ count: 5, force: true });
        await channel.edit({ parentID: this.readMail.id, lockPermissions: true }).catch((err) => {
            this.client.logger.error(`Error during channel transition:\n${err.stack}`);
        });
        await message.delete().catch(this.client.logger.warn.bind(this.client.logger));
        if (!this.updatedThreads.includes(userId)) this.updatedThreads.push(userId);

    }

    async sendModmail({ message, content, anon, target }) {

        const targetMember = await this.getMember(target.id);
        if (!targetMember) return {
            error: true,
            msg: `Cannot find member`
        };

        const history = await this.loadHistory(target.id)
            .catch((err) => {
                this.client.logger.error(`Error during loading of past mail:\n${err.stack}`);
                return { error: true };
            });
        if (history.error) return {
            error: true,
            msg: `Internal error, this has been logged.`
        };

        const { author, member } = message;

        const embed = {
            author: {
                name: anon ? `${this.mainServer.name.toUpperCase()} STAFF` : author.tag,
                // eslint-disable-next-line camelcase
                icon_url: anon ? this.mainServer.iconURL({ dynamic: true }) : author.displayAvatarURL({ dynamic: true })
            },
            description: content,
            color: anon ? this.anonColor : member.highestRoleColor
        };

        const sent = await target.send({ embed }).catch((err) => {
            this.client.logger.warn(`Error during DMing user: ${err.message}`);
            return {
                error: true,
                msg: `Failed to send message to target.`
            };
        });
        if (sent.error) return sent;

        await message.channel.send('Delivered.').catch(this.client.logger.error.bind(this.client.logger));
        const channel = await this.loadChannel(targetMember, history).catch(this.client.logger.error.bind(this.client.logger));
        history.push({ author: member.id, content, timestamp: Date.now(), isReply: true, anon });
        if (this.queue.includes(target.id)) this.queue.splice(this.queue.indexOf(target.id), 1);
        if (!this.updatedThreads.includes(target.id)) this.updatedThreads.push(target.id);
        await channel.send({ embed }).catch(this.client.logger.error.bind(this.client.logger));
        await channel.edit({ parentID: this.readMail.id, lockPermissions: true }).catch(this.client.logger.error.bind(this.client.logger));

    }

    /**
     *
     *
     * @param {object} { age, count, force } age: how long the channel has to be without activity to be deleted, count: how many channels to act on, force: whether to ignore answered status
     * @memberof Modmail
     */
    async sweepChannels({ age, count, force = false } = {}) {

        this.client.logger.info(`Sweeping graveyard`);
        const now = Date.now();
        const graveyardChannels = this.graveyard.children.sort((a, b) => {
            if (!a.lastMessage) return -1;
            if (!b.lastMessage) return 1;
            return a.lastMessage.createdTimestamp - b.lastMessage.createdTimestamp;
        }).array();

        let channelCount = 0;
        if (!age) age = this.graveyardInactive * 60 * 1000; // 1 hour
        for (const channel of graveyardChannels) {
            
            const { lastMessage } = channel;
            if (!lastMessage || now - lastMessage.createdTimestamp > age || count && channelCount <= count) {
                await channel.delete().then((ch) => {
                    const chCache = this.client.cache.channels;
                    const _cached = Object.entries(chCache).find(([, val]) => {
                        return val === ch.id;
                    });
                    if (_cached) {
                        const [userId] = _cached;
                        delete chCache[userId];
                    }
                }).catch((err) => {
                    this.client.logger.error(`Failed to delete channel from graveyard during sweep:\n${err.stack}`);
                });
                channelCount++;
            }

        }

        this.client.logger.info(`Swept ${channelCount} channels from graveyard, cleaning up answered...`);

        const answered = this.readMail.children
            .filter((channel) => !channel.lastMessage || channel.lastMessage.createdTimestamp < Date.now() - this.readInactive * 60 * 1000 || force)
            .sort((a, b) => {
                if (!a.lastMessage) return -1;
                if (!b.lastMessage) return 1;
                return a.lastMessage.createdTimestamp - b.lastMessage.createdTimestamp;
            }).array();
        let chCount = this.graveyard.children.size;
        for (const ch of answered) {
            if (chCount < 50) {
                await ch.edit({ parentID: this.graveyard.id, lockPermissions: true }).catch((err) => {
                    this.client.logger.error(`Failed to move channel to graveyard during sweep:\n${err.stack}`);
                });
                chCount++;
            } else break;
        }

        this.client.logger.info(`Sweep done. Took ${Date.now() - now}ms`);

    }

    async overflow() { // Overflows new modmail category into read 
        const channels = this.newMail.children.sort((a, b) => {
            if (!a.lastMessage) return -1;
            if (!b.lastMessage) return 1;
            return a.lastMessage.createdTimestamp - b.lastMessage.createdTimestamp;
        }).array();

        if (this.readMail.children.size >= 45) await this.sweepChannels({ count: 5, force: true });

        let counter = 0;
        for (const channel of channels) {
            await channel.edit({ parentID: this.readMail.id, lockPermissions: true });
            counter++;
            if (counter === 5) break;
        }
    }

    async markread(message) {

        const { channel, author } = message;

        if (!this.categories.includes(channel.parentID)) return {
            error: true,
            msg: `This command only works in modmail channels.`
        };

        const chCache = this.client.cache.channels;
        const result = Object.entries(chCache).find(([, val]) => {
            return val === channel.id;
        });

        if (!result) return {
            error: true,
            msg: `This doesn't seem to be a valid modmail channel. Cache might be out of sync. **[MISSING TARGET]**`
        };

        const [userId] = result;
        const history = await this.loadHistory(userId)
            .catch((err) => {
                this.client.logger.error(`Error during loading of past mail:\n${err.stack}`);
                return { error: true };
            });
        if (history.error) return {
            error: true,
            msg: `Internal error, this has been logged.`
        };
        history.push({ author: author.id, timestamp: Date.now(), markread: true }); // To keep track of read state
        if (this.queue.includes(userId)) this.queue.splice(this.queue.indexOf(userId), 1);

        await channel.edit({ parentID: this.readMail.id, lockPermissions: true });
        if (!this.updatedThreads.includes(author.id)) this.updatedThreads.push(userId);
        return `Done`;

    }

    async sendReminder() {

        const channel = this.reminderChannel;
        const amount = this.queue.length;
        let str = '';

        if (!amount) str = 'No modmail in queue';
        else str = `${amount} modmail in queue.`;

        if (this.lastReminder) {
            if (channel.lastMessage.id === this.lastReminder.id) return this.lastReminder.edit(str);
            await this.lastReminder.delete();
        } else this.lastReminder = await channel.send(str);

    }

    loadHistory(userId) {

        return new Promise((resolve, reject) => {
            
            if (this.mmcache[userId]) return resolve(this.mmcache[userId]);

            const path = `./modmail_cache/${userId}.json`;
            if (!fs.existsSync(path)) {
                this.mmcache[userId] = [];
                return resolve(this.mmcache[userId]);
            }

            fs.readFile(path, { encoding: 'utf-8' }, (err, data) => {
                if (err) reject(err);
                const parsed = JSON.parse(data);
                this.mmcache[userId] = parsed;
                resolve(parsed);
            });

        });

    }

    saveHistory() {

        if (!this.updatedThreads.length) return;
        const toSave = [...this.updatedThreads];
        this.updatedThreads = [];
        this.client.logger.debug(`Saving modmail data`);
        if (!fs.existsSync('./modmail_cache')) fs.mkdirSync('./modmail_cache');

        for (const id of toSave) {
            const path = `./modmail_cache/${id}.json`;
            try {
                fs.writeFileSync(path, JSON.stringify(this.mmcache[id]));
            } catch (err) {
                this.client.logger.error(`Error during saving of history\n${id}\n${JSON.stringify(this.mmcache)}\n${err.stack}`);
            }
        }

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