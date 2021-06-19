const { Structures } = require('discord.js');

const Member = Structures.extend('GuildMember', (GuildMember) => {

    return class ExtendedMember extends GuildMember {
        get highestRoleColor() {
            const role = this.roles.cache.filter((role) => role.color !== 0).sort((a, b) => b.rawPosition - a.rawPosition).first();
            if (role) return role.color;
            return 0;
        }
    };

});

module.exports = Member;