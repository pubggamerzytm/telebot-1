const TelegramBot = require('node-telegram-bot-api'),
      config = require('./config.json'),
      db = require('./schema.js'),
      WAValidator = require('wallet-address-validator');
const {createServer} = require('http')
const server = createServer(() => {})
server.listen(3000)
/**
 * @prop {TelegramBot} bot New Instance of the bot
 * @param config.token The bot token
 */
const bot = new TelegramBot(config.token, {polling:true})

/**
 * @description Searching for messages including "/start"
 */
bot.onText(/^\/start$/, function (msg) {

    /**
     * @prop {JSON} opts Markup options sent with message when the bot is initialized. 
     */
    const opts = {
        reply_markup: {
            resize_keyboard: true,
            one_time_keyboard: true,
            keyboard: [ 
                ['⛏ Mine'], ['👤 Account', '⚡️ Upgrade', '💵 Withdraw'], ['📊 Stats', "🔎 Help"] 
            ],
        },
        parse_mode: "HTML"
    };

    /**
     * @description Create global collection only if it is empty.
     */
    db.global.find({}, (err, result) => {
        if(err) return console.log(err);

        if(result.length === 0 || result === null || result === undefined) {
            db.global.create({
                totalMined: 0,
                totalUsers: 0
            })
        }
    })

    /**
     * @description Attempts to create user account.
     */
    db.user.findOne({ user: msg.from.id}, (err, result) => {
        if(result === null || result === undefined) {
            db.user.create({ user: msg.from.id}, (err, user) => {
                if(err) return console.log(err);
                db.global.findOne({}, {}, { sort: { 'created_at' : -1 } }, (err, post) => { 
                    if (err) return console.log(err); 
                    post.totalUsers += 1;
                    post.save((err) => { if(err) throw new Error("Couldn't save to database: ", err)})
                })
            })
        }
    });
    /**
     * @description Sends welcome message to users starting the bot.
     */
    bot.sendMessage(msg.chat.id, "Free <b>Bitcoin</b> (BTC) every 30 seconds, no investment required.", opts);
});

/**
 * @description Searching for messages including "Mine", case-insensitive 
 */
bot.onText(/(Mine)/i, (msg) => {

    /**
     * @prop {JSON} opts Markup options sent with message.
     */
    const opts = {
        reply_markup: {
            resize_keyboard: true,
            one_time_keyboard: true,
            keyboard: [ 
                ['⛏ Mine'], ['👤 Account', '⚡️ Upgrade', '💵 Withdraw'], ['📊 Stats', "🔎 Help"] 
            ],
        },
        parse_mode: "HTML"
    };

    /**
     * @description Attempt to find user in the database
     */
    db.user.findOne({ user: msg.from.id}, (err, result) => {
        if(err) return console.log(err)
        
        /**
         * @description Create account if user is new using a Promise
         */
        waitForAccount = new  Promise((resolve, reject) => {
            if(result === null || result === undefined) {
                var user = db.user.create({ user: msg.from.id}, (err, user) => {
                    if(err) reject(err)
                    else{
                        db.global.findOne({}, {}, { sort: { 'created_at' : -1 } }, (err, post) => { 
                            if (err) return console.log(err); 
                            post.totalUsers += 1;
                            post.save((err) => { if(err) throw new Error("Couldn't save to database: ", err)})
                        })
                        resolve(user);
                    }
                })
            }else resolve();
        }).then((user) => {
            if(user) result = user;
            
            if(new Date(Date.now()) > result.timestamp) {
                
                /**
                 * @prop {Number} claimAmount The amount of BTC being given based on the min and max values in the config file.
                 */
                let claimAmount = Math.floor((Math.random() * (config.max - config.min)) + config.min) / 100000000;
                claimAmount = claimAmount.toFixed(8).toString();

                /**
                 * @description Adds the claim into the database
                 */
                result.claims.push({ amount: claimAmount });

                /**
                 * @prop Adds claimAmount to current value.
                 */
                result.balance = (parseFloat(result.balance) + parseFloat(claimAmount)).toFixed(8);
                
                /**
                 * @prop Create timestamp in the future based on rank.
                 */
                result.timestamp = new Date(Date.now() + config.rank[result.type].delay);

                /**
                 * @description Updates the database with new values
                 */
                result.save((err) => { if(err) throw new Error("Error saving database:", err)})

                db.global.findOne({}, {}, { sort: { 'created_at' : -1 } }, (err, post) => { 
                    if (err) return console.log(err); 
                    post.totalMined = (parseFloat(post.totalMined) + parseFloat(claimAmount)).toFixed(8);
                    post.save((err) => { if(err) throw new Error("Couldn't save to database: ", err)})
                })
                
                /**
                 * @description Sends message to user informing them with their claimAmount and updated balance.
                 */
                bot.sendMessage(msg.chat.id, "Congratulation! You've got " + claimAmount + " BTC! Your balance is now: " + result.balance + " BTC", opts)

            }else {

                /**
                 * @prop {Number} secondsRemaining amount of seconds remaining until next claim can happen.
                 */
                let secondsRemaining = Math.floor(Math.abs((Date.now()-result.timestamp.getTime())/1000));

                /**
                 * @description Sends message to user information them with the remaining cooldown.
                 */
                bot.sendMessage(msg.chat.id, "Please wait " + secondsRemaining + " seconds to claim again! Tired of waiting? Please /upgrade your account to remove the limit!", opts )
            }

        }).catch( err => { if(err) console.log(err) })

        
    })
})

