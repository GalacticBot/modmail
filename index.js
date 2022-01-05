if (!require('fs').existsSync('./config.js')) {
    // eslint-disable-next-line no-console
    console.error(`Missing config file.`);
    // eslint-disable-next-line no-process-exit
    process.exit(0);
}

const Options = require('./config.js');
const { Client } = require('./structure');

const client = new Client(Options);
client.init();