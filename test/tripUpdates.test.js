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

  afterEach(function(done) {
    rimraf('./cache', done)
  })

  describe('no cache', function() {
  
    it('should dl nextbus predictions and return trip updates protobuf', function(done) {
      
      var nockScope = nock(NOCK_HOST)

      nockScope.get(BASE_URL_PATH)
        .query(util.makeQueryParams('routeList'))
        .replyWithFile(200, FIXTURES_FOLDER + '/routeList.xml')

      nockScope.get(BASE_URL_PATH)
        .query(util.makeQueryParams('routeConfig'))
        .replyWithFile(200, FIXTURES_FOLDER + '/routeConfig-all.xml')

      nockScope.get(BASE_URL_PATH)
        .query(util.makeQueryParams('predictionsForMultiStops', util.predictionsForMultiStopsParams))
        .replyWithFile(200, FIXTURES_FOLDER + '/predictionsForMultiStops-ok.xml')

      testTranslator.processTripUpdates(makeTripUpdateTestSuite(nockScope, done))

    })
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
        .get(BASE_URL_PATH)
        .query(util.makeQueryParams('predictionsForMultiStops', util.predictionsForMultiStopsParams))
        .replyWithFile(200, FIXTURES_FOLDER + '/predictionsForMultiStops-ok.xml')

      testTranslator.processTripUpdates(makeTripUpdateTestSuite(nockScope, done))

    })

    it('should refresh cache when a route-stop pair is invalid due to schedule change', function(done) {

      var nockScope = nock(NOCK_HOST)

      nockScope.get(BASE_URL_PATH)
        .query(util.makeQueryParams('predictionsForMultiStops', util.predictionsForMultiStopsParams))
        .replyWithFile(200, FIXTURES_FOLDER + '/predictionsForMultiStops-error.xml')

      nockScope.get(BASE_URL_PATH)
        .query(util.makeQueryParams('routeList'))
        .replyWithFile(200, FIXTURES_FOLDER + '/routeList.xml')

      nockScope.get(BASE_URL_PATH)
        .query(util.makeQueryParams('routeConfig'))
        .replyWithFile(200, FIXTURES_FOLDER + '/routeConfig-all.xml')

      nockScope.get(BASE_URL_PATH)
        .query(util.makeQueryParams('predictionsForMultiStops', util.predictionsForMultiStopsParams))
        .replyWithFile(200, FIXTURES_FOLDER + '/predictionsForMultiStops-ok.xml')

      testTranslator.processTripUpdates(makeTripUpdateTestSuite(nockScope, done))

    })

    describe('cache refresh', function() {

      beforeEach(function(done) {
        var threeHoursAgo = ((new Date()).getTime() - 10800000) / 1000
        fs.utimes('./cache/routeStopPairs.json', threeHoursAgo, threeHoursAgo, done)
      })

      it('should refresh cache when route-stop cache file is > 2hrs old', function(done) {

        var nockScope = nock(NOCK_HOST)

        nockScope.get(BASE_URL_PATH)
          .query(util.makeQueryParams('routeList'))
          .replyWithFile(200, FIXTURES_FOLDER + '/routeList.xml')

        nockScope.get(BASE_URL_PATH)
          .query(util.makeQueryParams('routeConfig'))
          .replyWithFile(200, FIXTURES_FOLDER + '/routeConfig-all.xml')

        nockScope.get(BASE_URL_PATH)
          .query(util.makeQueryParams('predictionsForMultiStops', util.predictionsForMultiStopsParams))
          .replyWithFile(200, FIXTURES_FOLDER + '/predictionsForMultiStops-ok.xml')

        var cacheTestTranslator = util.getTranslator({ 
          nextbusAgencyId: 'seattle-sc',
          cacheExpiration: 2
        })

        cacheTestTranslator.processTripUpdates(makeTripUpdateTestSuite(nockScope, done))

      })

    })

  })

})