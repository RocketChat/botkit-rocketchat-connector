var Botkit = require('botkit');
const { driver } = require('@rocket.chat/sdk');

function RocketChatBot(botkit, config) {
    console.log("Inside RocketChatBot");
    var myuserid;
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
        bot.send({ text: config.rocketchat_bot_user + " is listening..." });

        // callback for incoming messages filter and processing
        const processMessages = async (err, message, messageOptions) => {
            console.log("\nInside processMessages ")
            if (!err) {
                console.log("\nInside processMessages !err")
                console.log(message)
                // filter our own message
                if (message.u._id === myuserid) return;
                // can filter further based on message.rid
                const roomname = await driver.getRoomName(message.rid);
                var response = {
                    type: 'message',
                    user: '',
                    channel: 'socket',
                    text: message.msg
                }

                console.log("\nreposne:")
                console.log(response)
                controller.ingest(bot, response)
            }
        }

        // connect the processMessages callback
        const msgloop = await driver.reactToMessages(processMessages);
        console.log('connected and waiting for messages');
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
            console.log("\nmessage.text: " + message.text)
            if (bot.connected) {
                // TO DO: need to configure the channel parameter to send to 
                // more than one channel. Now is a simple string that came from
                // .env file inside the Starterkit
                const sent = await driver.sendToRoom(message.text, config.rocketchat_bot_rooms);
                console.log('SEND: ', message);
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
