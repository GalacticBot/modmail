if (!require('fs').existsSync('./config')) {
    // eslint-disable-next-line no-console
    console.error(`Missing config file.`);
    // eslint-disable-next-line no-process-exit
    process.exit(0);
}

const Options = require('./config');
const { Client } = require('./structure');

const client = new Client(Options);
client.init();