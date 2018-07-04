var should = require('should');
var Botkit = require('botkit');
var rocketchatbot = require('../RocketChatBot.js');

var bot_options = {
    debug: false,
    studio_token: '',
    studio_command_uri: '',
    studio_stats_uri: '',
    rocketchat_host: 'localhost:3000',
    rocketchat_bot_user: 'botkit',
    rocketchat_bot_pass: 'botkit',
    rocketchat_ssl: 'false',
    rocketchat_bot_room: 'GENERAL',
    rocketchat_bot_direct_messages: 'true',
    rocketchat_bot_mention_rooms: 'channel1',
    rocketchat_bot_live_chat: 'true',
    rocketchat_bot_edited: 'true',
};

describe('Initialize', function() {
    it('should have Botkit instance', function(done) {
        should.exist(Botkit);
        should.exist(Botkit.core);
        done();
    });

    it('should have Botkit instance', function(done) {
        should.exist(rocketchatbot);
        done();
    });

});

describe('Start', function() {
    it('should start and then stop', function(done) {
        var controller = rocketchatbot({}, bot_options);
        done();
     });
});


describe('Utils functions', function() {
    var controller = rocketchatbot({}, bot_options);
    it('should return true about channel mention', async function() {
    console.log(controller)
       //var returnIsMentionRoom = await rocketchatbot.isMentionRoom('channel1');
       //assert.equal(true, returnIsMentionRoom);
    });
});
