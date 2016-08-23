var assert = require('chai').assert,
  nock = require('nock'),
  realtime = require('gtfs-realtime-bindings')

var util = require('./util.js')


var BASE_URL_PATH = '/service/publicXMLFeed',
  FIXTURES_FOLDER = './test/fixtures',
  NOCK_HOST = 'http://webservices.nextbus.com'


var testTranslator = util.getTranslator()

describe('service alerts', function() {
  
  it('should dl nextbus messages and return service alert protobuf', function(done) {
    
    var nockScope = nock(NOCK_HOST)
      .get(BASE_URL_PATH)
      .query(util.makeQueryParams('messages', { t: 0 }))
      .replyWithFile(200, FIXTURES_FOLDER + '/messages.xml')

    testTranslator.processServiceAlerts(function(err, feedMessage) {

      nockScope.done()
      
      try {

        assert.isNotOk(err)

        var entities = util.assertIsFeedMessageWithExactEntityLength(feedMessage, 1)

        util.assertAllEntitiesAreSameType('alert', entities)

        var alert = util.findEntity('alert', entities, '1234')

        // alert active period
        assert.isArray(alert.active_period)
        assert.equal(alert.active_period.length, 1)

        var activePeriod = alert.active_period[0]
        util.assertUInt64(activePeriod.start, 1465380000)
        util.assertUInt64(activePeriod.end, 1465599600)

        // alert text
        assert.deepProperty(alert, 'header_text.translation')
        var translations = alert.header_text.translation

        assert.isArray(translations)
        assert.equal(translations.length, 1)

        var translation = translations[0]
        assert.propertyVal(translation, 'text', 'Construction activities nearby may cause intermitent closures.')
        assert.propertyVal(translation, 'language', 'en')

        // informed entities
        assert.isArray(alert.informed_entity)
        assert.equal(alert.informed_entity.length, 2)
        
        // route
        var routeEntity = alert.informed_entity[0]
        assert.isObject(routeEntity)
        assert.propertyVal(routeEntity, 'route_id', 'FHS')

        // route
        var routeStopEntity = alert.informed_entity[1]
        assert.isObject(routeStopEntity)
        assert.propertyVal(routeStopEntity, 'stop_id', '1672')
        assert.propertyVal(routeStopEntity, 'route_id', 'FHS')

      } catch(e) {
        return done(e)
      }
      
      done()

    })
  })
})