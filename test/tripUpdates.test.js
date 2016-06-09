var assert = require('chai').assert,
  moment = require('moment'),
  //nock = require('nock'),
  realtime = require('gtfs-realtime-bindings')

var util = require('./util.js')


var BASE_URL_PATH = '/service/publicXMLFeed',
  NOCK_HOST = 'http://webservices.nextbus.com',
  FIXTURES_FOLDER = './test/fixtures'


var testTranslator = util.getTranslator()

describe('trip updates', function() {
  
  it('should dl nextbus predictions and return trip updates protobuf', function(done) {

    this.timeout(60000)
    
    /*var nockScope = nock(NOCK_HOST)
      .get(BASE_URL_PATH + '?r=&t=0&a=test&command=vehicleLocations')
      .replyWithFile(200, FIXTURES_FOLDER + '/vehicle-locations.xml')*/

    testTranslator.processTripUpdates(function(err, feedMessage) {

      //nockScope.done()

      try {
      
        assert.isNotOk(err)

        console.log(feedMessage)

        var entities = util.assertIsFeedMessageWithExactEntityLength(feedMessage, 2),
          tripUpdate = util.getEntityOfSpecificType('trip_update', entities, 0)

      } catch(e) {
        return done(e)
      }

      done()

    })
  })
})