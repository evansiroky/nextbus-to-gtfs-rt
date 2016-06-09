var transitApi = require('transit-api')

var processServiceAlerts = require('./serviceAlerts.js'),
  processTripUpdates = require('./tripUpdates.js'),
  processVehiclePositions = require('./vehiclePositions.js')


var Transformer = function(cfg) {
  this.nextbus = new transitApi.NextBus(cfg.nextbusAgencyId)
  if(cfg.debug) {
    this.nextbus.debug = cfg.debug
  }
}

Transformer.prototype.processServiceAlerts = function(callback) {
  processServiceAlerts(this.nextbus, callback)
}

Transformer.prototype.processTripUpdates = function(callback) {
  processTripUpdates(this.nextbus, callback)
}

Transformer.prototype.processVehiclePositions = function(callback) {
  processVehiclePositions(this.nextbus, callback)
}


module.exports = Transformer