const { driver, api } = require('@rocket.chat/sdk')

export interface RocketChatApi {
  getRoomType(meta, message, channelList: [string], botUserName: string): Promise<string>;
  handleMention(message, botUserName: string): string;
  isMentionRoom(channelId: string, channelList: [string]): Promise<boolean>;
  addToRooms(channelList: [string]): void;
  forwardLiveChat(roomId: string, userId: string): void;
  getUserInfoByName(username: string): Promise<any>;
  getLiveChatInfo(roomId: string, token: string): Promise<any>;
  changeLiveChatAgentStatus(username: string): Promise<any>;
  getLiveChatAgentStatus(): Promise<any>;
  getOmnichannelContact(contactId: string): Promise<any>;
}

export class RocketChatApiImpl implements RocketChatApi {
  constructor() {
  }

  // Utils functions
  async getRoomType(meta, message, channelList: [string], botUserName: string): Promise<string> {
    // message_received type are not at the events list, if added the bot
    // will answer all messages
    var messageType = 'message_received'
    var mentionRoom = await this.isMentionRoom(message.rid, channelList)

    if (meta.roomType === 'd') {
      messageType = 'direct_message'
    } else if (meta.roomType === 'l') {
      messageType = 'live_chat'
    } else if ((meta.roomType === 'c' || meta.roomType === 'p') && !mentionRoom) {
      messageType = 'channel'
    } else if ((meta.roomType === 'c' || meta.roomType === 'p') && this.isMention(message, botUserName) && mentionRoom) {
      messageType = 'mention'
    }
    return messageType
  }

  handleMention(message, botUserName: string): string {
    var text = ''
    if (this.isMention(message, botUserName)) {
      // regex to remove words that begins with '@'
      text = message.msg.replace(/(^|\W)@(\w+)/g, '').replace(' ', '')
    } else {
      text = message.msg
    }
    return text
  }

  async isMentionRoom(channelId, channelList): Promise<boolean> {
    var mentionRoom = false
    var channel

    if (channelList !== undefined && channelId !== undefined) {
      var channelName = await driver.getRoomName(channelId)
      if (channelName !== undefined) {
        channelName = channelName.toLowerCase()
      }
      channelList = channelList.replace(/[^\w\,._]/gi, '').toLowerCase()
      if (channelList.match(',')) {
        channelList = (channelList.split(','))
        for (channel in channelList) {
          console.log(channelList[channel])
          console.log(channelName)
          if (channelList[channel] === channelName) {
            mentionRoom = true
          }
        }
      } else {
        if (channelList === channelName) {
          mentionRoom = true
        }
      }
    }
    return mentionRoom
  }
  isMention(message, botUserName): boolean {
    var botMention = false
    if (message !== undefined && botUserName !== undefined) {
      for (var mention in message.mentions) {
        if (message.mentions[mention].username === botUserName) {
          botMention = true
        }
      }
    }
    return botMention
  }

  async addToRooms(channelList) {
    var rooms = (channelList.split(','))
    for (var i in rooms) {
      rooms[i] = rooms[i].replace(/^\s+|\s+$/g, '')
    }
    try {
      await driver.joinRooms(rooms)
    } catch (error) {
      console.log(error)
    }
  }

  async forwardLiveChat(roomId: string, userId: string) {
    var data = {
      "roomId": roomId,
      "userId": userId,
    };
    try {
      await api.post("livechat/room.forward", data, true);
    } catch (error) {
      //skip it if there is no error
      if (error) {
        console.log(error);
      }
    }
  }

  async getUserInfoByName(username: string): Promise<any> {
    const alls = await api.users.all();
    for (const user of alls) {
      if (user.name === username) {
        return user
      }
    }
    return null
  }

  async getLiveChatInfo(roomId: string, token: string): Promise<any> {
    return await api.get("livechat/room", { "rid": roomId, "token": token }, true);
  }

  async changeLiveChatAgentStatus(username: string): Promise<any> {
    const res = await api.post("livechat/users/agent",{"username": username}, true);
    return res;
  }

  async getLiveChatAgentStatus(): Promise<any> {
    const res = await api.get("livechat/users/agent", true);
    return res;
  }

  async getOmnichannelContact(contactId: string): Promise<any> {
    const res = await api.get("omnichannel/contact?contactId="+ contactId, true);
    return res;
  }
}
