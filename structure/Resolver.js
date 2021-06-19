class Resolver {

    constructor(client) {
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
    async resolveUsers(resolveables = [], strict = false) {

        if (typeof resolveables === 'string') resolveables = [resolveables];
        if (resolveables.length === 0) return false;
        const { users } = this.client;
        const resolved = [];

        for (const resolveable of resolveables) {

            if ((/<@!?([0-9]{17,21})>/u).test(resolveable)) {

                const [, id] = resolveable.match(/<@!?([0-9]{17,21})>/u);
                const user = await users.fetch(id).catch((err) => {
                    if (err.code === 10013) return false;
                    // this.client.logger.warn(err); return false; 

                });
                if (user) resolved.push(user);

            } else if ((/(id:)?([0-9]{17,21})/u).test(resolveable)) {

                const [, , id] = resolveable.match(/(id:)?([0-9]{17,21})/u);
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

    async resolveUser(resolveable, strict) {

        if (!resolveable) return false;
        if (resolveable instanceof Array) throw new Error('Resolveable cannot be of type Array, use resolveUsers for resolving arrays of users');
        const result = await this.resolveUsers([resolveable], strict);
        return result ? result[0] : false;

    }

}

module.exports = Resolver;