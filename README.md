# WIP MODMAIL BOT

**Still a work in progress, has no actual integration with the main bot at this point due to the main bot still being very much a work in progress.**

Uses json for storage. If this is a problem, feel free to start a branch and write your own cache handler, alternatively use another bot.
Shouldn't require much setup, fill in the relevant fields in config.js, should be well commented.

I've tried refactoring some of the original code that I wrote initially in haste, but a lot of it's still very questionable and in need of rewriting/refactoring.
Contributions welcome.

## How to use
> Install [Node.js](https://nodejs.org/en/download/), at least v12, though I'd recommend at least 14 due to Discord.js requiring it in v13.

> Run `yarn install`, alternatively `npm install` if you don't have yarn for some reason.

> Rename `config.example.js` to `config.js`, open it and fill in the relevant values. The comments should explain what they are for. If something is unclear open an issue and I'll attempt to make it more clear.

> At this point you'll probably notice you need to add 3 new categories. I'm planning on automating a part of the setup process, but for now this is how it be. Make those, add their IDs to the array.

> I'd recommend getting PM2 or whatever you prefer for process management.
> Start up the bot and if you did everything right it should boot up and just work. If something goes wrong submit an issue, alternatively if you know how to fix it, issue a pull request.

## Commands

`!reply` - Sends a reply to the user.  
`!cannedreply` - Sends a pre-written reply to the user.  
Both of these can be used with `!r` and `!cr` respectively and both of them support the `anon` keyword to send an anonymous reply. The anon keyword has to be the first argument.  
`!modmail <user> <content>` or `!mm <user> <content>` - Sends a modmail to a user, also supports the anon keyword. `!mm anon @navy.gif#1998 Some content that is sent anonymously`  
`!markread [user|channel]` - Marks the thread read and moves the channel to the read category indicating that the mail doesn't warrant a response. Messages you've replied to are automatically marked read.  
`!mmlogs <user> [page]` - Shows user's past modmail.  
`!mmqueue` - Shows users in queue.  

The bot has an `!eval` command which you can grant access to in the config file.

**Creating canned/pre-written replies**  
Simple as using `!cr create <name> <the reply content here>`. Updating an existing entry is done by overwriting it.  
To delete one, use `!cr delete <name>`

## TODO LIST  
**Commands**  
- `!markunread` - Marks a thread unread  
**Other**  
- Display more specific information instead of just "User is in banland" (should reflect whether user is actually banned or otherwise in the appeals server.  
- Add something to display character count for messages, either command or an option to toggle.  
- Allow arbitrary order of `anon` and `user` arguments for `!modmail` command.
