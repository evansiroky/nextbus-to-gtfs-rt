var moment = require('moment'),
  parseArgs = require('minimist'),
  realtime = require('gtfs-realtime-bindings'),
  transit_api = require('transit-api');

// prepare GTFS-RT Protos
var curTripUpdates, curServiceAlerts, curVehiclePositions;

// prepare NextBus api
var args = parseArgs(process.argv.slice(2)),
  nextbus = new transit_api.NextBus(args.a);

var makeMessageTemplate = function() {
  return new realtime.FeedMessage({
    header: new realtime.FeedHeader({
      gtfs_realtime_version: '1.0',
      timestamp: moment().unix()
    })
  });
}

var makeSimpleEnglishTranslatedString = function(text) {
  var translation = new realtime.TranslatedString();
  translation.translation.push(new realtime.TranslatedString.Translation({
    language: 'en',
    text: text
  }));
  return translation;
}

var getEpochTime = function(timeStr) {
  return timeStr ? ( parseInt(timeStr, 10) / 1000 ) : null;
}

var ensureArray = function(obj) {
  if(!(obj instanceof Array)) {
    return [obj];
  }
  return obj;
}

var updateTrips = function() {
  var msg = makeMessageTemplate();
  curTripUpdates = msg;

  var getMultiPredictions = function(routeStopPairs) {
    console.log('getMultiPredictions');
    // requests predictions for each route/stop combo
    nextbus.predictionsForMultiStops(routeStopPairs).then(function(predictions) {
      predictions = ensureArray(predictions);
      for (var i = 0; i < predictions.length; i++) {
        predictions[i]
      };
    });
  }

  var getRouteStops = function(routeTags) {
    // requests list of all stops at each route
    nextbus.routeConfig(routeTags).then(function(routeStops) {
      routeStops = ensureArray(routeStops);
      var predictionStopsToRequest = {},
        curNumRouteStopPairs = 0;
      for (var i = 0; i < routeStops.length; i++) {
        var stops = ensureArray(routeStops[i].stop),
          curRouteTag = routeStops[i].tag;
        for (var j = 0; j < stops.length; j++) {
          if(!predictionStopsToRequest[curRouteTag]) {
            predictionStopsToRequest[curRouteTag] = []
          }
          predictionStopsToRequest[curRouteTag].push(stops[j].tag);
          curNumRouteStopPairs++;
          if(curNumRouteStopPairs == 150) {
            getMultiPredictions(predictionStopsToRequest);
            predictionStopsToRequest = {};
            curNumRouteStopPairs = 0;
          }
        };
      };
      if(curNumRouteStopPairs > 0) {
        getMultiPredictions(predictionStopsToRequest);
      }
    });
  }

  nextbus.routeList().then(function(routes) {
    routes = ensureArray(routes);
    var routesToRequest = [];
    for (var i = 0; i < routes.length; i++) {
      routesToRequest.push(routes[i].tag);
      if(routesToRequest.length == 100) {
        getRouteStops(routesToRequest);
        routesToRequest = [];
      }
    }
    if(routesToRequest.length > 0) {
      getRouteStops(routesToRequest);
    }
  });
  
}

var updateAlerts = function() {
  var msg = makeMessageTemplate(),
    nextBusMessageIds = [];
  nextbus.messages().then(function(messages) {
    var messagesByRoute = ensureArray(messages.route);
    console.log(messagesByRoute[4].message[0]);
    for (var i = 0; i < messagesByRoute.length; i++) {
      var routeMessages = ensureArray(messagesByRoute[i].message);

      for (var j = 0; j < routeMessages.length; j++) {
        curMsg = routeMessages[j];

        // check if message is already added elsewhere
        if(nextBusMessageIds.indexOf(curMsg.id) == -1) {

          // create alert message
          var alert = new realtime.Alert({
            header_text: makeSimpleEnglishTranslatedString(curMsg.text)
          });

          // add active_periods if provided
          if(curMsg.startBoundary || curMsg.endBoundary) {
            alert.active_period.push(new realtime.TimeRange({
              start: getEpochTime(curMsg.startBoundary),
              end: getEpochTime(curMsg.endBoundary)
            }));
          }

          // add route stop combos if provided
          if(curMsg.routeConfiguredForMessage) {
            var curMsgRoutes = ensureArray(curMsg.routeConfiguredForMessage);
            for (var k = 0; k < curMsgRoutes.length; k++) {
              var curRoute = curMsgRoutes[k];
              alert.informed_entity.push(new realtime.EntitySelector({
                route_id: curRoute.tag
              }));
              if(curRoute.stop) {
                curRouteStops = ensureArray(curRoute.stop);
                for (var l = 0; l < curRouteStops.length; l++) {
                  alert.informed_entity.push(new realtime.EntitySelector({
                    route_id: curRoute.tag,
                    stop_id: curRouteStops[l].tag
                  }));
                };
              }
            };
          }

          // add alert to overall feed message
          msg.entity.push(alert);

          // mark message id as processed
          nextBusMessageIds.push(curMsg.id);
        }
      }
    }
    curServiceAlerts = msg;
  });
}

var updateVehicles = function() {
  var msg = makeMessageTemplate();
  nextbus.vehicleLocations().then(function(data) {
    var vehicles = ensureArray(data.vehicle);
    for (var i = 0; i < vehicles.length; i++) {
      curVehicle = vehicles[i];
      msg.entity.push(new realtime.VehiclePosition({
        position: new realtime.Position({
          latitude: curVehicle.lat,
          longitude: curVehicle.lon,
          bearing: curVehicle.heading,
          speed: parseFloat(curVehicle.speedKmHr) * 0.277778
        }),
        timestamp: moment().unix() - parseInt(curVehicle.secsSinceReport, 10),
        vehicle: new realtime.VehicleDescriptor({
          id: curVehicle.id
        })
      }));
    };
    curVehiclePositions = msg;
    console.log(msg.entity);
  });
}

var updateAll = function() {
  updateTrips();
  updateAlerts();
  updateVehicles();
}

//setInterval(updateAll, 30000);
updateAlerts();

