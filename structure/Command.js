class Command {

    constructor (client, options) {
        
        Object.entries(options).forEach(([ key, val ]) => {
            this[key] = val;
        });

        if (!this.name) throw new Error(`Missing name for command`);

        this.client = client;

    }

    async execute () {
        throw new Error(`Missing execute in ${this.name}`);
    }

}

module.exports = Command;