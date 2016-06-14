var fs = require('fs')

var async = require('async')

var Translator = require('../lib/index.js')


var writer = function(nextbusAgencyId, outputDir, callback) {

  var translator = new Translator({ 
    nextbusAgencyId: nextbusAgencyId
  })

  var makeFeedWriter = function(feedType) {
    
    var feedInfo = {
      alerts: {
        fn: 'processServiceAlerts',
        file: 'service-alerts'
      },
      trips: {
        fn: 'processTripUpdates',
        file: 'trip-updates'
      },
      vehicles: {
        fn: 'processVehiclePositions',
        file: 'vehicle-positions'
      }
    }

    return function(feedCallback) {
      async.auto({
        downloadAndTranslate: function(cb) {
          translator[feedInfo[feedType].fn](cb)
        },
        makeOutputDir: ['downloadAndTranslate', function(results, cb) {
          fs.mkdir(outputDir, function(err) {
            if(err && err.code === 'EEXIST') {
              cb()
            } else {
              cb(err)
            }
          })
        }],
        write: ['makeOutputDir', function(results, cb) {
          try {
            var binaryData = results.downloadAndTranslate.encode().toBuffer()
          } catch(e) {
            cb(e)
          }
          fs.writeFile(outputDir + '/' + feedInfo[feedType].file + '.proto', binaryData, cb)
        }]
      }, feedCallback)
    }
  }

  async.parallel([
      makeFeedWriter('alerts'),
      makeFeedWriter('trips'),
      makeFeedWriter('vehicles')
    ],
    callback)

}

var invocation = (require.main === module) ? 'direct' : 'required'

if (invocation === 'direct') {
  var argv = require('yargs')
    .usage('Usage: $0 [options]')
    .example('$0 -a sf-muni -d output', 'Download the current state of the sf-muni NextBus Feed, Translate it to gtfs-rt and save to files')
    .options({
      a: {
        alias: 'agency-id',
        demand: true,
        describe: 'The NextBus Agency Id',
        type: 'string'
      },
      d: {
        alias: 'output-directory',
        demand: false,
        default: './',
        describe: 'the directory to save files to',
        type: 'string'
      }
    })
    .help('h')
    .alias('h', 'help')
    .argv;

  writer(argv.a, argv.d)
} else {
  module.exports = writer
}