const { Structures } = require('discord.js');

const TextChannel = Structures.extend('TextChannel', (TextChannel) => {

    return class ExtendedTextChannel extends TextChannel {

        constructor(guild, data) {
            super(guild, data);

            this.answered = false;
            this.recipient = null;

        }

    };

});

module.exports = TextChannel;