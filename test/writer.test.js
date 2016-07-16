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
      .get(BASE_URL_PATH + '?t=0&a=seattle-sc&command=messages')
      .replyWithFile(200, FIXTURES_FOLDER + '/messages.xml')
      .get(BASE_URL_PATH + '?a=seattle-sc&command=routeList')
      .replyWithFile(200, FIXTURES_FOLDER + '/routeList.xml')
      .get(BASE_URL_PATH + '?a=seattle-sc&command=routeConfig')
      .replyWithFile(200, FIXTURES_FOLDER + '/routeConfig-all.xml')
      .get(BASE_URL_PATH + '?stops=SLU%7C26680&stops=SLU%7C26689&stops=SLU%7C26690&stops=SLU%7C26693&' + 
        'stops=SLU%7C26698&stops=SLU%7C26701&stops=SLU%7C26705_ar&stops=SLU%7C26693_ar&stops=SLU%7C26700&' + 
        'stops=SLU%7C26702&stops=SLU%7C26641&stops=SLU%7C26645&stops=SLU%7C26665&stops=SLU%7C1619&' + 
        'stops=SLU%7C1630_ar&stops=FHS%7C1552&stops=FHS%7C1652&stops=FHS%7C1662&stops=FHS%7C1672&' + 
        'stops=FHS%7C1682&stops=FHS%7C27420&stops=FHS%7C41904&stops=FHS%7C41908&stops=FHS%7C41970&' + 
        'stops=FHS%7C11175_ar&stops=FHS%7C11062&stops=FHS%7C41980&stops=FHS%7C41986&stops=FHS%7C41988&' + 
        'stops=FHS%7C27500&stops=FHS%7C1681&stops=FHS%7C1671&stops=FHS%7C1661&stops=FHS%7C1651&' + 
        'stops=FHS%7C1551_ar&a=seattle-sc&command=predictionsForMultiStops')
      .replyWithFile(200, FIXTURES_FOLDER + '/predictionsForMultiStops-ok.xml')
      .get(BASE_URL_PATH + '?r=&t=0&a=seattle-sc&command=vehicleLocations')
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