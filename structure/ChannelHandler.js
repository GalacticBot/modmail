class ChannelHandler {

    constructor(modmail, opts) {

        this.modmail = modmail;
        this.client = modmail.client;

        this.awaitingChannel = {};

        this.mainServer = null;
        this.bansServer = null;

        this.categories = opts.modmailCategory;
        this.cache = modmail.cache;

        this.graveyardInactive = opts.graveyardInactive;
        this.readInactive = opts.readInactive;
        this.channelSweepInterval = opts.channelSweepInterval;

    }

    init() {

        this.mainServer = this.modmail.mainServer;
        this.bansServer = this.modmail.bansServer;
        
        const { channels } = this.mainServer;
        this.newMail = channels.resolve(this.categories[0]);
        this.readMail = channels.resolve(this.categories[1]);
        this.graveyard = channels.resolve(this.categories[2]);

        // Sweep graveyard every x min and move stale channels to graveyard
        this.sweeper = setInterval(this.sweepChannels.bind(this), this.channelSweepInterval * 60 * 1000);

    }

    async send(target, embed, newEntry) {

        // Load & update the users past modmails
        const history = await this.cache.loadModmailHistory(target.id)
            .catch((err) => {
                this.client.logger.error(`Error during loading of past mail:\n${err.stack}`);
                return { error: true };
            });
        if (history.error) return {
            error: true,
            msg: `Internal error, this has been logged.`
        };
        history.push(newEntry);

        const channel = await this.load(target, history).catch(this.client.logger.error.bind(this.client.logger));
        const sent = await channel.send({ embed }).catch((err) => {
            this.client.logger.error(`channel.send errored:\n${err.stack}\nContent: "${embed}"`);
        });
        await channel.edit({ parentID: this.readMail.id, lockPermissions: true }).catch((err) => {
            this.client.logger.error(`Error during channel transition:\n${err.stack}`);
        });
        
        if (this.cache.queue.includes(target.id)) this.cache.queue.splice(this.cache.queue.indexOf(target.id), 1);
        if (!this.cache.updatedThreads.includes(target.id)) this.cache.updatedThreads.push(target.id);
        if (this.readMail.children.size > 45) this.sweepChannels({ count: 5, force: true });

        return sent;

    }

    async markread(target, channel, staff) {
        
        const history = await this.cache.loadModmailHistory(target)
            .catch((err) => {
                this.client.logger.error(`Error during loading of past mail:\n${err.stack}`);
                return { error: true };
            });
        if (history.error) return {
            error: true,
            msg: `Internal error, this has been logged.`
        };
        history.push({ author: staff.id, timestamp: Date.now(), markread: true }); // To keep track of read state
        
        await channel.edit({ parentID: this.readMail.id, lockPermissions: true });
        if (!this.cache.updatedThreads.includes(target)) this.cache.updatedThreads.push(target);
        if (this.cache.queue.includes(target)) this.cache.queue.splice(this.cache.queue.indexOf(target), 1);
        return {};

    }

    /**
     * Process channels for incoming modmail
     *
     * @param {GuildMember} member
     * @param {string} id
     * @param {Array<object>} history
     * @return {TextChannel} 
     * @memberof ChannelHandler
     */
    load(target, history) {

        if (this.awaitingChannel[target.id]) return this.awaitingChannel[target.id];
        // eslint-disable-next-line no-async-promise-executor
        const promise = new Promise(async (resolve, reject) => {

            const channelID = this.modmail.cache.channels[target.id];
            const guild = this.mainServer;
            const user = target.user || target;
            const member = target.user ? target : null;
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
                if (member && member.banned) embed.description = `**__USER IS IN BANLAND__**`;
                else if (member) embed.fields.push({
                    name: '__Member Data__',
                    value: `**Nickname:** ${member.nickname || 'N/A'}\n` +
                        `**Server join date:** ${member.joinedAt.toDateString()}\n` +
                        `**Roles:** ${member.roles.cache.filter((r) => r.id !== guild.roles.everyone.id).map((r) => `<@&${r.id}>`).join(' ')}`,
                    inline: false
                });

                await channel.send({ embed });

                // Load in context
                const len = history.length;
                for (let i = context < len ? context : len; i > 0; i--) {
                    const entry = history[len - i];
                    if (!entry) continue;
                    if (entry.markread) continue;

                    const user = await this.client.resolveUser(entry.author).catch(this.client.logger.error.bind(this.client.logger));
                    const mem = await this.modmail.getMember(user.id).catch(this.client.logger.error.bind(this.client.logger));
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

                this.modmail.cache.channels[user.id] = channel.id;

            }

            // Ensure the right category
            //if (channel.parentID !== this.newMail.id)
            await channel.edit({ parentID: this.newMail.id, lockPermissions: true }).catch((err) => {
                this.client.logger.error(`Error during channel transition:\n${err.stack}`);
            });
            delete this.awaitingChannel[user.id];
            resolve(channel);

        });

        this.awaitingChannel[target.id] = promise;
        return promise;

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
        if (!age) age = this.graveyardInactive * 60 * 1000;
        for (const channel of graveyardChannels) {

            const { lastMessage } = channel;
            if (!lastMessage || now - lastMessage.createdTimestamp > age || count && channelCount <= count) {
                await channel.delete().then((ch) => {
                    const chCache = this.cache.channels;
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

}

module.exports = ChannelHandler;