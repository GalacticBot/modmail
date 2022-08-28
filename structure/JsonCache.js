const fs = require('fs');
const pathUtil = require('path');
const CacheHandler = require('./abstractions/CacheHandler');

class JsonCache extends CacheHandler {

    constructor (client) {
        
        super(client);

        const opts = client._options;
        this.logger = client.logger;

        this.saveInterval = opts.saveInterval;
        this._ready = false;

        // Data that gets stored to persistent cache
        this.queue = [];
        this.channels = {};
        this.lastActivity = {};
        this.misc = {}; // Random misc data, should not be non-primitive data types

        // Stored separately if at all
        this.modmail = {};
        this.updatedThreads = [];

    }

    load () {

        if (this._ready) return;

        if (fs.existsSync('./persistent_cache.json')) {
            this.logger.info('Loading cache');
            const raw = JSON.parse(fs.readFileSync('./persistent_cache.json', { encoding: 'utf-8' }));
            const entries = Object.entries(raw);
            for (const [ key, val ] of entries) this[key] = val;
        } else {
            this.logger.info('Cache file missing, creating...');
            this.savePersistentCache();
        }

        this.cacheSaveInterval = setInterval(this.savePersistentCache.bind(this), 10 * 60 * 1000);
        this.modmailSaveInterval = setInterval(this.saveModmailHistory.bind(this), this.saveInterval * 60 * 1000, this.client.modmail);
        this._ready = true;

    }

    savePersistentCache () {
        this.logger.debug('Saving cache');
        fs.writeFileSync('./persistent_cache.json', JSON.stringify(this.json, null, 4));
    }

    saveModmailHistory () {

        if (!this.updatedThreads.length) return;
        const toSave = [ ...this.updatedThreads ];
        this.updatedThreads = [];
        this.client.logger.debug(`Saving modmail data`);
        if (!fs.existsSync('./modmail_cache')) fs.mkdirSync('./modmail_cache');

        for (const id of toSave) {
            const path = `./modmail_cache/${id}.json`;
            try {
                fs.writeFileSync(path, JSON.stringify(this.modmail[id], null, 4));
            } catch (err) {
                this.client.logger.error(`Error during saving of history\n${id}\n${JSON.stringify(this.modmail)}\n${err.stack}`);
            }
        }

    }

    loadModmailHistory (userId) {

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

    async verifyQueue () {
        
        this.client.logger.info(`Verifying modmail queue.`);

        for (const entry of this.queue) {
            const path = `./modmail_cache/${entry}.json`;
            if (!fs.existsSync(pathUtil.resolve(path))) this.client.logger.warn(`User ${entry} is in queue but is missing history. Attempting to recover history.`);

            const user = await this.client.resolveUser(entry);
            const dm = await user.createDM();
            let messages = await dm.messages.fetch();
            messages = messages.sort((a, b) => a.createdTimestamp - b.createdTimestamp).map(msg => msg); // .filter(msg => msg.author.id !== this.client.user.id)
            const amt = messages.length;

            const history = await this.loadModmailHistory(entry);
            
            if (history.length) { // Sync user's past messages with the bot's cache if one exists
                const last = history[history.length - 1];
                let index = amt - 1; 
                for (index; index >= 0; index--) { // Find the most recent message that is also in the user's history
                    const msg = messages[index];
                    if (msg.content === last.content || msg.embeds.length && msg.author.bot) {
                        messages = messages.slice(index+1).filter(m => !m.author.bot);
                        break;
                    }
                }
                
                if (messages.length) this.client.logger.warn(`User ${entry} has previous history but is out of sync, attempting sync. ${messages.length} messages out of sync.`);
                else continue;
            }

            history.push({ timestamp: Date.now(), author: this.client.user.id, content: 'Attempted a recovery of missing messages at this point, messages may look out of place if something went wrong.' });
            for (const { author, content, createdTimestamp, attachments } of messages) {
                if (author.bot) continue;
                history.push({ attachments: attachments.map(att => att.url), author: author.id, content, timestamp: createdTimestamp });
            }
            this.updatedThreads.push(entry);

        }

        this.client.logger.info(`Queue verified.`);
        this.saveModmailHistory();

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

module.exports = JsonCache;