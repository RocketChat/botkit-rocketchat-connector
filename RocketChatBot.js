// TODO: need to make it relative path
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
            // TODO: need to verify the real connection
            bot.connected = true;
        } catch (error) {
            bot.connected = false;
            console.log(error);
        }
        // send the first message to channel
        bot.send(config.rocketchat_bot_user + " is listening...");
        // test a reply message in channel
        bot.reply("reply message", 'ok');
    }

    // TODO: config it's not getting the correct values inside defineBot
    controller.defineBot(function (botkit, config) {
        console.log('Inside defineBot');
        var bot = {
            type: 'rocketchat',
            botkit: botkit,
            config: config || {},
            utterances: botkit.utterances,
        }

        bot.startConversation = function(message, cb) {
            botkit.startConversation(this, message, cb);
        };

        bot.createConversation = function(message, cb) {
            botkit.createConversation(this, message, cb);
        };
        
        bot.send = async function (message, cb) {                        
            if(bot.connected) {
                // TODO: need to configure the channel parameter
                const sent = await driver.sendToRoom(message, ROOMS[0]);            
                console.log('SEND: ', message);
            }            
        }

        // this function takes an incoming message (from a user) and an outgoing message (reply from bot)
        // and ensures that the reply has the appropriate fields to appear as a reply
        bot.reply = function (src, resp, cb) {
            console.log('reply')
            console.log("\n\n src: "+src);
            console.log("\n\n resp: "+resp);
            console.log("\n\n cb: "+cb);
            var msg = {};

            if (typeof (resp) == 'string') {
                msg.text = resp;
            } else {
                msg = resp;
            }

            msg.channel = src.channel;
            msg.to = src.user;

            console.log("\n bot.say: "+bot.say(msg, cb))
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
