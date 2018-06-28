var Botkit = require('botkit');
const { driver } = require('@rocket.chat/sdk');

function RocketChatBot(botkit, config) {
    console.log("Inside RocketChatBot");
    // store values to know if the message is from LiveChat, Channel, 
    // Private Channel or DirectMessage
    var messageSource = 'channel';
    // store the user name that the bot needs to answer
    var userName;
    // store the room ID that the bot needs to answer. Initilize with the
    // room defined in .env file
    var roomID = config.rocketchat_bot_room;
    // get the "brain" of Botkit
    var controller = Botkit.core(config || {});
    // transform the string value from .env to bool.
    var SSL = (config.rocketchat_ssl === 'true')

    controller.startBot = async () => {
        // insert to var bot bot.defineBot()
        var bot = controller.spawn(config);
        try {
            // make the connection with RocketChat
            await driver.connect({ host: config.rocketchat_host, useSsl: SSL })
            await driver.login({ username: config.rocketchat_bot_user, password: config.rocketchat_bot_pass });
            await driver.joinRooms([config.rocketchat_bot_room]);
            await driver.subscribeToMessages();
            bot.connected = true;
        } catch (error) {
            bot.connected = false;
            console.log(error);
        }

        if (bot.connected) {
            // send a simple message in default ROOM
            bot.send({ text: config.rocketchat_bot_user + " is listening!" })

            var options = {
                dm: config.rocketchat_bot_direct_messages,
                livechat: config.rocketchat_bot_live_chat,
                edited: config.rocketchat_bot_edited
            }

            // trigger when every message is sent from any source enabled from
            // options
            driver.respondToMessages(async function (err, message, meta) {
                console.log("\ninside respondToMessages");
                messageSource = await getMessageSource(meta);

                userName = message.u.username;
                roomID = message.rid;

                // store the text from RocketChat incomming messages
                var incommingMessage = {
                    text: message.msg,
                    ts: message.ts.$date
                }

                try {
                    await controller.ingest(bot, incommingMessage)
                } catch (err) {
                    console.log(err)
                }
            }, options);
        }
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
            console.log(message)
            
            var newMessage = {
                msg: message.text,
                attachments: message.attachments || []
            }
            
            if (bot.connected) {
                if (messageSource === 'directMessage') {
                    await driver.sendDirectToUser(newMessage, userName);
                } else if (messageSource === 'liveChat') {
                    // TODO: implement answer to livechat
                } else if (messageSource === 'privateChannel') {
                    await driver.sendToRoomId(newMessage, roomID);
                } else if (messageSource === 'channel') {
                    await driver.sendToRoomId(newMessage, roomID);
                }
            }
        }

        bot.reply = async function (src, resp, cb) {
            console.log('\ninside reply')
            if (typeof (resp) == 'string') {
                resp = {
                    text: resp
                };
            }
            resp.user = userName;
            resp.channel = roomID;
            bot.say(resp, cb);
        };

        // this function defines the mechanism by which botkit looks for ongoing conversations
        // probably leave as is!
        bot.findConversation = function (message, cb) {
            console.log("\nInside findConversation")
            console.log(message)
            if (messageSource == 'directMessage' || messageSource == 'liveChat' ||
                messageSource == 'privateChannel' || messageSource == 'channel') {
                for (var t = 0; t < botkit.tasks.length; t++) {
                    console.log(botkit.tasks.length)
                    for (var c = 0; c < botkit.tasks[t].convos.length; c++) {
                        console.log(botkit.tasks[t].convos[c].source_message)
                        console.log(message.user)
                        console.log(message.channel)
                        console.log(message.ts)
                        // the ts just is added to source_message.original_message.ts
                        if (
                            botkit.tasks[t].convos[c].isActive() &&
                            botkit.tasks[t].convos[c].source_message.user == message.user &&
                            botkit.tasks[t].convos[c].source_message.channel == message.channel &&
                            botkit.tasks[t].convos[c].source_message.original_message.ts == message.ts &&
                            botkit.excludedEvents.indexOf(message.type) == -1 // this type of message should not be included
                        ) {
                            cb(botkit.tasks[t].convos[c]);
                            return;
                        }
                    }
                }
            }
            cb();
        };
        return bot;
    })

    // provide one or more normalize middleware functions that take a raw incoming message
    // and ensure that the key botkit fields are present -- user, channel, text, and type
    controller.middleware.normalize.use(function (bot, message, next) {
        console.log("\n*inside middleware.normalize.use");
        message.user = userName;
        message.channel = roomID;
        // gets the timestamp from incommingMessage()
        message.ts = message.raw_message.ts
        console.log(message)
        next();
    });

    // provide one or more ways to format outgoing messages from botkit messages into 
    // the necessary format required by the platform API
    // at a minimum, copy all fields from `message` to `platform_message`
    controller.middleware.format.use(function (bot, message, platform_message, next) {
        console.log("\n*inside middleware.format.use")
        console.log(message)
        for (var k in message) {
            platform_message[k] = message[k]
        }
        if (!platform_message.type) {
            platform_message.type = 'message';
        }
        next();
    });

    controller.middleware.categorize.use(function (bot, message, next) {
        console.log("\n*inside middleware.categorize.use");
        if (message.type == 'message') {
            message.type = 'message_received';
        }
        next();
    });

    // Utils functions
    async function getMessageSource(meta) {
        var messageSource;
        if (meta.roomType === 'd') {
            messageSource = 'directMessage';
        } else if (meta.roomType === 'l') {
            messageSource = 'liveChat';
        } else if (meta.roomType === 'c') {
            messageSource = 'channel';
        } else if (meta.roomType === 'p') {
            messageSource = 'privateChannel';
        } else {
            messageSource = 'unknown';
        }
        return messageSource;
    }

    return controller;
}

module.exports = RocketChatBot;
