var assert = require('chai').assert,
  moment = require('moment'),
  nock = require('nock'),
  realtime = require('gtfs-realtime-bindings')

var util = require('./util.js')


var BASE_URL_PATH = '/service/publicXMLFeed',
  NOCK_HOST = 'http://webservices.nextbus.com',
  FIXTURES_FOLDER = './test/fixtures'


var testTranslator = util.getTranslator()

describe('vehicle positions', function() {
  
  it('should dl nextbus vehicle locations and return vehicle positions protobuf', function(done) {
    
    var nockScope = nock(NOCK_HOST)
      .get(BASE_URL_PATH + '?r=&t=0&a=test&command=vehicleLocations')
      .replyWithFile(200, FIXTURES_FOLDER + '/vehicle-locations.xml')

    testTranslator.processVehiclePositions(function(err, feedMessage) {

      nockScope.done()

      try {
      
        assert.isNotOk(err)

        var entities = util.assertIsFeedMessageWithExactEntityLength(feedMessage, 2),
          vehicle = util.getEntityOfSpecificType('vehicle', entities, 0)

        // id
        assert.deepPropertyVal(vehicle, 'vehicle.id', '1234')

        // position
        assert.deepPropertyVal(vehicle, 'position.latitude', 35.59288)
        assert.deepPropertyVal(vehicle, 'position.longitude', -82.55589)
        assert.deepPropertyVal(vehicle, 'position.bearing', 219)
        assert.deepProperty(vehicle, 'position.speed')
        assert.approximately(vehicle.position.speed, 7.5, 0.00001)

        // timestamp
        assert.isBelow(util.getUInt64(vehicle.timestamp), moment().subtract(20, 'seconds').unix())

      } catch(e) {
        return done(e)
      }

      done()

    })
  })
})