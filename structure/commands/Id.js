const Command = require('../Command');

class ModmailID extends Command {

    constructor (client) {
        super(client, {
            name: 'id',
            aliases: [ 'mmid' ]
        });
    }

    async execute (message, { args }) {

        let channel = null;
        if (args?.length) {
            const [ ch ] = args;
            channel = await this.client.resolveChannel(ch);
        } else {
            ({ channel } = message);
        }

        const chCache = this.client.cache.channels;
        const result = Object.entries(chCache).find(([ , val ]) => {
            return val === channel.id;
        });

        if (!result) return {
            error: true,
            msg: `This doesn't seem to be a valid modmail channel. Cache might be out of sync. **[MISSING TARGET]**`
        };

        const [ userId ] = result;
        return userId;

    }

}

module.exports = ModmailID;