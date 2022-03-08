/**
 * @module botbuilder-adapter-rocketchat
 */

import { Activity, ActivityTypes, BotAdapter, ConversationReference, ResourceResponse, TurnContext , ChannelAccount} from 'botbuilder';
const { driver} = require('@rocket.chat/sdk')
import * as utils from "./utils";

export class RocketChatAdapter extends BotAdapter {
  /**
   * Name used to register this adapter with Botkit.
   * @ignore
   */
  name = 'Rocket.Chat Adapter';

  rocketChatOptions: RocketChatAdapterOptions;

  api: utils.RocketChatApi;

  connected: boolean;

  constructor(options: RocketChatAdapterOptions) {
    super();
    this.rocketChatOptions = options || null;
    this.api = new utils.RocketChatApiImpl();
  }

  /**
   * Botkit-only: Initialization function called automatically when used with Botkit.
   *      
   * @param botkit
   */
  async init(botkit) {
    try {
      // make the connection with RocketChat
      await this.api.connectAndLogin({ host: this.rocketChatOptions.rocketchat_host, useSsl: this.rocketChatOptions.rocketchat_ssl },
        { username: this.rocketChatOptions.rocketchat_bot_user, password: this.rocketChatOptions.rocketchat_bot_pass })
      await this.api.addToRooms(this.rocketChatOptions.rocketchat_bot_rooms);
      await driver.subscribeToMessages();
      this.connected = true
    } catch (error) {
      this.connected = false
      console.log(error)
      // This is a fatal error! Unable to connect to Rocket.Chat server.
      process.exit(1);
    }

    botkit.ready(async() => {

      if (this.connected) {
        var options = {
          dm: this.rocketChatOptions.rocketchat_bot_direct_messages,
          livechat: this.rocketChatOptions.rocketchat_bot_live_chat,
          edited: this.rocketChatOptions.rocketchat_bot_edited
        }

        if (this.rocketChatOptions.rocketchat_bot_live_chat){
          // change livechat bot status to availible
          // chat bot user should be livechat manager
          // there is no other APIs to do it. 
          // https://github.com/RocketChat/Rocket.Chat/issues/12793
          await this.api.changeLiveChatAgentStatus(this.rocketChatOptions.rocketchat_bot_user)
        }

        // trigger when every message is sent from any source enabled from
        // options
        driver.respondToMessages(async function (err, message, meta) {
          const conf = botkit._config;
          const rocketchatApi = botkit.adapter.getRocketChatAPI();
          message.type = await rocketchatApi.getRoomType(meta, message, conf.rocketchat_bot_mention_rooms, conf.rocketchat_bot_user)

          const activity = {
            timestamp: message.ts.$date,
            channelId: message.rid,
            conversation: {
              id: message.rid
            },
            from: {
              id: message.u._id,
              name: message.u.name
            } as ChannelAccount,
            recipient: {
              id: conf.rocketchat_bot_user
            },
            channelData: {},
            text: rocketchatApi.handleMention(message, conf.rocketchat_bot_user),
            type: message.type === 'message' ? ActivityTypes.Message : ActivityTypes.Event
          };

          // set botkit's event type
          if (activity.type !== ActivityTypes.Message) {
            activity.channelData = {
              botkitEventType: message.type,
              token: message.token
            }
          }

          const context = new TurnContext(botkit.adapter, activity as Activity);
          botkit.adapter.runMiddleware(context, botkit.handleTurn.bind(botkit))
            .catch((err) => { console.error(err.toString()); });
        }, options)
      }
    });
  }

  getRocketChatAPI(): utils.RocketChatApi {
    return this.api;
  }

  /**
   * Caste a message to the simple format 
   * @param activity
   * @returns a message ready to send back
   */
  private activityToMessage(activity: Activity) {
    const message = {
      attachments: activity.attachments || [],
      msg: activity.text,
      type: activity.type,
      user: activity.from.id
    };

    // if channelData is specified, overwrite any fields in message object
    if (activity.channelData) {
      Object.keys(activity.channelData).forEach(function (key) {
        message[key] = activity.channelData[key];
      });
    }
    return message;
  }

  public async sendActivities(context: TurnContext, activities: Partial<Activity>[]): Promise<ResourceResponse[]> {
    const responses = [];
    for (let a = 0; a < activities.length; a++) {
      const activity = activities[a];

      const message = this.activityToMessage(activity as Activity);
      const channel = context.activity.channelId;

      if (this.connected) {
        // handles every type of message
        if (message.type === 'direct_message') {
          await driver.sendDirectToUser(message, message.user)
        } else if (message.type === 'live_chat') {
          await driver.sendToRoomId(message, channel)
        } else if (message.type === 'mention') {
          await driver.sendToRoomId(message, channel)
        } else if (message.type === 'channel') {
          await driver.sendToRoomId(message, channel)
        } else if (message.type === 'message') {
          await driver.sendToRoomId(message, channel)
        }
      }
    }
    return responses;
  }

  public async updateActivity(context: TurnContext, activity: Partial<Activity>): Promise<void | ResourceResponse> {
    throw new Error('Method not implemented.');
  }
  public async deleteActivity(context: TurnContext, reference: Partial<ConversationReference>): Promise<void> {
    throw new Error('Method not implemented.');
  }

  continueConversation(reference: Partial<ConversationReference>, logic: (revocableContext: TurnContext) => Promise<void>): Promise<void> {
    const request = TurnContext.applyConversationReference(
      { type: 'event', name: 'continueConversation' },
      reference,
      true
    );
    const context = new TurnContext(this, request);

    return this.runMiddleware(context, logic);
  }
}

/**
 * This interface defines the options that can be passed into the RocketChatAdapter constructor function.
 */
export interface RocketChatAdapterOptions {
  rocketchat_host?: string,
  rocketchat_ssl?: boolean,
  rocketchat_bot_user?: string,
  rocketchat_bot_pass?: string,
  rocketchat_bot_rooms?: [string],
  rocketchat_bot_direct_messages?: boolean,
  rocketchat_bot_live_chat?: boolean,
  rocketchat_bot_edited?: boolean,
}