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
        bot.reply({}, 'biscoito');
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

        bot.startConversation = function (message, cb) {
            botkit.startConversation(this, message, cb);
        };

        bot.createConversation = function (message, cb) {
            botkit.createConversation(this, message, cb);
        };

        bot.send = async function (message, cb) {
            console.log("\ninside bot.send")
            console.log("\nmessage: "+message.text)
            if (bot.connected) {
                // TODO: need to configure the channel parameter                
                const sent = await driver.sendToRoom(message, ROOMS[0]);
                console.log('SEND: ', message);
            }
        }

        // this function takes an incoming message (from a user) and an outgoing message (reply from bot)
        // and ensures that the reply has the appropriate fields to appear as a reply
        bot.reply = async function (src, resp, cb) {          
            // callback for incoming messages filter and processing
            const processMessages = async (err, message, messageOptions) => {
                if (!err) {
                    // filter our own message
                    if (message.u._id === myuserid) return;
                    // can filter further based on message.rid
                    const roomname = await driver.getRoomName(message.rid);
                    const response = 'I receive this message: ' + resp.text
                    const sentmsg = await driver.sendToRoom(response, roomname);
                }
            }           
            
            // connect the processMessages callback
            const msgloop = await driver.reactToMessages(processMessages);
            console.log('connected and waiting for messages');

            console.log('\ninside reply')
            console.log("\nsrc.channel: " + src.text);
            if (typeof (resp) == 'string') {
                resp = {
                    text: resp
                };
            }

            resp.channel = 'socket';
            resp.to = src.user;

            console.log("\nbefore bot.say")

            bot.say(resp, cb);

            console.log("\nafter bot.say")
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

    // provide one or more normalize middleware functions that take a raw incoming message
    // and ensure that the key botkit fields are present -- user, channel, text, and type
    controller.middleware.normalize.use(function (bot, message, next) {

        console.log('NORMALIZE', message);
        next();

    });

    controller.middleware.format.use(function (bot, message, platform_message, next) {
        for (var k in message) {
            platform_message[k] = message[k]
        }
        next();
        console.log("\ninside middleware.format.use")
    });

    controller.middleware.categorize.use(function(bot, message, next) {
        console.log("\ninside middleware.categorize.use")
        if (message.type == 'message') {
            message.type = 'message_received';
        }

        next();

    });

    // provide a way to receive messages - normally by handling an incoming webhook as below!
    controller.handleWebhookPayload = function (req, res) {        
        // var payload = req.body;

        // var bot = controller.spawn({});
        // controller.ingest(bot, payload, res);

        // res.status(200);
    };

    return controller;
}

module.exports = RocketChatBot;
