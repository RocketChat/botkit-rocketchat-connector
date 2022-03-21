import { BotWorker } from 'botkit';
import { ChannelAccount , ConversationAccount} from 'botbuilder'


/** 
* ```javascript
* // spawn a bot for a given team.
* let bot = await controller.spawn();
*
* // start a messagging with live chat a client
* await bot.startConversationInLiveChat("PLX2NiydXySsepLjj", "guest-2");
*
* // send a message
* await bot.say('Hi user');
*/
export class RocketChatBotWorker extends BotWorker {
    public async startConversationInLiveChat(channelId: string, clietnId: string): Promise<any> {
        return this.changeContext({
            user: { id: clietnId } as ChannelAccount,
            conversation: { id: channelId } as ConversationAccount,
            channelId: channelId,
            bot: {id:""} as ChannelAccount 
        });
    }
}