var fs = require('fs')

var chai = require('chai'),
  assert = chai.assert,
  async = require('async'),
  GtfsRealtimeBindings = require('gtfs-realtime-bindings'),
  nock = require('nock'),
  realtime = require('gtfs-realtime-bindings'),
  rimraf = require('rimraf')

chai.use(require('chai-json-schema'))

var writer = require('../scripts/writer.js')

var util = require('./util.js')


var BASE_URL_PATH = '/service/publicXMLFeed',
  NOCK_HOST = 'http://webservices.nextbus.com',
  FIXTURES_FOLDER = './test/fixtures'

var clean = function(done) {
  rimraf('./cache', function() {
    rimraf('./outputs', done)
  })
}

describe('writer', function() {

  beforeEach(clean)

  afterEach(clean)
  
  it('should download feed, translate to gtfs-rt and write files', function(done) {
    
    var nockScope = nock(NOCK_HOST)
      .get(BASE_URL_PATH)
      .query(util.makeQueryParams('messages', { t: 0 }))
      .replyWithFile(200, FIXTURES_FOLDER + '/messages.xml')
      .get(BASE_URL_PATH)
      .query(util.makeQueryParams('routeList'))
      .replyWithFile(200, FIXTURES_FOLDER + '/routeList.xml')
      .get(BASE_URL_PATH)
      .query(util.makeQueryParams('routeConfig'))
      .replyWithFile(200, FIXTURES_FOLDER + '/routeConfig-all.xml')
      .get(BASE_URL_PATH)
      .query(util.makeQueryParams('predictionsForMultiStops', util.predictionsForMultiStopsParams))
      .replyWithFile(200, FIXTURES_FOLDER + '/predictionsForMultiStops-ok.xml')
      .get(BASE_URL_PATH)
      .query(util.makeQueryParams('vehicleLocations', { t: 0, r: '' }))
      .replyWithFile(200, FIXTURES_FOLDER + '/vehicleLocations.xml')

    writer({ a: 'seattle-sc', d: './outputs' }, function(err) {

      try {

        assert.isNotOk(err)

        nockScope.done()

        // verify existance of files and conformity to gtfs-rt protobuf definition
        async.each([
            'service-alerts',
            'trip-updates',
            'vehicle-positions'
          ],
          function(item, fileCallback) {
            var filename = './outputs/' + item + '.proto'
            async.auto({
              assertFileExistance: function(cb) {
                fs.stat(filename, cb)
              },
              readFileContents: ['assertFileExistance', function(results, cb) {
                fs.readFile(filename, cb)
              }],
              assertIsGtfsRtProtobuf: ['readFileContents', function(results, cb) {
                try {
                  var feed = GtfsRealtimeBindings.FeedMessage.decode(results.readFileContents)
                  assert.jsonSchema(feed, require('./fixtures/gtfs-realtime.json'))
                } catch(e) {
                  return cb(e)
                }
                cb()
              }]
            }, fileCallback)
          },
          done)

      } catch(e) {
        return done(e)
      }

    })

  })
})