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
        if (args?.length) channel = await this.client.resolveChannel(args[0]);
        else ({ channel } = message);

        const result = this.client.getUserFromChannel(channel);
        if (result.error) return result;

        const [ userId ] = result;
        return userId;

    }

}

module.exports = ModmailID;