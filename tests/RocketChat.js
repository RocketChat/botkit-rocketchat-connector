var should = require('should');
var Botkit = require('botkit');
var rocketchatbot = require('../RocketChatBot.js');

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
        rocketchat_bot_live_chat: 'true',
        rocketchat_bot_edited: 'true',
    };

    it('should start and then stop', function(done) {
        var controller = rocketchatbot({}, bot_options);
        done();
     });
});
