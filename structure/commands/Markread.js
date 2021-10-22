const Command = require('../Command');

class Markread extends Command {

    constructor (client) {
        super(client, {
            name: 'markread'
        });
    }

    async execute (message, { args }) {

        return this.client.modmail.changeReadState(message, args);

    }

}

module.exports = Markread;