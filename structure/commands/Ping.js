const Command = require('../Command');

class Ping extends Command {

    constructor(client) {
        super(client, {
            name: 'ping'
        });
    }

    execute() {
        return `PONG!`;
    }

}

module.exports = Ping;