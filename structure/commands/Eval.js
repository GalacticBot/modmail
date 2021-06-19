const { inspect } = require('util');
const { username } = require('os').userInfo();

const Command = require('../Command');

class Eval extends Command {

    constructor(client) {
        super(client, {
            name: 'eval',
            aliases: ['e']
        });
    }

    async execute(message, { clean }) {

        const { guild, author, member, client, channel } = message; //eslint-disable-line no-unused-vars
        
        try {
            let evaled = eval(clean); //eslint-disable-line no-eval
            if (evaled instanceof Promise) await evaled;
            if (typeof evaled !== 'string') evaled = inspect(evaled);

            evaled = evaled
                .replace(new RegExp(this.client.token, 'gu'), '<redacted>')
                .replace(new RegExp(username, 'gu'), '<redacted>');

            //if (args.log) guild._debugLog(`[${message.author.tag}] Evaluation Success: ${evaled}`);

            if (evaled.length > 1850) {
                evaled = `${evaled.substring(0, 1850)}...`;
            }
            await channel.send(
                `Evaluation was successful.\`\`\`js\n${evaled}\`\`\``,
                { emoji: 'success' }
            );


        } catch (error) {

            let msg = `${error}${error.stack ? `\n${error.stack}` : ''}`;

            //if (args.log) guild._debugLog(`[${message.author.tag}] Evaluation Fail: ${msg}`);
            if (msg.length > 2000) msg = `${msg.substring(0, 1900)}...`;
            await channel.send(
                `Evaluation failed.\`\`\`js\n${msg}\`\`\``,
                { emoji: 'failure' }
            );

        }

    }

}

module.exports = Eval;