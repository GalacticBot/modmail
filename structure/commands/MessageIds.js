const { MessageAttachment } = require('discord.js');
const Command = require('../Command');

class MessageIds extends Command {

    constructor (client) {
        super(client, {
            name: 'messageids',
            aliases: [ 'msgids', 'mmids' ]
        });
    }

    async execute (message, { args }) {

        let channel = null;
        if (args?.length) channel = await this.client.resolveChannel(args[0]);
        else ({ channel } = message);

        const result = this.client.getUserFromChannel(channel);
        if (result.error) return result;
        const [ userId ] = result;
        
        const user = await this.client.users.fetch(userId);
        const dmChannel = await user.createDM();

        const history = await this.client.cache.loadModmailHistory(userId);
        const sorted = history.sort((a, b) => b.timestamp - a.timestamp);
        const idContentPairs = [];
        const urlBase = `https://discord.com/channels/@me`;

        for (const mm of sorted) {
            if (!mm.msgid && !mm.isReply) break; // Old modmails from before msg id logging -- could probably supplement with fetching messages but cba rn
            idContentPairs.push(`${urlBase}/${dmChannel.id}/${mm.msgid} - ${mm.content}`);
        }

        if (!idContentPairs.length) {
            const msgs = await dmChannel.messages.fetch();
            const sortedMsgs = msgs.filter(msg => msg.author.id !== this.client.user.id).sort((a, b) => b.createdTimestamp - a.createdTimestamp);
            for (const msg of sortedMsgs.values()) idContentPairs.push(`${urlBase}/${dmChannel.id}/${msg.id} - ${msg.content}`);
        }

        await message.channel.send({
            files: [
                new MessageAttachment(
                    Buffer.from(`ID - Content pairs for\n${user.tag} - ${user.id}\n\n${idContentPairs.join('\n')}`),
                    'ids.txt'
                )
            ]
        });

    }

}

module.exports = MessageIds;