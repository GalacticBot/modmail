const Command = require('../Command');

class Markread extends Command {

    constructor(client) {
        super(client, {
            name: 'markread'
        });
    }

    async execute(message) {

        return this.client.modmail.markread(message);

    }

}

module.exports = Markread;