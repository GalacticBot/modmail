const Command = require('../Command');

class Modmail extends Command {

    constructor(client) {
        super(client, {
            name: 'modmail',
            aliases: ['mm'],
            showUsage: true,
            usage: `<user> <content>`
        });
    }

    async execute(message, { args }) {

        // eslint-disable-next-line prefer-const
        let [first, second] = args.map((a) => a);
        // eslint-disable-next-line prefer-const
        let { content, _caller } = message,
            anon = false;
        content = content.replace(`${this.client.prefix}${_caller}`, '');
        if (first.toLowerCase() === 'anon') {
            anon = true;
            content = content.replace(first, '');
            first = second;
        }

        const user = await this.client.resolveUser(first, true);
        if (!user) return {
            error: true,
            msg: 'Failed to resolve user'
        };
        else if (user.bot) return {
            error: true,
            msg: 'Cannot send modmail to a bot.'
        };
        content = content.replace(first, '');

        if (!content.length) return {
            error: true,
            msg: `Cannot send empty message`
        };

        return this.client.modmail.sendModmail({ message, content: content.trim(), anon, target: user });

    }

}

module.exports = Modmail;