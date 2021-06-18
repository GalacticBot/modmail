const Options = require('./config');
const { Client } = require('./structure');

const client = new Client(Options);
client.init();