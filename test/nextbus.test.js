var assert = require('chai').assert,
  nock = require('nock')

var Nextbus = require('../lib/nextbus')

var util = require('./util.js')


var BASE_URL_PATH = '/service/publicXMLFeed',
  FIXTURES_FOLDER = './test/fixtures',
  nextbusClient = new Nextbus('seattle-sc', 200),
  NOCK_HOST = 'http://webservices.nextbus.com'


describe('nextbus', function() {

  describe('error handling', function() {

    it('should return a parse error upon receiving invalid XML', function(done) {

      var nockScope = nock(NOCK_HOST)
        .get(BASE_URL_PATH)
        .query(util.makeQueryParams('messages', { t: 0 }))
        .replyWithFile(200, FIXTURES_FOLDER + '/invalid-xml.xml')

      nextbusClient.messages(function(err) {

        nockScope.done()

        assert.isOk(err)
        assert.include(err.message, 'Non-whitespace before first tag')

        done()

      })

    })

    it('should return an error upon receiving valid XML without body tag', function(done) {

      var nockScope = nock(NOCK_HOST)
        .get(BASE_URL_PATH)
        .query(util.makeQueryParams('messages', { t: 0 }))
        .replyWithFile(200, FIXTURES_FOLDER + '/valid-xml.xml')

      nextbusClient.messages(function(err) {

        nockScope.done()

        assert.isOk(err)
        assert.equal(err.message, 'Unrecognized XML message format')

        done()

      })

    })

  })

  describe('retries after errors', function() {

    this.timeout(15000)
    this.slow(10000)

    it('should return an error after server connection timeout', function(done) {

      var nockScope = nock(NOCK_HOST)

      nockScope.get(BASE_URL_PATH)
        .query(util.makeQueryParams('messages', { t: 0 }))
        .delayConnection(60000)
        .replyWithFile(200, FIXTURES_FOLDER + '/messages.xml')

      nockScope.get(BASE_URL_PATH)
        .query(util.makeQueryParams('messages', { t: 0 }))
        .delayConnection(60000)
        .replyWithFile(200, FIXTURES_FOLDER + '/messages.xml')

      nockScope.get(BASE_URL_PATH)
        .query(util.makeQueryParams('messages', { t: 0 }))
        .delayConnection(60000)
        .replyWithFile(200, FIXTURES_FOLDER + '/messages.xml')

      nextbusClient.messages(function(err) {

        nockScope.done()

        assert.isOk(err)
        assert.equal(err.message, 'Maximum request retries exceeded')

        done()

      })

    })

    it('should return an error after server connection timeout', function(done) {

      var nockScope = nock(NOCK_HOST)

      nockScope.get(BASE_URL_PATH)
        .query(util.makeQueryParams('messages', { t: 0 }))
        .socketDelay(60000)
        .replyWithFile(200, FIXTURES_FOLDER + '/messages.xml')

      nockScope.get(BASE_URL_PATH)
        .query(util.makeQueryParams('messages', { t: 0 }))
        .socketDelay(60000)
        .replyWithFile(200, FIXTURES_FOLDER + '/messages.xml')

      nockScope.get(BASE_URL_PATH)
        .query(util.makeQueryParams('messages', { t: 0 }))
        .socketDelay(60000)
        .replyWithFile(200, FIXTURES_FOLDER + '/messages.xml')

      nextbusClient.messages(function(err) {

        nockScope.done()

        assert.isOk(err)
        assert.equal(err.message, 'Maximum request retries exceeded')

        done()

      })

    })

    it('should return an error after receiving non-200 http status response', function(done) {

      var nockScope = nock(NOCK_HOST)

      nockScope.get(BASE_URL_PATH)
        .query(util.makeQueryParams('messages', { t: 0 }))
        .reply(500)

      nockScope.get(BASE_URL_PATH)
        .query(util.makeQueryParams('messages', { t: 0 }))
        .reply(500)

      nockScope.get(BASE_URL_PATH)
        .query(util.makeQueryParams('messages', { t: 0 }))
        .reply(500)

      nextbusClient.messages(function(err) {

        nockScope.done()

        assert.isOk(err)
        assert.equal(err.message, 'Maximum request retries exceeded')

        done()

      })

    })

  })

})