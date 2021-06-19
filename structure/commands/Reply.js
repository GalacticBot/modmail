const Command = require('../Command');

class Reply extends Command {

    constructor(client) {
        super(client, {
            name: 'reply',
            aliases: ['r'],
            showUsage: true,
            usage: `<reply content>`
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
        return this.client.modmail.sendResponse({ message, content: content.trim(), anon });

    }

}

module.exports = Reply;