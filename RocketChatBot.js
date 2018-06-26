var Botkit = require('botkit');
const { driver } = require('@rocket.chat/sdk');

function RocketChatBot(botkit, config) {
    console.log("Inside RocketChatBot");
    // store bool values to know if the message is from LiveChat, Channel, 
    // Private Channel or DirectMessage. The value isChannel is true to bot
    // be enabled to send initial messages in chat.
    var verifyMessageSource = {
        isDirectMessage: false,
        isLiveChat: false,
        isChannel: true,
        isPrivateChannel: false
    }
    // store the user name that the bot needs to answer
    var userName;
    // store the room ID that the bot needs to answer. Initilize with the
    // room defined in .env file
    var roomID = config.rocketchat_bot_rooms;
    // get the "brain" of Botkit
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
            await driver.login({ username: config.rocketchat_bot_user, password: config.rocketchat_bot_pass });
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

        // send a simple message in default ROOM
        bot.send({ text: config.rocketchat_bot_user + " is listening!" })

        // define where the bot can interact, this maybe can be a .env 
        // configuration.
        var options = {
            rooms: true,
            dm: true,
            livechat: true,
            edited: true
        }

        // trigger when every message is sent from any source enabled from
        // options
        driver.respondToMessages(async function (err, message, meta) {
            console.log("\ninside respondToMessages");
            // gets the source of the message and store it in this vars
            const isDirectMessage = (meta.roomType === 'd')
            const isLiveChat = (meta.roomType === 'l')
            const isChannel = (meta.roomType === 'c')
            const isPrivateChannel = (meta.roomType === 'p')

            // updates the global var with the message data. This could be an
            // issue when more people send message at the same time
            verifyMessageSource = {
                isDirectMessage: isDirectMessage,
                isLiveChat: isLiveChat,
                isChannel: isChannel,
                isPrivateChannel: isPrivateChannel
            }

            userName = message.u.username;
            roomID = message.rid;

            // TODO: needs to remove the response var and correct this step 
            var response = {
                text: message.msg
            }

            try {
                await controller.ingest(bot, response)
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
                if (verifyMessageSource.isDirectMessage) {
                    await driver.sendDirectToUser(message.text, userName);
                } else if (verifyMessageSource.isLiveChat) {
                    // TODO: implement answer to livechat
                } else if (verifyMessageSource.isPrivateChannel) {
                    await driver.sendToRoomId(message.text, roomID);
                } else if (verifyMessageSource.isChannel) {
                    // TODO: need to configure the channel parameter to send to 
                    // more than one channel. Now is a simple string that came from
                    // .env file inside the Starterkit                
                    await driver.sendToRoomId(message.text, roomID);
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
            bot.say(resp, cb);
        };

        // this function defines the mechanism by which botkit looks for ongoing conversations
        // probably leave as is!
        // TODO: When this function is uncommented the code just answer the
        // first message sent. Need to solve it.
        bot.findConversation = function (message, cb) {
            console.log("\n=>inside bot.findConversation")
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
        //message.type = 'message'
        message.user = userName;
        message.channel = roomID;
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
        next();
    });

    return controller;
}

module.exports = RocketChatBot;
