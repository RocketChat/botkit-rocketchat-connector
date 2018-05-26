// Botkit imports, need to make it relative path
var Botkit = require('./node_modules/botkit/lib/CoreBot.js');
// RocketChat SDK
const { driver } = require('@rocket.chat/sdk');

const ROOMS = ['GENERAL'];
const SSL = false;


function RocketChatBot(botkit, config) {    
    console.log("\nI'm in lib/RocketChatBot.js!!!\n")

    var controller = Botkit(config || {});

    var myuserid;
    // this simple bot does not handle errors, different messsage types, server resets 
    // and other production situations 

    controller.startBot = async () => {
        console.log(config);
        const conn = await driver.connect({ host: config.rocketchat_host, useSsl: SSL })
        myuserid = await driver.login({ username: config.rocketchat_bot_user, password: config.rocketchat_bot_pass });
        const roomsJoined = await driver.joinRooms(ROOMS);
        console.log('joined rooms');

        // set up subscriptions - rooms we are interested in listening to
        const subscribed = await driver.subscribeToMessages();
        console.log('subscribed');

        // connect the processMessages callback
        const msgloop = await driver.reactToMessages(processMessages);
        console.log('connected and waiting for messages');

        // when a message is created in one of the ROOM, we 
        // receive it in the processMesssages callback

        // greets from the first room in rooms
        const sent = await driver.sendToRoom(config.rocketchat_bot_user + ' is listening ...', ROOMS[0]);
        console.log('Greeting message sent');
    }

    // callback for incoming messages filter and processing
    const processMessages = async (err, message, messageOptions) => {
        if (!err) {
            // filter our own message
            if (message.u._id === myuserid) return;
            // can filter further based on message.rid
            const roomname = await driver.getRoomName(message.rid);
            if (message.msg.toLowerCase().startsWith(config.rocketchat_bot_user)) {
                const response = message.u.username +
                    ', how can ' + config.rocketchat_bot_user + ' help you with ' +
                    message.msg.substr(config.rocketchat_bot_user.length + 1);
                const sentmsg = await driver.sendToRoom(response, roomname);
            }
        }
    }   

    controller.defineBot(function (botkit, config) {
        var bot = {
            type: 'rocketchat',
            botkit: botkit,
            config: config || {},
            utterances: botkit.utterances,
        }

        // here is where you make the API call to SEND a message
        // the message object should be in the proper format already
        bot.send = function (message, cb) {
            console.log('\n\n\nSEND: ', message);
        }

        // this function takes an incoming message (from a user) and an outgoing message (reply from bot)
        // and ensures that the reply has the appropriate fields to appear as a reply
        bot.reply = function (src, resp, cb) {
            var msg = {};

            if (typeof (resp) == 'string') {
                msg.text = resp;
            } else {
                msg = resp;
            }

            msg.channel = src.channel;
            msg.to = src.user;

            bot.say(msg, cb);
        };

        // this function defines the mechanism by which botkit looks for ongoing conversations
        // probably leave as is!
        bot.findConversation = function (message, cb) {
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


    // provide one or more normalize middleware functions that take a raw incoming message
    // and ensure that the key botkit fields are present -- user, channel, text, and type    
    controller.middleware.normalize.use(function (bot, message, next) {
        console.log('NORMALIZE', message);
        next();
    });

    // provide one or more ways to format outgoing messages from botkit messages into 
    // the necessary format required by the platform API
    // at a minimum, copy all fields from `message` to `platform_message`
    controller.middleware.format.use(function (bot, message, platform_message, next) {
        for (var k in message) {
            platform_message[k] = message[k]
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
