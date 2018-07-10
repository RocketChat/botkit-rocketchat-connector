const should = require('should')
const assert = require('assert')
const Botkit = require('botkit')
const rocketchatbot = require('../RocketChatBot.js')
const utils = require('../utils.js')

var botOptions = {
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
  rocketchat_bot_edited: 'true'
}

describe('Initialize', function () {
  it('should have Botkit instance', function (done) {
    should.exist(Botkit)
    should.exist(Botkit.core)
    done()
  })

  it('should have Botkit instance', function (done) {
    should.exist(rocketchatbot)
    done()
  })
})

describe('Start', function () {
  it('should start and then stop', function (done) {
    var controller = rocketchatbot({}, botOptions)
    done()
  })
})

describe('Utils functions', function () {
  const correctBotName = 'botName'
  const correctMessage = {
    mentions: [{ username: correctBotName }],
    msg: '@botName this is a simple message.'
  }
  const correctMetaChannel = {roomType: 'c'}
  const correctMetaDirectMessage = {roomType: 'd'}
  const correctMetaLiveChat = {roomType: 'l'}
  const correctChannelList = 'channel'

  it('should return true when the bot is metioned in the message', function () {
    var result = utils.isMention(correctMessage, correctBotName)
    assert.equal(true, result)
  })

  it('should return false the bot is not mentioned', function () {
    var result = utils.isMention(correctMessage, 'userMention')
    assert.equal(false, result)
  })

  it('should the message without mentions', function () {
    var result = utils.handleMention(correctMessage, correctBotName)
    assert.equal('this is a simple message.', result)
  })

  it('should the message without changes', function () {
    var result = utils.handleMention(correctMessage, correctBotName)
    assert.equal('this is a simple message.', result)
  })

  it('should return false with no parameters', async function () {
    var result = await utils.isMentionRoom()
    assert.equal(false, result)
  })

  it('should return channel', async function () {
    var result = await utils.getRoomType(correctMetaChannel, correctMessage, correctChannelList, correctBotName)
    assert.equal('channel', result)
  })

  it('should return direct_message', async function () {
    var result = await utils.getRoomType(correctMetaDirectMessage, correctMessage, correctChannelList, correctBotName)
    assert.equal('direct_message', result)
  })

  it('should return live_chat', async function () {
    var result = await utils.getRoomType(correctMetaLiveChat, correctMessage, correctChannelList, correctBotName)
    assert.equal('live_chat', result)
  })
})
