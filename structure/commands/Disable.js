const Command = require('../Command');

class Ping extends Command {

    constructor (client) {
        super(client, {
            name: 'disable',
            aliases: [ 'enable' ]
        });
    }

    async execute ({ _caller }, { clean }) {

        if (_caller === 'enable') this.client.modmail.enable();
        else this.client.modmail.disable(clean);

        return `:thumbsup: ${_caller}d`;

    }

}

module.exports = Ping;