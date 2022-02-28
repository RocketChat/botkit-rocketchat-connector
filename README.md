# botkit-rocketchat-connector

## Brief
A Botkit platform connector for Rocket.Chat

This is a work in progress for the two communities to collaborate on to achieve the integration proposed in [this issue](https://github.com/RocketChat/Rocket.Chat/issues/9937) on the main Rocket.Chat project.

We will follow the [guide here](https://botkit.ai/docs/howto/build_connector.html) to create a module that can be required by Botkit bots as a controller for Rocket.Chat. The outcome will be something like the current Slack integration, which is packaged with Botkit, [here](https://github.com/howdyai/botkit/blob/master/lib/SlackBot.js).

This work will pair with another project to provide a starter bot, implimenting this connector. The starter bot will provide most of the documentation. e.g Similar to [botkit-start-slack](https://github.com/howdyai/botkit-starter-slack), problably a [botkit middleware](https://github.com/howdyai/botkit/blob/master/docs/readme-middlewares.md) will be used to build it.

It may also end up being moved to be maintained under the [howdyai](https://github.com/howdyai) organisation, depending on what makes sense for the contributors doing most of the maintenance.

The code have some `console.log()` and **// TO DO: [...]** comments, this annotations will not remain when **version 1.0** is ready.

## botkit-starter-rocketchat

Do not forget to see the [botkit-starter-rocketchat](https://github.com/RocketChat/botkit-starter-rocketchat) there the connector is used and the needed configuration is made to make your botkit run in RocketChat.

## Sample of creating a bot with Rocket.Chat adpter

```
const { RocketChatAdapter } = require('botkit-rocketchat-connector')
const { Botkit } = require('botkit');

// the environment variables from RocketChat is passed in bot_options
var botOptions = {
  debug: true,
  rocketchat_host: "127.0.0.1:3000",
  rocketchat_bot_user: "bot_name",
  rocketchat_bot_pass: "bot_pass",
  rocketchat_ssl: false,
  rocketchat_bot_rooms: ["general"],
  rocketchat_bot_mention_rooms: [],
  rocketchat_bot_direct_messages: true,
  rocketchat_bot_live_chat: true,
  rocketchat_bot_edited: true
}

const adapter = new RocketChatAdapter(botOptions);
var controller = new Botkit({ adapter: adapter})

// imports local conversations if need
controller.loadModules(__dirname + '/skills')
controller.hears(['hello', 'hi'], 'live_chat', async function (bot, message) {
  //greating an user  
  await bot.reply(message, 'Hello ' + message.reference.user.name + '!!');
});

```

