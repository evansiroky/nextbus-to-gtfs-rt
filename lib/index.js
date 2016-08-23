var Nextbus = require('./nextbus'),
  processServiceAlerts = require('./serviceAlerts.js'),
  processTripUpdates = require('./tripUpdates.js'),
  processVehiclePositions = require('./vehiclePositions.js')


var Transformer = function(cfg) {
  this.nextbusClient = new Nextbus(cfg.nextbusAgencyId)
  this.cacheExpiration = cfg.cacheExpiration
}

Transformer.prototype.processServiceAlerts = function(callback) {
  processServiceAlerts(this.nextbusClient, callback)
}

Transformer.prototype.processTripUpdates = function(callback) {
  processTripUpdates(this.nextbusClient, this.cacheExpiration, callback)
}

Transformer.prototype.processVehiclePositions = function(callback) {
  processVehiclePositions(this.nextbusClient, callback)
}


module.exports = Transformer