var assert = require('chai').assert,
  moment = require('moment'),
  nock = require('nock'),
  realtime = require('gtfs-realtime-bindings'),
  rimraf = require('rimraf')

var util = require('./util.js')


var BASE_URL_PATH = '/service/publicXMLFeed',
  NOCK_HOST = 'http://webservices.nextbus.com',
  FIXTURES_FOLDER = './test/fixtures'


var testTranslator = util.getTranslator()

describe('trip updates', function() {

  before(function(done) {
    rimraf('./cache', done)
  })

  describe('no cache', function() {
  
    it('should dl nextbus predictions and return trip updates protobuf', function(done) {

      this.timeout(60000)
      
      var nockScope = nock(NOCK_HOST)
        .get(BASE_URL_PATH + '?a=seattle-sc&command=routeList')
        .replyWithFile(200, FIXTURES_FOLDER + '/routeList.xml')
        .get(BASE_URL_PATH + '?a=seattle-sc&command=routeConfig')
        .replyWithFile(200, FIXTURES_FOLDER + '/routeConfig-all.xml')
        .get(BASE_URL_PATH + '?stops=SLU%7C1630_ar&stops=SLU%7C1619&stops=SLU%7C26665&stops=SLU%7C26645&stops=SLU%7C26641&' +
          'stops=SLU%7C26702&stops=SLU%7C26700&stops=SLU%7C26693_ar&stops=SLU%7C26705_ar&stops=SLU%7C26701&stops=SLU%7C26698&' +
          'stops=SLU%7C26693&stops=SLU%7C26690&stops=SLU%7C26689&stops=SLU%7C26680&stops=FHS%7C1551_ar&stops=FHS%7C1651&' +
          'stops=FHS%7C1661&stops=FHS%7C1671&stops=FHS%7C1681&stops=FHS%7C27500&stops=FHS%7C41988&stops=FHS%7C41986&' +
          'stops=FHS%7C41980&stops=FHS%7C11062&stops=FHS%7C11175_ar&stops=FHS%7C41970&stops=FHS%7C41908&stops=FHS%7C41904&' +
          'stops=FHS%7C27420&stops=FHS%7C1682&stops=FHS%7C1672&stops=FHS%7C1662&stops=FHS%7C1652&stops=FHS%7C1552&' +
          'a=seattle-sc&command=predictionsForMultiStops')
        .replyWithFile(200, FIXTURES_FOLDER + '/predictionsForMultiStops-1.xml')

      testTranslator.processTripUpdates(function(err, feedMessage) {

        nockScope.done()

        try {
        
          assert.isNotOk(err)

          //console.log(feedMessage)

          var entities = util.assertIsFeedMessageWithExactEntityLength(feedMessage, 2),
            tripUpdate = util.getEntityOfSpecificType('trip_update', entities, 0)

        } catch(e) {
          return done(e)
        }

        done()

      })
    })
  })
})