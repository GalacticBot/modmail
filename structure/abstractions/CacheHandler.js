class CacheHandler {

    constructor (client) {

        this.client = client;

    }

    load () {
        throw new Error('Not implemented');
    }

    savePersistentCache () {
        throw new Error('Not implemented');
    }

    saveModmailHistory () {
        throw new Error('Not implemented');
    }

    loadModmailHistory () {
        throw new Error('Not implemented');
    }

    verifyQueue () {
        throw new Error('Not implemented');
    }

    get json () {
        return {
            queue: this.queue,
            channels: this.channels,
            lastActivity: this.lastActivity,
            misc: this.misc
        };
    }

}

module.exports = CacheHandler;