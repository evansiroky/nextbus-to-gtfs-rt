var assert = require('chai').assert,
  fs = require('fs-extra'),
  moment = require('moment'),
  nock = require('nock'),
  realtime = require('gtfs-realtime-bindings'),
  rimraf = require('rimraf')

var util = require('./util.js')


var BASE_URL_PATH = '/service/publicXMLFeed',
  NOCK_HOST = 'http://webservices.nextbus.com',
  FIXTURES_FOLDER = './test/fixtures'


var testTranslator = util.getTranslator()

var makeTripUpdateTestSuite = function(nockScope, done) {
  return function(err, feedMessage) {
    try {

      assert.isNotOk(err)

      nockScope.done()

      var entities = util.assertIsFeedMessageWithExactEntityLength(feedMessage, 26)

      util.assertAllEntitiesAreSameType('trip_update', entities)

      var tripUpdate = util.findEntity('trip_update', entities, '30982253')

      // trip, route id
      assert.deepPropertyVal(tripUpdate, 'trip.trip_id', '30982253')
      assert.deepPropertyVal(tripUpdate, 'trip.route_id', 'FHS')

      // vehicle
      assert.deepPropertyVal(tripUpdate, 'vehicle.id', '405')

      // stop time update
      assert.isArray(tripUpdate.stop_time_update)

      var yeslerAndBroadwayStopTime

      for (var i = tripUpdate.stop_time_update.length - 1; i >= 0; i--) {
        if(tripUpdate.stop_time_update[i].stop_id === '27500') {
          yeslerAndBroadwayStopTime = tripUpdate.stop_time_update[i]
          break
        }
      }

      assert.isObject(yeslerAndBroadwayStopTime)

      assert.propertyVal(yeslerAndBroadwayStopTime, 'stop_id', '27500')
      assert.deepProperty(yeslerAndBroadwayStopTime, 'arrival.time')
      util.assertUInt64(yeslerAndBroadwayStopTime.arrival.time, 1465514048)

    } catch(e) {
      return done(e)
    }

    done()
  }
}

describe('trip updates', function() {

  beforeEach(function(done) {
    rimraf('./cache', done)
  })

  describe('no cache', function() {
  
    it('should dl nextbus predictions and return trip updates protobuf', function(done) {
      
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
        .replyWithFile(200, FIXTURES_FOLDER + '/predictionsForMultiStops-ok.xml')

      testTranslator.processTripUpdates(makeTripUpdateTestSuite(nockScope, done))

    })
  })

  afterEach(function(done) {
    rimraf('./cache', done)
  })

  describe('with cache', function() {

    beforeEach(function(done) {
      // create cache dir
      fs.mkdir('./cache', function(err) {
        if(err) return done(err)
        fs.copy('./test/fixtures/routeStopPairs.json', './cache/routeStopPairs.json', done)
      })
    })

    it('should dl only the predictions and return trip updates protobuf', function(done) {

      var nockScope = nock(NOCK_HOST)
        .get(BASE_URL_PATH + '?stops=SLU%7C1630_ar&stops=SLU%7C1619&stops=SLU%7C26665&stops=SLU%7C26645&stops=SLU%7C26641&' +
          'stops=SLU%7C26702&stops=SLU%7C26700&stops=SLU%7C26693_ar&stops=SLU%7C26705_ar&stops=SLU%7C26701&stops=SLU%7C26698&' +
          'stops=SLU%7C26693&stops=SLU%7C26690&stops=SLU%7C26689&stops=SLU%7C26680&stops=FHS%7C1551_ar&stops=FHS%7C1651&' +
          'stops=FHS%7C1661&stops=FHS%7C1671&stops=FHS%7C1681&stops=FHS%7C27500&stops=FHS%7C41988&stops=FHS%7C41986&' +
          'stops=FHS%7C41980&stops=FHS%7C11062&stops=FHS%7C11175_ar&stops=FHS%7C41970&stops=FHS%7C41908&stops=FHS%7C41904&' +
          'stops=FHS%7C27420&stops=FHS%7C1682&stops=FHS%7C1672&stops=FHS%7C1662&stops=FHS%7C1652&stops=FHS%7C1552&' +
          'a=seattle-sc&command=predictionsForMultiStops')
        .replyWithFile(200, FIXTURES_FOLDER + '/predictionsForMultiStops-ok.xml')

      testTranslator.processTripUpdates(makeTripUpdateTestSuite(nockScope, done))

    })

    it('should refresh cache when a route-stop pair is invalid due to schedule change', function(done) {

      var nockScope = nock(NOCK_HOST)
        .get(BASE_URL_PATH + '?stops=SLU%7C1630_ar&stops=SLU%7C1619&stops=SLU%7C26665&stops=SLU%7C26645&stops=SLU%7C26641&' +
          'stops=SLU%7C26702&stops=SLU%7C26700&stops=SLU%7C26693_ar&stops=SLU%7C26705_ar&stops=SLU%7C26701&stops=SLU%7C26698&' +
          'stops=SLU%7C26693&stops=SLU%7C26690&stops=SLU%7C26689&stops=SLU%7C26680&stops=FHS%7C1551_ar&stops=FHS%7C1651&' +
          'stops=FHS%7C1661&stops=FHS%7C1671&stops=FHS%7C1681&stops=FHS%7C27500&stops=FHS%7C41988&stops=FHS%7C41986&' +
          'stops=FHS%7C41980&stops=FHS%7C11062&stops=FHS%7C11175_ar&stops=FHS%7C41970&stops=FHS%7C41908&stops=FHS%7C41904&' +
          'stops=FHS%7C27420&stops=FHS%7C1682&stops=FHS%7C1672&stops=FHS%7C1662&stops=FHS%7C1652&stops=FHS%7C1552&' +
          'a=seattle-sc&command=predictionsForMultiStops')
        .replyWithFile(200, FIXTURES_FOLDER + '/predictionsForMultiStops-error.xml')
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
        .replyWithFile(200, FIXTURES_FOLDER + '/predictionsForMultiStops-ok.xml')

      testTranslator.processTripUpdates(makeTripUpdateTestSuite(nockScope, done))

    })

  })

})