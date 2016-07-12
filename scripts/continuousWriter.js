var argv = require('yargs')
  .usage('Usage: $0 [options]')
  .example('$0 -a sf-muni -d output', 'Download the current state of the sf-muni NextBus Feed, Translate it to gtfs-rt and save to files, every minute.')
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
    },
    s: {
      alias: 'seconds',
      demand: false,
      default: 60,
      describe: 'number of seconds to wait after execution of previous writer finishes',
      type: 'int'
    }
  })
  .help('h')
  .alias('h', 'help')
  .argv;

var writer = require('./writer.js')


var runAgain = function(err) {
  if(err) {
    console.log(err)
  }
  setTimeout(function(){
    writer(argv.a, argv.d, runAgain)
  }, argv.s * 1000);
}

writer(argv.a, argv.d, runAgain)