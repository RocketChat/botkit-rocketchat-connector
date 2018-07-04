const should = require('should');
const assert = require('assert');
const Botkit = require('botkit');
const rocketchatbot = require('../RocketChatBot.js');
const utils= require('../utils.js');

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
    var botName = 'botName';
    var correctMessage = {
      mentions: [{username: botName}],
      msg: '@botName this is a simple message.',
    };
    var correctMessageWithoutMention = {
      mentions: [],
      msg: 'this is a simple message.',
    };

    it('should return true when the bot is metioned in the message', function() {
      var mention = utils.isMention(correctMessage, botName);
      assert.equal(true, mention)
    });

    it('should return false the bot is not mentioned', function() {
      var mention = utils.isMention(correctMessage, 'userMention');
      assert.equal(false, mention)
    });

    it('should the message without mentions', function() {
      var mention = utils.handleMention(correctMessage, botName);
      assert.equal('this is a simple message.', mention)
    });

    it('should the message without changes', function() {
      var mention = utils.handleMention(correctMessage, botName);
      assert.equal('this is a simple message.', mention)
    });
});

