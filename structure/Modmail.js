class Modmail {

    constructor(client) {

        this.client = client;
        this.mainServer = null;
        this.bansServer = null;

    }

    init() {

        const { bansGuild, mainGuild } = this.client._options;

        this.mainServer = this.client.guilds.cache.get(mainGuild);
        if (!this.mainServer) throw new Error(`Missing main server: ${mainGuild} is not a valid server ID`);
        
        this.bansServer = this.client.guilds.cache.get(bansGuild) || null;
        this.client.logger.warn(`Missing bans server: ${bansGuild} is not a valid server ID`);

    }

    async handleUser(message) {



    }

    async handleServer() {

    }

}

module.exports = Modmail;