class Resolver {

    constructor (client) {
        this.client = client;
    }

    /**
     * Resolve several user resolveables
     *
     * @param {Array<String>} [resolveables=[]] an array of user resolveables (name, id, tag)
     * @param {Boolean} [strict=false] whether or not to attempt resolving by partial usernames
     * @returns {Promise<Array<User>> || boolean} Array of resolved users or false if none were resolved
     * @memberof Resolver
     */
    async resolveUsers (resolveables = [], strict = false) {

        if (typeof resolveables === 'string') resolveables = [ resolveables ];
        if (resolveables.length === 0) return false;
        const { users } = this.client;
        const resolved = [];

        for (const resolveable of resolveables) {

            if ((/<@!?([0-9]{17,21})>/u).test(resolveable)) {

                const [ , id ] = resolveable.match(/<@!?([0-9]{17,21})>/u);
                const user = await users.fetch(id).catch((err) => {
                    if (err.code === 10013) return false;
                    // this.client.logger.warn(err); return false; 

                });
                if (user) resolved.push(user);

            } else if ((/(id:)?([0-9]{17,21})/u).test(resolveable)) {

                const [ , , id ] = resolveable.match(/(id:)?([0-9]{17,21})/u);
                const user = await users.fetch(id).catch((err) => {
                    if (err.code === 10013) return false;
                    // this.client.logger.warn(err); return false; 

                });
                if (user) resolved.push(user);

            } else if ((/^@?([\S\s]{1,32})#([0-9]{4})/u).test(resolveable)) {

                const m = resolveable.match(/^@?([\S\s]{1,32})#([0-9]{4})/u);
                const username = m[1].toLowerCase();
                const discrim = m[2].toLowerCase();
                const user = users.cache.sort((a, b) => a.username.length - b.username.length).filter((u) => u.username.toLowerCase() === username && u.discriminator === discrim).first();
                if (user) resolved.push(user);

            } else if (!strict) {

                const name = resolveable.toLowerCase();
                const user = users.cache.sort((a, b) => a.username.length - b.username.length).filter((u) => u.username.toLowerCase().includes(name)).first();
                if (user) resolved.push(user);

            }

        }

        return resolved.length ? resolved : false;

    }

    async resolveUser (resolveable, strict) {

        if (!resolveable) return false;
        if (resolveable instanceof Array) throw new Error('Resolveable cannot be of type Array, use resolveUsers for resolving arrays of users');
        const result = await this.resolveUsers([ resolveable ], strict);
        return result ? result[0] : false;

    }

    /**
     * Resolve multiple channels
     *
     * @param {Array<String>} [resolveables=[]] an array of channel resolveables (name, id)
     * @param {Guild} guild the guild in which to look for channels
     * @param {Boolean} [strict=false] whether or not partial names are resolved
     * @param {Function} [filter=()] filter the resolving channels
     * @returns {Promise<Array<GuildChannel>> || Promise<Boolean>} an array of guild channels or false if none were resolved
     * @memberof Resolver
     */
    async resolveChannels (resolveables = [], strict = false, guild = null, filter = () => true) {

        if (typeof resolveables === 'string') resolveables = [ resolveables ];
        if (resolveables.length === 0) return false;
        if (!guild) guild = this.client.mainServer;
        const CM = guild.channels;
        const resolved = [];

        for (const resolveable of resolveables) {
            const channel = CM.resolve(resolveable);
            if (channel && filter(channel)) {
                resolved.push(channel);
                continue;
            }

            const name = /^#?([a-z0-9\-_0]+)/iu;
            const id = /^<?#?([0-9]{17,22})>?/iu;

            if (id.test(resolveable)) {
                const match = resolveable.match(id);
                const [ , ch ] = match;

                // eslint-disable-next-line no-shadow
                const channel = await this.client.channels.fetch(ch).catch((e) => { }); // eslint-disable-line no-empty, no-empty-function, no-unused-vars

                if (channel && filter(channel)) resolved.push(channel);

            } else if (name.test(resolveable)) {
                const match = resolveable.match(name);
                const ch = match[1].toLowerCase();

                // eslint-disable-next-line no-shadow
                const channel = CM.cache.sort((a, b) => a.name.length - b.name.length).filter(filter).filter((c) => {
                    if (!strict) return c.name.toLowerCase().includes(ch);
                    return c.name.toLowerCase() === ch;
                }).first();

                if (channel) resolved.push(channel);

            }

        }

        return resolved.length > 0 ? resolved : false;

    }

    async resolveChannel (resolveable, strict, guild, filter) {

        if (!resolveable) return false;
        if (resolveable instanceof Array) throw new Error('Resolveable cannot be of type Array, use resolveChannels for resolving arrays of channels');
        const result = await this.resolveChannels([ resolveable ], strict, guild, filter);
        return result ? result[0] : false;

    }

}

module.exports = Resolver;