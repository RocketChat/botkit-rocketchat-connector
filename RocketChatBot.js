// Botkit imports
var Botkit = require('botkit');
// RocketChat SDK
const { driver } = require('@rocket.chat/sdk');

// customize the following with your server and BOT account information
const HOST = 'localhost:5000';
const USER = 'botkit';
const PASS = 'botkit';
const BOTNAME = 'botkit';  // name  bot response to
const SSL = false;  // server uses https ?
const ROOMS = ['GENERAL']; // add more channels to this list

var myuserid;

const runbot = async () => {
    const conn = await driver.connect( { host: HOST, useSsl: SSL})
    myuserid = await driver.login({username: USER, password: PASS});
    const roomsJoined = await driver.joinRooms(ROOMS); 
    console.log('joined rooms');

    // set up subscriptions - rooms we are interested in listening to
    const subscribed = await driver.subscribeToMessages();
    console.log('subscribed');

    // connect the processMessages callback
    const msgloop = await driver.reactToMessages( processMessages );
    console.log('connected and waiting for messages');

    // when a message is created in one of the ROOMS, we 
    // receive it in the processMesssages callback

    // greets from the first room in ROOMS 
    const sent = await driver.sendToRoom( BOTNAME + ' is listening ...',ROOMS[0]);
    console.log('Greeting message sent');
}

// callback for incoming messages filter and processing
const processMessages = async(err, message, messageOptions) => {
    if (!err) {
      // filter our own message
      if (message.u._id === myuserid) return;
      // can filter further based on message.rid
      const roomname = await driver.getRoomName(message.rid);
      if (message.msg.toLowerCase().startsWith(BOTNAME)) {
        const response = message.u.username +
              ', how can ' + BOTNAME + ' help you with ' +
              message.msg.substr(BOTNAME.length + 1);
        const sentmsg = await driver.sendToRoom(response, roomname);
      }
    }
}
  
function RocketChatBot(botkit, config) {

    console.log("\n I'm in lib/RocketChatBot.js!!!\n")

    var controller = Botkit(config || {});

    controller.defineBot(function(botkit, config) {
        var bot = {
            type: 'rocketchat',
            botkit: botkit,
            config: config || {},
            utterances: botkit.utterances,
        }

        // here is where you make the API call to SEND a message
        // the message object should be in the proper format already
        bot.send = function(message, cb) {
            console.log('\n\n\nSEND: ', message);
        }

        // this function takes an incoming message (from a user) and an outgoing message (reply from bot)
        // and ensures that the reply has the appropriate fields to appear as a reply
        bot.reply = function(src, resp, cb) {
            var msg = {};

            if (typeof(resp) == 'string') {
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
        bot.findConversation = function(message, cb) {
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
    controller.middleware.normalize.use(function(bot, message, next) {
        console.log('NORMALIZE', message);
        next();  
    });
    
    return runbot();
    //return controller;
}

module.exports = RocketChatBot;
