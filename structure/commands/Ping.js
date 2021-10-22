const Command = require('../Command');

class Ping extends Command {

    constructor (client) {
        super(client, {
            name: 'ping'
        });
    }

    async execute () {
        return `PONG!`;
    }

}

module.exports = Ping;