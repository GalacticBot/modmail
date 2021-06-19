const Command = require('../Command');

class Queue extends Command {

    constructor(client) {
        super(client, {
            name: 'queue',
            aliases: ['mmq', 'mmqueue']
        });
    }

    async execute(message) {
        
        const { queue } = this.client.modmail;
        if (!queue.length) return 'Queue is empty!';

        const users = await this.client.resolveUsers(queue);
        let str = ``,
            count = 0;
        for (const user of users) {
            const _str = `${user.tag} (${user.id})\n`;
            if ((str + _str).length > 2000) break;
            str += _str;
            count++;
        }

        const { channel } = message;
        const embed = {
            title: `${users.length} users in queue`,
            description: str,
            footer: {
                text: `Showing ${count} users`
            }
        };

        await channel.send({ embed });

    }

}

module.exports = Queue;