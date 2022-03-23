const Command = require('../Command');

class CannedReply extends Command {

    constructor (client) {
        super(client, {
            name: 'cannedreply',
            aliases: [ 'cr', 'canned' ],
            showUsage: true,
            usage: `<canned response name>`
        });
    }

    async execute (message, { args }) {
        
        const [ first ] = args.map((a) => a);
        // eslint-disable-next-line prefer-const
        let { channel, content, _caller } = message,
            anon = false;
        content = content.replace(`${this.client.prefix}${_caller}`, '');
        const op = args.shift().toLowerCase();
        
        if (op === 'anon') {
            anon = true;
            content = content.replace(first, '');
        } else if ([ 'create', 'delete' ].includes(op)) {
            return this.createCanned(op, args, message);
        } else if ([ 'list' ].includes(first.toLowerCase())) {

            const list = Object.entries(this.client.modmail.replies);
            let str = '';
            // eslint-disable-next-line no-shadow
            for (const [ name, content ] of list) {
                const substr = `**${name}:** ${content}\n`;
                if (str.length + substr.length > 2000) {
                    await channel.send(str);
                    str = '';
                }
                str += substr;
            }
            if (str.length) return channel.send(str);
            return '**__None__**';

        }

        return this.client.modmail.sendCannedResponse({ message, responseName: content.trim(), anon });

    }

    async createCanned (op, args, { channel, author }) {
        
        if (args.length < 1) return {
            error: true,
            msg: 'Missing reply name'
        };
        const [ _name, ...rest ] = args;

        const name = _name.toLowerCase();
        const canned = this.client.modmail.replies;
        let confirmation = null;

        if (op === 'create') {
            if (!rest.length) return {
                error: true,
                msg: 'Missing content'
            };

            if (canned[name]) {
                confirmation = await this.client.prompt(`A canned reply by the name ${name} already exists, would you like to overwrite it?`, { channel, author });
                if (!confirmation) return 'Timed out.';
                confirmation = [ 'y', 'yes', 'ok' ].includes(confirmation.content.toLowerCase());
                if (!confirmation) return 'Cancelled';
            }

            canned[name] = rest.join(' ');

        } else {
            delete canned[name];
        }

        this.client.modmail.saveReplies();
        return `Updated ${_name}`;

    }

}

module.exports = CannedReply;