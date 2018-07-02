var Botkit = require('botkit');
const { driver } = require('@rocket.chat/sdk');

function RocketChatBot(botkit, config) {
    console.log("Inside RocketChatBot");
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
            
            var options = {
                dm: config.rocketchat_bot_direct_messages,
                livechat: config.rocketchat_bot_live_chat,
                edited: config.rocketchat_bot_edited
            }

            // trigger when every message is sent from any source enabled from
            // options
            driver.respondToMessages(async function (err, message, meta) {
                console.log("\ninside respondToMessages");
                console.log(meta)

                // store the text from RocketChat incomming messages
                // this message is already normalized.
                // but we might be missing out on fields we want 
                var messageSource = await getMessageSource(meta);
                var incommingMessage = {
                    text: message.msg,
                    user: message.u.username,
                    channel: message.rid,
                    type: messageSource,
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

        bot.send = async function(message, cb) {
            console.log("\ninside bot.send")
            console.log(message)
            
            var newMessage = {
                msg: message.text,
                attachments: message.attachments || []
            }
            
            if (bot.connected) {
                if (message.type === 'directMessage') {
                      await driver.sendDirectToUser(newMessage, message.user);
                } else if (message.type === 'liveChat') {
                    // TODO: implement answer to livechat
                } else if (message.type === 'privateChannel') {
                      await driver.sendToRoomId(newMessage, message.channel);
                } else if (message.type === 'channel') {
                      await driver.sendToRoomId(newMessage, message.channel);
                } else if (message.type === 'message') {
                      await driver.sendToRoomId(newMessage, message.channel);
                }  
                cb();
            }
            //  BOT is not connected
            cb();
        }

        bot.reply = async function (src, resp, cb) {
            console.log('\ninside reply')
            if (typeof (resp) == 'string') {
                resp = {
                    text: resp
                };
            }
            resp.type = src.type;
            resp.user = src.user;
            resp.channel = src.channel;
            bot.say(resp, cb);
        };

        // this function defines the mechanism by which botkit looks for ongoing conversations
        // probably leave as is!
        bot.findConversation = function (message, cb) {
            console.log("\nInside findConversation")
                for (var t = 0; t < botkit.tasks.length; t++) {
                    console.log(botkit.tasks.length)
                    for (var c = 0; c < botkit.tasks[t].convos.length; c++) {
                        console.log(botkit.tasks[t].convos[c].source_message)
                        // the ts just is added to source_message.original_message.ts
                        if (
                            botkit.tasks[t].convos[c].isActive() &&
                            botkit.tasks[t].convos[c].source_message.user == message.user &&
                            botkit.tasks[t].convos[c].source_message.channel == message.channel &&
                            botkit.excludedEvents.indexOf(message.type) == -1 // this type of message should not be included
                        ) {
                            cb(botkit.tasks[t].convos[c]);
                            return;
                        }
                    }
            }
            cb();
        };
        return bot;
    })

    controller.middleware.receive.use(function(bot, message, next) { console.log('I RECEIVED', message); next(); });

    controller.middleware.send.use(function(bot, message, next) { console.log('I AM SENDING', message); next(); });

    // provide one or more normalize middleware functions that take a raw incoming message
    // and ensure that the key botkit fields are present -- user, channel, text, and type
    controller.middleware.normalize.use(function (bot, message, next) {
        next();
    });
     controller.middleware.categorize.use(function (bot, message, next) {
        console.log("\n*inside middleware.categorize.use");
        if (message.type == 'message') {
            message.type = 'message_received';
        }
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
            messageSource = 'message_received';
        }
        return messageSource;
    }

    return controller;
}

module.exports = RocketChatBot;
