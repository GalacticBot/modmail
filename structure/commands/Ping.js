const Command = require('../Command');

class Ping extends Command {

    constructor(client) {
        super(client, {
            name: 'ping'
        });
    }

}

module.exports = Ping;