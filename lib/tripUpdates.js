var async = require('async'),
  moment = require('moment'),
  realtime = require('gtfs-realtime-bindings')

var util = require('./util.js')

module.exports = function(nextbus, callback) {

  var msg = util.makeMessageTemplate();

  var tripUpdates = {}

  var getMultiPredictions = function(routeStopPairs, routeStopPairsCallback) {
    
    //console.log('getMultiPredictions');

    // requests predictions for each route/stop combo
    nextbus.predictionsForMultiStops(routeStopPairs.data).then(function(predictions) {

      predictions = util.ensureArray(predictions);
      
      //console.log('predictions', predictions)

      //console.log(JSON.stringify(predictions, null, 2))
      for (var i = 0; i < predictions.length; i++) {
        var curPrediction = predictions[i]

        console.log('curPrediction', curPrediction)
        
        var directions = util.ensureArray(curPrediction.direction);
        for (var j = 0; j < directions.length; j++ ) {
          var directionPredictions = util.ensureArray(directions[j].prediction);
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
              tripUpdates[tripPrediction.tripTag] = tripUpdate
            }
            var stopTimeUpdate = new realtime.TripUpdate.StopTimeUpdate({
              stop_id: curPrediction.stopTag
            })
            var stopTimeEvent = new realtime.TripUpdate.StopTimeEvent({
              time: util.getEpochTime(tripPrediction.epochTime)
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
      console.log('done processing batch of getMultiPredictions')
      routeStopPairsCallback()
    }).catch(function(err) {
      console.log(err)
      routeStopPairsCallback(err)
    })
  }

  var getRouteStops = function(routeTags, routeStopsCallback) {
    // requests list of all stops at each route
    nextbus.routeConfig(routeTags.data).then(function(routeStops) {
      routeStops = util.ensureArray(routeStops);
      var predictionStopsToRequest = {},
        curNumRouteStopPairs = 0;

      var routeStopPairRequestQueue = async.queue(getMultiPredictions)

      for (var i = 0; i < routeStops.length; i++) {
        var stops = util.ensureArray(routeStops[i].stop),
          curRouteTag = routeStops[i].tag;
        for (var j = 0; j < stops.length; j++) {
          if(!predictionStopsToRequest[curRouteTag]) {
            predictionStopsToRequest[curRouteTag] = []
          }
          predictionStopsToRequest[curRouteTag].push(stops[j].tag);
          curNumRouteStopPairs++;
          if(curNumRouteStopPairs == 150) {
            routeStopPairRequestQueue.push({data: predictionStopsToRequest});
            predictionStopsToRequest = {};
            curNumRouteStopPairs = 0;
          }
        };
      };
      if(curNumRouteStopPairs > 0) {
        routeStopPairRequestQueue.push({data: predictionStopsToRequest});
      }
      routeStopPairRequestQueue.drain = routeStopsCallback
    });
  }

  nextbus.routeList().then(function(routes) {

    console.log(routes)
    
    routes = util.ensureArray(routes);
    var routesToRequest = [];

    var routeRequestQueue = async.queue(getRouteStops)

    for (var i = 0; i < routes.length; i++) {
      routesToRequest.push(routes[i].tag);
      if(routesToRequest.length == 100) {
        routeRequestQueue.push({data: routesToRequest});
        routesToRequest = [];
      }
    }
    if(routesToRequest.length > 0) {
      routeRequestQueue.push({data: routesToRequest});
    }
    routeRequestQueue.drain = function(err) {
      if(err) { return callback(err) }
      // compile all trips into feed entity
      var tripIds = Object.keys(tripUpdates)
      for (var i = tripIds.length - 1; i >= 0; i--) {
        msg.entity.push(new realtime.FeedEntity({
          id: 'Trip update ' + i,
          trip_update: tripUpdates[tripIds[i]]
        }));
      }
      callback(null, msg)
    }
  });
  
}