/**
 * @description Searching for messages including "Account", case-insensitive 
 */
bot.onText(/(Account)/i, (msg) => {

    /**
     * @prop {JSON} opts Markup options sent with message.
     */
    const opts = {
        reply_markup: {
            resize_keyboard: true,
            one_time_keyboard: true,
            keyboard: [ 
                ['⛏ Mine'], ['👤 Account', '⚡️ Upgrade', '💵 Withdraw'], ['📊 Stats', "🔎 Help"] 
            ],
        },
        parse_mode: "HTML"
    };

    /**
     * @description Attempt to find user in the database
     */
    db.user.findOne({ user: msg.from.id}, (err, result) => {
        if(err) return console.log(err);

        /**
         * @description Sends message to user with general information about their account.
         */

        if(result.wallet === null || result.wallet === undefined) result.wallet = "";
        if(msg.from.first_name === null || msg.from.first_name === undefined) msg.from.first_name = "";
        if(msg.from.last_name === null || msg.from.last_name === undefined) msg.from.last_name = "";

        let date = new Date(result.signup);
        let dateFormat = date.getFullYear() + "-" + ('0' + (date.getMonth()+1)).slice(-2) + "-" + ('0' + date.getDate()).slice(-2) + " " + date.getHours() + ":" + date.getMinutes()
        bot.sendMessage(msg.chat.id, "<b>GENERAL INFORMATION</b>\n\n<b>User: " + msg.from.first_name + " " + msg.from.last_name + "</b>\nBalance: " + result.balance + " BTC\nAccount Type: " + result.type + "\nWallet: " + result.wallet + "\nAccount Creation: " + dateFormat, opts);
    })
});

/**
 * @description Searching for messages including "Upgrade", case-insensitive
 */
bot.onText(/(Upgrade)/i, (msg) => {

    /**
     * @prop {JSON} opts Markup options sent with message.
     */
    const opts = {
        reply_markup: {
            resize_keyboard: true,
            one_time_keyboard: true,
            keyboard: [ 
                ['⛏ Mine'], ['👤 Account', '⚡️ Upgrade', '💵 Withdraw'], ['📊 Stats', "🔎 Help"] 
            ],
        },
        parse_mode: "HTML"
    };

    /**
     * @prop Empty String used in for loop
     */
    var string = "";

    /**
     * @description Iterate through ranks
     */
    for(rank in config.rank) {
        if(rank !== "free") string += rank.toUpperCase() + "\nPrice: " + config.rank[rank].price + " BTC\nClaim every " + config.rank[rank].delay/1000 + " seconds\n\n"
    }

    /**
     * @description Sends message to user with all ranks, their cost and benefits.
     */
    bot.sendMessage(msg.chat.id, "<b>UPGRADE ACCOUNT</>\n\n" + string, opts);

    /**
     * @description Sends message to user with your bitcoin address.
     */
    bot.sendMessage(msg.chat.id, "<b>Send the BTC to: " + config.addr + "</b>", opts);
})

