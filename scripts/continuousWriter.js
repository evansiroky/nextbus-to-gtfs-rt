var debug = require('debug')('ntgr.continuousWriter')

var writer = require('./writer.js'),
  util = require('./writerUtil.js')


var argOptions = util.baseCmdOptions

argOptions.s = {
  alias: 'seconds',
  demand: false,
  default: 60,
  describe: 'number of seconds to wait after execution of previous writer finishes',
  type: 'int'
}


var argv = require('yargs')
  .usage('Usage: $0 [options]')
  .example('$0 -a sf-muni -d output', 'Download the current state of the sf-muni NextBus Feed, Translate it to gtfs-rt and save to files, every minute.')
  .options(argOptions)
  .help('h')
  .alias('h', 'help')
  .argv;

var runAgain = function(err) {
  if(err) {
    debug(err)
  }
  setTimeout(function(){
    writer(argv, runAgain)
  }, argv.s * 1000);
}

writer(argv, runAgain)