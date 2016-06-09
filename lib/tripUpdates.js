var updateTrips = function(callback) {
  var msg = makeMessageTemplate();
  curTripUpdates = msg;

  var tripUpdates = {}

  var getMultiPredictions = function(routeStopPairs) {
    console.log('getMultiPredictions');
    // requests predictions for each route/stop combo
    nextbus.predictionsForMultiStops(routeStopPairs).then(function(predictions) {
      predictions = ensureArray(predictions);
      console.log(JSON.stringify(predictions, null, 2))
      for (var i = 0; i < predictions.length; i++) {
        var curPrediction = predictions[i],
          directions = ensureArray(curPrediction.direction);
        for (var j = 0; j < directions.length; j++ ) {
          var directionPredictions = ensureArray(directions[j].prediction);
          for (var k = 0; k < directionPredictions.length; k++) {
            var tripPrediction = directionPredictions[k]
            if(!tripUpdates[tripPrediction.tripTag]) {
              var tripUpdate = new realtime.TripUpdate({
                trip: new realtime.TripDescriptor({
                  route_id: curPrediction.routeTag,
                  trip_id: tripPrediction.tripTag
                })
              });
              if(tripPrediction.vehicle) {
                tripUpdate.vehicle = new realtime.VehicleDescriptor({
                  id: tripPrediction.vehicle
                })
              }
              tripUpdates[tripPrediction.tripTag] = tripMessage
            }
            var stopTimeUpdate = new realtime.StopTimeUpdate({
              stop_id: curPrediction.stopTag
            })
            var stopTimeEvent = new realtime.StopTimeEvent({
              time: getEpochTime(tripPrediction.epochTime)
            })
            if(tripPrediction.isDeparture === 'false') {
              stopTimeUpdate.arrival = stopTimeEvent
            } else {
              stopTimeUpdate.departure = stopTimeEvent
            }
            tripUpdates[tripPrediction.tripTag].stop_time_update.push(stopTimeUpdate)
          }
        }
      }
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