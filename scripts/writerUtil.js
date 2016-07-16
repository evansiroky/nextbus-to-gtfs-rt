var util = {}

util.baseCmdOptions = {
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
  e: {
    alias: 'cache-expiration-time',
    demand: false,
    default: 24,
    describe: 'Number of hours between cache refreshes',
    type: 'int'
  }
}

module.exports = util