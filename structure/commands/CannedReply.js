const Command = require('../Command');

class CannedReply extends Command {

    constructor(client) {
        super(client, {
            name: 'cannedreply',
            aliases: ['cr', 'canned'],
            showUsage: true,
            usage: `<canned response name>`
        });
    }

    async execute(message, args) {

        const [first] = args.map((a) => a);
        // eslint-disable-next-line prefer-const
        let { content, _caller } = message,
            anon = false;
        content = content.replace(`${this.client.prefix}${_caller}`, '');
        if (first.toLowerCase() === 'anon') {
            anon = true;
            content = content.replace(first, '');
        }
        return this.client.modmail.sendCannedResponse({ message, responseName: content.trim(), anon });

    }

}

module.exports = CannedReply;