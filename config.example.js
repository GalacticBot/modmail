// remove .example from the name to use this file, make sure to fill in the configs

module.exports = {
    discordToken: '', // Discord bot token
    galacticToken: '', // Token for Galactic's API for integration with Galactic Bot, not a thing yet
    mainGuild: '', // main server of operation
    bansGuild: '', // optional bans server for potential appeals processing
    prefix: '!',
    modmailCategory: [], // Should have 3 category IDs, main category (new), answered/waiting for reply, graveyard (old modmail channels getting ready for deletion)
    context: 10, // How many messages to load for context
    staffRoles: [], // Roles that have access to the bot commands
    graveyardInactive: 60, // How long a channel should be inactive for in the graveyard before deletion
    readInactive: 30, // How long a channel should be inactive for in the read category before moving to graveyard
    channelSweepInterval: 10, // How often channel transitions should be processed in minutes
    saveInterval: 1, // How often modmail history should be written to file in minutes
    evalAccess: [], // Array of IDs that should have access to the bot's eval function
    clientOptions: {
        intents: [ // Needs at least these
            'GUILDS',
            'GUILD_MEMBERS',
            'DIRECT_MESSAGES'
        ],
        presence: { // Playing status
            activity: {
                name: 'DM to contact Server Staff',
                type: 'PLAYING'
            }
        }
    },
    loggerOptions: { // This is for logging errors to a discord webhook 
        webhook: {   // If you're not using the webhook, disable it
            disabled: true,
            id: '',
            token: ''
        }
    }
};