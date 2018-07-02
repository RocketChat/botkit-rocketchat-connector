var Botkit = require('botkit');
const { driver } = require('@rocket.chat/sdk');

function RocketChatBot(botkit, config) {
    var controller = Botkit.core(config || {});
    // transform the string value from .env to bool.
    var SSL = (config.rocketchat_ssl === 'true')

    controller.startBot = async () => {
        // implicit call for bot.defineBot()
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
            driver.respondToMessages(function (err, message, meta) {
                // store the text from RocketChat incomming messages
                // this message is already normalized.
                // but we might be missing out on fields we want                 
                message.type = getMessageSource(meta, message);
                controller.ingest(bot, message)
            }, options);
        }
    }

    controller.defineBot(function (botkit, config) {
        var bot = {
            type: 'rocketchat',
            botkit: botkit,
            config: config || {},
            utterances: botkit.utterances,
        }

        bot.send = function (message, cb) {
            console.log(message)
            if (bot.connected) {
                // handles every type of message
                if (message.type === 'direct_message') {
                    driver.sendDirectToUser(message.text, message.user)
                        .then(() => {
                            cb()
                        })
                        .catch((error) => {
                            console.log(error)
                        })
                } else if (message.type === 'liveChat') {
                    // TODO: implement answer to livechat
                } else if (message.type === 'mention') {
                    driver.sendToRoomId(message.text, message.channel)
                        .then(() => {
                            cb()
                        })
                        .catch((error) => {
                            console.log(error)
                        })
                } else if (message.type === 'mention') {
                    driver.sendToRoomId(message.text, message.channel)
                        .then(() => {
                            cb()
                        })
                        .catch((error) => {
                            console.log(error)
                        })
                } else if (message.type === 'message') {
                    driver.sendToRoomId(message.text, message.channel)
                        .then(() => {
                            cb()
                        })
                        .catch((error) => {
                            console.log(error)
                        })
                }
            }
            // BOT is not connected
            cb();
        }

        bot.reply = function (src, resp, cb) {
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
            for (var t = 0; t < botkit.tasks.length; t++) {
                for (var c = 0; c < botkit.tasks[t].convos.length; c++) {
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

    // Verify the pipeline of the message.
    controller.middleware.receive.use(function (bot, message, next) { console.log('I RECEIVED', message); next(); });
    controller.middleware.send.use(function (bot, message, next) { console.log('I AM SENDING', message); next(); });

    // provide one or more normalize middleware functions that take a raw incoming message
    // and ensure that the key botkit fields are present -- user, channel, text, and type
    controller.middleware.normalize.use(function (bot, message, next) {
        message.text = handleMention(message)
        message.user = message.u.username
        message.channel = message.rid
        message.ts = message.ts.$date
        next();
    });

    controller.middleware.categorize.use(function (bot, message, next) {
        if (message.type == 'message') {
            message.type = 'message_received';
        }
        next();
    });


    // provide one or more ways to format outgoing messages from botkit messages into 
    // the necessary format required by the platform API
    // at a minimum, copy all fields from `message` to `platform_message`
    controller.middleware.format.use(function (bot, message, platform_message, next) {
        for (var k in message) {
            platform_message[k] = message[k]
        }
        if (!platform_message.type) {
            platform_message.type = 'message';
        }
        next();
    });

    // Utils functions
    function getMessageSource(meta, message) {
        // message_received type are not at the events list, if added the bot
        // will answer all messages
        var messageSource = 'message_received';
        if (meta.roomType === 'd') {
            messageSource = 'direct_message';
        } else if (meta.roomType === 'l') {
            messageSource = 'liveChat';
        } else if (meta.roomType === 'c' && getMention(message)) {
            messageSource = 'mention';
        } else if (meta.roomType === 'p' && getMention(message)) {
            messageSource = 'mention';
        }
        return messageSource;
    }

    function handleMention(message) {
        var text = ''
        if (getMention(message)) {
            // regex to remove words that begins with '@'
            text = message.msg.replace(/(^|\W)@(\w+)/g, '').replace(' ', '')
        } else {
            text = message.msg
        }
        return text
    }

    function getMention(message) {
        var bot_mention = false
        for (var mention in message.mentions) {
            if (message.mentions[mention].username == config.rocketchat_bot_user) {
                bot_mention = true
            }
        }
        return bot_mention
    }

    return controller;
}

module.exports = RocketChatBot;