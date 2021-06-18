const Transport = require('winston-transport');
const { WebhookClient } = require('discord.js');
const os = require('os');
const { username } = os.userInfo();

//eslint-disable-next-line no-control-regex
const regex = /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/gu;

class DiscordWebhook extends Transport {
    constructor(opts) {
        super(opts);

        this.webhookClient = new WebhookClient(
            opts.id, 
            opts.token
        );
    }

    log(info, callback) {
        setImmediate(() => {
            this.emit('logged', info);
        });

        const message = info.message.replace(regex, '')
            //.replace(new RegExp(options.bot.token, 'gu'), '<redacted>')
            .replace(new RegExp(username, 'gu'), '<redacted>');

        const developers = [
            'nolan',
            'navy',
            'sema'
        ];
        const random = developers[Math.floor(Math.random() * developers.length)];

        const embed = {
            color: 0xe88388,
            timestamp: new Date(),
            description: `\`\`\`${message}\`\`\``,
            footer: {
                text: `probably ${random}'s fault`
            }
        };
        
        this.webhookClient.send('', { embeds: [embed] });

        callback();
    }
}

module.exports = DiscordWebhook;