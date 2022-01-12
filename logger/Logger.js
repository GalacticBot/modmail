const { createLogger, format, transports: { Console }, config } = require('winston');
const moment = require('moment');
const chalk = require('chalk');

const { DiscordWebhook, FileExtension } = require('./transports/index.js');

const Constants = {
    Colors: {
        error: 'red',
        warn: 'yellow',
        info: 'blue',
        verbose: 'cyan',
        debug: 'magenta',
        silly: 'magentaBright'
    }
};

class Logger {

    constructor (client, options) {
        this.client = client;
        this.options = options;

        const transports = [
            new FileExtension({ filename: `logs/${this.date.split(' ')[0]}.log`, level: 'debug' }), // Will NOT log "silly" logs, could change in future.
            new FileExtension({ filename: `logs/errors/${this.date.split(' ')[0]}-error.log`, level: 'error' }),
            new Console({ level: 'silly' }) // Will log EVERYTHING.
        ];

        if (!options.webhook.disabled) transports.push(new DiscordWebhook({ level: 'error', ...options.webhook })); // Broadcast errors to a discord webhook.

        this.logger = createLogger({
            levels: config.npm.levels,
            format: 
                format.cli({
                    colors: Constants.Colors 
                }),
            transports
        });

        // TODO: Add proper date-oriented filenames and add a daily rotation file (?).

    }

    write (type = 'silly', string = '') {

        const color = Constants.Colors[type];
        const header = `${chalk[color](`[${this.date}][modmail]`)}`;


        this.logger.log(type, `${header} : ${string}`);

    }

    get date () {
        return moment().format("YYYY-MM-DD hh:mm:ss");
    }

    info (message) {
        this.write('info', message);
    }

    warn (message) {
        this.write('warn', message);
    }

    error (message) {
        this.write('error', message);
    }

    debug (message) {
        this.write('debug', message);
    }

}

module.exports = Logger;