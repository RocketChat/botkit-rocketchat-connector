const { driver } = require('@rocket.chat/sdk');

// Utils functions
async function getRoomType(meta, message, channelList, botUserName) {
    // message_received type are not at the events list, if added the bot
    // will answer all messages
    var messageType = 'message_received';
    var mentionRoom = await isMentionRoom(message.rid, channelList)

    if (meta.roomType === 'd') {
        messageType = 'direct_message';
    } else if (meta.roomType === 'l') {
        messageType = 'live_chat';
    } else if ((meta.roomType === 'c' || meta.roomType === 'p') && !mentionRoom) {
        messageType = 'channel';
    } else if ((meta.roomType === 'c' || meta.roomType === 'p') && isMention(message, botUserName) && mentionRoom) {
        messageType = 'mention';
    }
    return messageType;
}

function handleMention(message, botUserName) {
    var text = ''    
    if (isMention(message, botUserName)) {
        // regex to remove words that begins with '@'
        text = message.msg.replace(/(^|\W)@(\w+)/g, '').replace(' ', '')
    } else {
        text = message.msg
    }
    return text
}

function isMention(message, botUserName) {
    var bot_mention = false
    if(message != undefined && botUserName != undefined) {
        for (var mention in message.mentions) {
            if (message.mentions[mention].username == botUserName) {
                bot_mention = true
            }
        }
    } else {
        console.log('message or botUserName undefined.')
    }

    return bot_mention
}

async function isMentionRoom(channel_id, channelList) {
    var mentionRoom = false;
    var channelName = await driver.getRoomName(channel_id)

    if (channelList != undefined && channel_id != undefined) {
        channelList = channelList.replace(/[^\w\,]/gi, '')
        if (channelList.match(',')) {
            channelList = (channelList.split(','))
            for (channel in channelList) {
                if (channelList[channel] == channelName) {
                    mentionRoom = true
                }
            }
        } else {
            if (channelList == channelName) {
                mentionRoom = true
            }
        }
    } else {
        console.log('channelList or channel_id undefined.')
    }
    return mentionRoom
}

module.exports = { getRoomType, handleMention, isMention, isMentionRoom }
