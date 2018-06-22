var Botkit = require('botkit');
const { driver } = require('@rocket.chat/sdk');

function RocketChatBot(botkit, config) {
    console.log("Inside RocketChatBot");
    var myuserid;
    var verifyMessageSource;
    var userName;
    var controller = Botkit.core(config || {});

    // transform the string value from .env to bool.
    var SSL = (config.rocketchat_ssl === 'true')
    console.log(SSL)

    controller.startBot = async () => {
        // insert to var bot bot.defineBot()
        var bot = controller.spawn(config);
        try {
            // make the connection with RocketChat
            const conn = await driver.connect({ host: config.rocketchat_host, useSsl: SSL })
            myuserid = await driver.login({ username: config.rocketchat_bot_user, password: config.rocketchat_bot_pass });
            const roomsJoined = await driver.joinRooms([config.rocketchat_bot_rooms]);
            //console.log('joined rooms');
            // set up subscriptions - rooms we are interested in listening to
            const subscribed = await driver.subscribeToMessages();
            //console.log('subscribed');
            // TO DO: need to improve a way to verify the connection with rocketchat
            bot.connected = true;
        } catch (error) {
            bot.connected = false;
            console.log(error);
        }

        // TO DO: The first message sent it's not from the botkit, need
        // to configure the 'wellcome_message' to be the first message.
        //bot.send({ text: config.rocketchat_bot_user + " is listening..." });

        // // Define where the bot can interact
        // var options = {
        //     rooms: true,
        //     dm: true,
        //     livechat: true,
        //     edited: true
        // }}

        // driver.respondToMessages(async function (err, message, meta) {
        //     console.log("\n----------")
        //     console.log("\ninside respondToMessages");
        //     console.log("\n----------")
        //     const isDirectMessage = (meta.roomType === 'd')
        //     const isLiveChat = (meta.roomType === 'l')
        //     const isChannel = (meta.roomType === 'c')


        //     var response = {
        //         type: 'message',
        //         user: '',
        //         channel: 'socket',
        //         text: message.msg
        //     }

        //     if (isDirectMessage) {
        //         //const sentmsg = await driver.sendDirectToUser("SHABLAW", message.u.username);
        //         controller.ingest(bot, response)
        //     } else if (isLiveChat) {
        //         // Implement answer to livechat
        //     } else if (isChannel) {
        //         controller.ingest(bot, response)
        //     }
        // }, options);
        // Define where the bot can interact
        var options = {
            rooms: true,
            dm: true,
            livechat: true,
            edited: true
        }

        driver.respondToMessages(async function (err, message, meta) {
            console.log("\ninside respondToMessages");
            const isDirectMessage = (meta.roomType === 'd')
            const isLiveChat = (meta.roomType === 'l')
            const isChannel = (meta.roomType === 'c')

            verifyMessageSource = {
                isDirectMessage: isDirectMessage,
                isLiveChat: isLiveChat,
                isChannel: isChannel
            }
            userName = message.u.username;

            var response = {
                type: 'message',
                user: '',
                channel: 'socket',
                text: message.msg
            }

            try {
                const waitBotkit = await controller.ingest(bot, response)
            } catch (err) {
                console.log(err)
            }
        }, options);
    }

    controller.defineBot(function (botkit, config) {
        console.log('Inside defineBot');
        var bot = {
            type: 'rocketchat',
            botkit: botkit,
            config: config || {},
            utterances: botkit.utterances,
        }

        bot.send = async function (message, cb) {
            console.log("\ninside bot.send")
            if (bot.connected) {
                // TO DO: need to configure the channel parameter to send to 
                // more than one channel. Now is a simple string that came from
                // .env file inside the Starterkit                
                if (verifyMessageSource.isDirectMessage) {
                    const sentdirectMessage = await driver.sendDirectToUser(message.text, userName);
                } else if (verifyMessageSource.isLiveChat) {
                    // Implement answer to livechat
                } else if (verifyMessageSource.isChannel) {
                    const sentChannel = await driver.sendToRoom(message.text, config.rocketchat_bot_rooms);
                }

            }
        }

        bot.reply = async function (src, resp, cb) {
            console.log('\ninside reply')
            console.log(resp)

            if (typeof (resp) == 'string') {
                resp = {
                    text: resp
                };
            }

            // TO DO: This data is sent inside the src object, but the src have
            // not the correct content hight now.
            resp.type = 'message'
            resp.user = ''
            resp.channel = 'socket'

            bot.say(resp, cb);
        };

        // this function defines the mechanism by which botkit looks for ongoing conversations
        // probably leave as is!
        // TO DO: When this function is uncommented the code just answer the
        // first message sent. Need to solve it.
        bot.findConversation = function (message, cb) {
            console.log("\ninside bot.findConversation")
            console.log(message)
            // for (var t = 0; t < botkit.tasks.length; t++) {
            //     console.log("\nfindConversation FOR1")
            //     for (var c = 0; c < botkit.tasks[t].convos.length; c++) {
            //         console.log("\nfindConversation FOR2")
            //         if (
            //             botkit.tasks[t].convos[c].isActive() &&
            //             botkit.tasks[t].convos[c].source_message.user == message.user &&
            //             botkit.excludedEvents.indexOf(message.type) == -1 // this type of message should not be included
            //         ) {
            //             console.log("\nfindConversation IF")
            //             console.log(message)
            //             console.log(cb(botkit.tasks[t].convos[c]))
            //             cb(botkit.tasks[t].convos[c]);
            //             return;
            //         }
            //     }
            // }
            cb();
        };

        return bot;
    })

    // provide one or more normalize middleware functions that take a raw incoming message
    // and ensure that the key botkit fields are present -- user, channel, text, and type
    controller.middleware.normalize.use(function (bot, message, next) {
        console.log("\n*inside middleware.normalize.use")
        console.log(message)
        next();
    });

    // provide one or more ways to format outgoing messages from botkit messages into 
    // the necessary format required by the platform API
    // at a minimum, copy all fields from `message` to `platform_message`
    controller.middleware.format.use(function (bot, message, platform_message, next) {
        console.log("\n*inside middleware.format.use")
        for (var k in message) {
            platform_message[k] = message[k]
        }
        next();
    });

    controller.middleware.categorize.use(function (bot, message, next) {
        console.log("\n*inside middleware.categorize.use");
        console.log("\nmessage:");
        console.log(message)

        if (message.type == 'message') {
            message.type = 'message_received';
        }
        next();
    });

    return controller;
}

module.exports = RocketChatBot;
