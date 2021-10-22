const Command = require('../Command');

class Logs extends Command {

    constructor (client) {
        super(client, {
            name: 'logs',
            aliases: [ 'mmlogs', 'mmhistory', 'mmlog' ],
            showUsage: true,
            usage: '<user> [page]'
        });
    }

    async execute (message, { args }) {
        
        const user = await this.client.resolveUser(args[0]);
        let pageNr = 1;
        if (args[1]) {
            const num = parseInt(args[1]);
            if (isNaN(num)) return {
                error: true,
                msg: 'Invalid page number, must be number'
            };
            pageNr = num;
        }

        const { member, channel } = message;
        const history = await this.client.cache.loadModmailHistory(user.id);
        if (!history.length) return 'Not found in modmail DB';
        const page = this.paginate([ ...history ].filter((e) => !('readState' in e)).reverse(), pageNr, 10);

        const embed = {
            author: {
                name: `${user.tag} modmail history`,
                // eslint-disable-next-line camelcase
                icon_url: user.displayAvatarURL({ dynamic: true })
            },
            footer: {
                text: `${user.id} | Page ${page.page}/${page.maxPage}`
            },
            fields: [],
            color: member.highestRoleColor
        };

        for (const entry of page.items) {
            // eslint-disable-next-line no-shadow
            const user = await this.client.resolveUser(entry.author);
            embed.fields.push({
                name: `${user.tag}${entry.anon ? ' (ANON)' : ''} @ ${new Date(entry.timestamp).toUTCString()}`,
                value: entry.content.substring(0, 1000) + (entry.content.length > 1000 ? '...' : '') 
            });
        }

        await channel.send({ embed });

    }

    paginate (items, page = 1, pageLength = 10) {
        const maxPage = Math.ceil(items.length / pageLength);
        if (page < 1) page = 1;
        if (page > maxPage) page = maxPage;
        const startIndex = (page - 1) * pageLength;
        return {
            items: items.length > pageLength ? items.slice(startIndex, startIndex + pageLength) : items,
            page,
            maxPage,
            pageLength
        };
    }

}

module.exports = Logs;