bot.onText(/Withdraw/i, (msg) => {

    /**
     * @prop {JSON} opts Markup options sent with message.
     */
    const opts = {
        reply_markup: {
            resize_keyboard: true,
            one_time_keyboard: true,
            keyboard: [ 
                ['⛏ Mine'], ['👤 Account', '⚡️ Upgrade', '💵 Withdraw'], ['📊 Stats', "🔎 Help"] 
            ],
        },
        parse_mode: "HTML"
    };

    // check if btc addr is set for user.. and if so, check that their balance is above the minimum..
    db.user.findOne({ user: msg.from.id}, (err, result) => {
        if(err) return console.log(err);
        if(!result) return;
        if(result.wallet){
            //wallet is set
            if(result.balance > config.withdrawalMinimum) {

                /**
                 * @prop Placeholder balance
                 */
                let balance = result.balance;

                result.withdrawals.push({ amount: balance })
                
                /**
                 * @prop Reset balance to 0
                 */
                result.balance = 0;
                result.save((err) => { if(err) throw new Error("Couldn't save to database: ", err)})

                bot.sendMessage(msg.chat.id, "Congratulations! Your withdrawal request for <b>" + balance + " BTC</b> will be fulfilled soon.", opts)
            }else {
                
                bot.sendMessage(msg.chat.id, "Sorry, but you need at least " + config.withdrawalMinimum + " BTC before you can withdraw.", opts);
            }
        }else {
            // wallet is not set.

            bot.sendMessage(msg.chat.id, "To add your wallet to your account, enter your wallet address in chat.", opts);
            
        }
    })
});

bot.onText(/Stats/i, (msg) => {

    /**
     * @prop {JSON} opts Markup options sent with message.
     */
    const opts = {
        reply_markup: {
            resize_keyboard: true,
            one_time_keyboard: true,
            keyboard: [ 
                ['⛏ Mine'], ['👤 Account', '⚡️ Upgrade', '💵 Withdraw'], ['📊 Stats', "🔎 Help"] 
            ],
        },
        parse_mode: "HTML"
    };


    db.global.findOne({}, {}, { sort: { 'created_at' : -1 } }, (err, post) => { 
        if(err) return console.log(err);
        
        bot.sendMessage(msg.chat.id, "<b>BOT STATS</b>\n\n Total Mined: " + post.totalMined + "\n Total Members: " + post.totalUsers + "\n", opts);
    })
})

bot.onText(/Help/i, (msg) => {

    /**
     * @prop {JSON} opts Markup options sent with message.
     */
    const opts = {
        reply_markup: {
            resize_keyboard: true,
            one_time_keyboard: true,
            keyboard: [ 
                ['⛏ Mine'], ['👤 Account', '⚡️ Upgrade', '💵 Withdraw'], ['📊 Stats', "🔎 Help"] 
            ],
        },
        parse_mode: "HTML"
    };


    bot.sendMessage(msg.chat.id, "<b>Please join the following channel for help:</b>\n https://t.me/ClaimBtccommunity", opts);
})


bot.on("message", (msg ) => {

    /**
     * @prop {JSON} opts Markup options sent with message.
     */
    const opts = {
        reply_markup: {
            resize_keyboard: true,
            one_time_keyboard: true,
            keyboard: [ 
                ['⛏ Mine'], ['👤 Account', '⚡️ Upgrade', '💵 Withdraw'], ['📊 Stats', "🔎 Help"] 
            ],
        },
        parse_mode: "HTML"
    };

    if(WAValidator.validate(msg.text, "BTC")) {
        db.user.findOne({ user: msg.from.id}, (err, result) => {
            if(err) return console.log(err);
            if(result) result.wallet = msg.text;
            result.save((err) => { if(err) throw new Error("Error saving to database: ", err)})
        })

        bot.sendMessage(msg.chat.id, "Successfully updated your wallet to " + msg.text, opts);
    }
})
