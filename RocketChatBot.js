// TO DO: need to make it relative path
var Botkit = require('./node_modules/botkit/lib/CoreBot.js');
const { driver } = require('@rocket.chat/sdk');

const ROOMS = ['GENERAL'];
const SSL = false;


function RocketChatBot(botkit, config) {
    console.log("Inside RocketChatBot");

    var controller = Botkit(config || {});

    var myuserid;

    controller.startBot = async () => {
        // insert to var bot bot.defineBot()
        var bot = controller.spawn(config);
        try {
            // make the connection with RocketChat
            const conn = await driver.connect({ host: config.rocketchat_host, useSsl: SSL })
            myuserid = await driver.login({ username: config.rocketchat_bot_user, password: config.rocketchat_bot_pass });
            const roomsJoined = await driver.joinRooms(ROOMS);
            console.log('joined rooms');
            // set up subscriptions - rooms we are interested in listening to
            const subscribed = await driver.subscribeToMessages();
            console.log('subscribed');
            // TO DO: need to verify the real connection
            bot.connected = true;
        } catch (error) {
            bot.connected = false;
            console.log(error);
        }

        // Here it's a way to make the bot always trigger controller.ingest
        // when a message is sent to the channel.
        driver.respondToMessages((message) => {
            console.log("\ninside driver.responToMessages")
            // this is a message example.
            var message = {
                type: 'message',
                text: 'bolacha',
                user: '',
                channel: 'socket',
                user_profile: null
            }

            controller.ingest(bot, message);
        })

        // send the first message to channel
        bot.send({ text: config.rocketchat_bot_user + " is listening..." });

        // callback for incoming messages filter and processing
        const processMessages = async (err, message, messageOptions) => {
            if (!err) {
                // filter our own message
                if (message.u._id === myuserid) return;
                // can filter further based on message.rid
                const roomname = await driver.getRoomName(message.rid);
                const response = message.msg
                // TO DO: verify if it is needed to call bot.reply in here to
                // make the reply feature work.
                bot.reply({}, response);
            }
        }

        // connect the processMessages callback
        const msgloop = await driver.reactToMessages(processMessages);
        console.log('connected and waiting for messages');
    }

    // TO DO: config it's not getting the correct values inside defineBot
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
                // TO DO: need to configure the channel parameter                
                const sent = await driver.sendToRoom(message.text, ROOMS[0]);
                console.log('SEND: ', message);
            }
        }

        // this function takes an incoming message (from a user) and an outgoing message (reply from bot)
        // and ensures that the reply has the appropriate fields to appear as a reply
        bot.reply = async function (src, resp, cb) {
            console.log('\ninside reply')
            console.log(resp)

            if (typeof (resp) == 'string') {
                resp = {
                    text: resp
                };
            }

            // TO DO: Verify what kind of channels, types and users exists 
            // in botkit and if this is the best option.
            resp.type = 'message'
            resp.user = ''
            resp.channel = 'socket'

            bot.say(resp, cb);
            //controller.ingest(bot, resp);
        };

        // this function defines the mechanism by which botkit looks for ongoing conversations
        // probably leave as is!
        bot.findConversation = function (message, cb) {
            console.log("\ninside bot.findConversation")
            for (var t = 0; t < botkit.tasks.length; t++) {
                for (var c = 0; c < botkit.tasks[t].convos.length; c++) {
                    if (
                        botkit.tasks[t].convos[c].isActive() &&
                        botkit.tasks[t].convos[c].source_message.user == message.user &&
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


    // TO DO: This middleware it's not really needed, but more configurations
    // will be needed here to make the ingest works.
    controller.middleware.ingest.use(function (bot, message, reply_channel, next) {
        console.log("\ninside middleware.ingest.use")
        console.log(message)
        next();
    });

    // provide one or more normalize middleware functions that take a raw incoming message
    // and ensure that the key botkit fields are present -- user, channel, text, and type
    controller.middleware.normalize.use(function (bot, message, next) {
        console.log("\ninside middleware.normalize.use")
        console.log(message)
        //console.log('NORMALIZE', message);
        next();
    });

    // provide one or more ways to format outgoing messages from botkit messages into 
    // the necessary format required by the platform API
    // at a minimum, copy all fields from `message` to `platform_message`
    controller.middleware.format.use(function (bot, message, platform_message, next) {
        console.log("\ninside middleware.format.use")
        //console.log("\neessage.channel: " + message.channel);

        for (var k in message) {
            platform_message[k] = message[k]
        }
        next();
    });

    // This is needed to find the botkit output.
    controller.middleware.categorize.use(function (bot, message, next) {
        console.log("\ninside middleware.categorize.use");
        console.log("\nmessage.channel: " + message.channel);

        if (message.type == 'message') {
            message.type = 'message_received';
        }
        next();
    });

    // provide a way to receive messages - normally by handling an incoming webhook as below!
    controller.handleWebhookPayload = function (req, res) {
        var payload = req.body;

        var bot = controller.spawn({});
        controller.ingest(bot, payload, res);

        res.status(200);
    };

    return controller;
}

module.exports = RocketChatBot;
