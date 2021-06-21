const fs = require('fs');

class Cache {

    constructor(client) {

        const opts = client._options;
        this.client = client;
        this.logger = client.logger;

        this.saveInterval = opts.saveInterval;
        this._ready = false;

        this.queue = [];
        this.channels = {};
        this.lastActivity = {};

        this.modmail = {};
        this.updatedThreads = [];

    }

    load() {

        if (this._ready) return;

        if (fs.existsSync('./persistent_cache.json')) {
            this.logger.info('Loading cache');
            const raw = JSON.parse(fs.readFileSync('./persistent_cache.json', { encoding: 'utf-8' }));
            const entries = Object.entries(raw);
            for (const [key, val] of entries) this[key] = val;
        } else {
            this.logger.info('Cache file missing, creating...');
            this.save();
        }

        this.cacheSaveInterval = setInterval(this.save.bind(this), 10 * 60 * 1000);
        this.modmailSaveInterval = setInterval(this.saveModmailHistory.bind(this), this.saveInterval * 60 * 1000, this.client.modmail);
        this._ready = true;

    }

    save() {
        this.logger.debug('Saving cache');
        fs.writeFileSync('./persistent_cache.json', JSON.stringify(this.json));
    }

    saveModmailHistory() {

        if (!this.updatedThreads.length) return;
        const toSave = [...this.updatedThreads];
        this.updatedThreads = [];
        this.client.logger.debug(`Saving modmail data`);
        if (!fs.existsSync('./modmail_cache')) fs.mkdirSync('./modmail_cache');

        for (const id of toSave) {
            const path = `./modmail_cache/${id}.json`;
            try {
                fs.writeFileSync(path, JSON.stringify(this.modmail[id]));
            } catch (err) {
                this.client.logger.error(`Error during saving of history\n${id}\n${JSON.stringify(this.modmail)}\n${err.stack}`);
            }
        }

    }

    loadModmailHistory(userId) {

        return new Promise((resolve, reject) => {

            if (this.modmail[userId]) return resolve(this.modmail[userId]);

            const path = `./modmail_cache/${userId}.json`;
            if (!fs.existsSync(path)) {
                this.modmail[userId] = [];
                return resolve(this.modmail[userId]);
            }

            fs.readFile(path, { encoding: 'utf-8' }, (err, data) => {
                if (err) reject(err);
                const parsed = JSON.parse(data);
                this.modmail[userId] = parsed;
                resolve(parsed);
            });

        });

    }

    get json() {
        return {
            queue: this.queue,
            channels: this.channels,
            lastActivity: this.lastActivity
        };
    }

}

module.exports = Cache;