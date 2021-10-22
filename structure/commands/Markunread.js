const Command = require('../Command');

class Markunread extends Command {

    constructor (client) {
        super(client, {
            name: 'markunread'
        });
    }

    async execute (message, { args }) {

        return this.client.modmail.changeReadState(message, args, 'unread');

    }

}

module.exports = Markunread;