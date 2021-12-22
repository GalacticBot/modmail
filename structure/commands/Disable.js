const Command = require('../Command');
const Util = require('../Util');

class Ping extends Command {

    constructor (client) {
        super(client, {
            name: 'disable',
            aliases: [ 'enable' ]
        });
    }

    async execute ({ author, member, _caller }, { clean }) {
        

        const { sudo } = this.client._options;
        const roleIds = member.roles.cache.map(r => r.id);
        if (!Util.arrayIncludesAny(roleIds, sudo) && !sudo.includes(author.id)) return;

        if (_caller === 'enable') this.client.modmail.enable();
        else this.client.modmail.disable(clean);

        return `:thumbsup: ${_caller}d`;

    }

}

module.exports = Ping;