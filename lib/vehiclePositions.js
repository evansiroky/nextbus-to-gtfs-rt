var updateVehicles = function(callback) {
  var msg = makeMessageTemplate();
  nextbus.vehicleLocations().then(function(data) {
    var vehicles = ensureArray(data.vehicle);
    for (var i = 0; i < vehicles.length; i++) {
      curVehicle = vehicles[i];
      msg.add('entity', new realtime.FeedEntity({
        id: 'Vehicle Position ' + i,
        vehicle: new realtime.VehiclePosition({
          position: new realtime.Position({
            latitude: curVehicle.lat,
            longitude: curVehicle.lon,
            bearing: curVehicle.heading,
            speed: curVehicle.speedKmHr ? parseFloat(curVehicle.speedKmHr) * 0.277778 : 0
          }),
          timestamp: moment().unix() - parseInt(curVehicle.secsSinceReport, 10),
          vehicle: new realtime.VehicleDescriptor({
            id: curVehicle.id
          })
        })
      }));
    };
    writeMsgToFile('vehicles.proto', msg, callback)
  });
}