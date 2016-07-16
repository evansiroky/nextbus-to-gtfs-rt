var fs = require('fs')

var async = require('async'),
  moment = require('moment'),
  realtime = require('gtfs-realtime-bindings')

var util = require('./util.js')

module.exports = function(nextbus, cacheExpiration, callback) {

  if(!cacheExpiration) {
    cacheExpiration = 86400000
  } else {
    cacheExpiration *= 3600000
  }

  var msg = util.makeMessageTemplate(),
    tripUpdates = {},
    numPredictionRetries = 0,
    routeStopPairRequestQueue

  var resetRouteStopPairRequestQueue = function() {
    if(routeStopPairRequestQueue) {
      routeStopPairRequestQueue.kill()
    }
    routeStopPairRequestQueue = async.queue(getMultiPredictions)
  }

  var getMultiPredictions = function(routeStopPairs, routeStopPairsCallback) {
    
    //console.log('getMultiPredictions');

    // requests predictions for each route/stop combo
    nextbus.predictionsForMultiStops(routeStopPairs.data).then(function(predictions) {

      if(!predictions) {
        if(numPredictionRetries === 0) {
          numPredictionRetries++
          resetRouteStopPairRequestQueue()
          return refetchAllRoutes(callback)
        } else {
          var err = new Error('Maximum prediction retries exceeded')
          return callback(err)
        }
      }

      predictions = util.ensureArray(predictions);

      //console.log('predictions', predictions)

      //console.log(JSON.stringify(predictions, null, 2))
      for (var i = 0; i < predictions.length; i++) {
        var curPrediction = predictions[i]

        //console.log('curPrediction', curPrediction)
        
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
      //console.log('routeStopPairsCallback')
      //console.log('trips', Object.keys(tripUpdates))
      routeStopPairsCallback()
    }).catch(routeStopPairsCallback)
  }

  var processRouteStops = function(routeStops) {
    var routes = Object.keys(routeStops),
      predictionStopsToRequest = {}
      curNumRouteStopPairs = 0

    // console.log('begin processRouteStops ' + routes.length)

    var addRouteStopPairs = function(routeTag, routeStops, i) {
      var limit = Math.min(routeStops.length, i + 150),
        numStopsAdded = limit - i

      for (; i < limit; i++) {
        if(!predictionStopsToRequest[routeTag]) {
          predictionStopsToRequest[routeTag] = []
        }
        predictionStopsToRequest[routeTag].push(curRouteStops[i])
      }

      return numStopsAdded
    }

    var scheduleProcessing = function() {
      routeStopPairRequestQueue.push({data: predictionStopsToRequest})
      predictionStopsToRequest = {}
      curNumRouteStopPairs = 0
    }

    // sort the routes by number of stops
    routes.sort(function(routeA, routeB) {
      return routeStops[routeA].length - routeStops[routeB].length
    })

    while(routes.length > 0) {

      // always take the route with the most stops first
      var curRouteTag = routes.shift(),
        curRouteStops = routeStops[curRouteTag],
        curOffset = 0

      while(curRouteStops.length - curOffset > 150) {
        addRouteStopPairs(curRouteTag, curRouteStops, curOffset)
        scheduleProcessing()
        curOffset += 150
      }

      curNumRouteStopPairs = addRouteStopPairs(curRouteTag, curRouteStops, curOffset)

      // search for next largest routes that have stops that can fit within 150 limit
      // this isn't very algorithmically efficient, but 
      // there are typically fewer than 200 routes at a transit agency
      for (var i = 0; i < routes.length; i++) {
        var curRouteTag = routes[i],
          curRouteStops = routeStops[curRouteTag]

        if(150 >= curRouteStops.length + curNumRouteStopPairs) {
          curNumRouteStopPairs += addRouteStopPairs(curRouteTag, curRouteStops, 0)
          routes.splice(i, 1)
          i--
        }
      }

      scheduleProcessing()
      
    }
  }

  var processTripUpdates = function() {
    var tripIds = Object.keys(tripUpdates)
    for (var i = tripIds.length - 1; i >= 0; i--) {
      msg.entity.push(new realtime.FeedEntity({
        id: 'Trip update ' + i,
        trip_update: tripUpdates[tripIds[i]]
      }));
    }
    callback(null, msg)
  }

  var setrouteStopPairRequestQueueDrainFn = function() {
    if(routeStopPairRequestQueue.length() === 0) {
      processTripUpdates()
    } else {
      routeStopPairRequestQueue.drain = function(err) {
        if(err) { return callback(err) }
        // compile all trips into feed entity
        processTripUpdates()
      }
    }
  }

  var refetchAllRoutes = function(refetchCallback) {
    nextbus.routeList().then(function(routes) {

      routes = util.ensureArray(routes);
      var routeStopLookup = {};

      var processNextBusRouteStops = function(routeStops) {
        routeStops = util.ensureArray(routeStops);
        
        for (var i = 0; i < routeStops.length; i++) {
          var stops = util.ensureArray(routeStops[i].stop),
            curRouteTag = routeStops[i].tag;

          for (var j = 0; j < stops.length; j++) {
            if(!routeStopLookup[curRouteTag]) {
              routeStopLookup[curRouteTag] = []
            }
            routeStopLookup[curRouteTag].push(stops[j].tag);
          };
        };
      }

      async.auto({
        first100Routes: function(cb) {
          // fetch the first 100 routes that nextBus can give
          nextbus.routeConfig().then(function(routeStops) {
            processNextBusRouteStops(routeStops)
            cb()
          }).catch(cb)
        },
        remainingRoutes: ['first100Routes', function(results, cb) {
          // iterate through route list and fetch those routes one-by-one that weren't part of first 100
          var routeRequestQueue = async.queue(function(routeTag, routeRequestCallback) {
            nextbus.routeConfig(routeTag).then(function(routeStops) {
              processNextBusRouteStops(routeStops)
              routeRequestCallback()
            }).catch(routeRequestCallback)
          }, 3)

          var numPlus100 = 0

          for (var i = routes.length - 1; i >= 0; i--) {
            var routeTag = routes[i].tag
            if(!routeStopLookup[routeTag]) {
              routeRequestQueue.push(routeTag)
              numPlus100++
            }
          }

          if(numPlus100 > 0) {
            routeRequestQueue.drain = cb
          } else {
            cb()
          }

        }],
        makeCacheDir: ['remainingRoutes', function(results, cb) {
          fs.mkdir('./cache', function(err) {
            if(err && err.code === 'EEXIST') {
              cb()
            } else {
              cb(err)
            }
          })
        }],
        writeRouteStopPairsToCache: ['makeCacheDir', function(results, cb) {
          fs.writeFile('./cache/routeStopPairs.json', JSON.stringify(routeStopLookup), cb)
        }],
        processRouteStops: ['remainingRoutes', function(results, cb) {
          processRouteStops(routeStopLookup)
          //console.log('done processRouteStops')
          cb()
        }]
      }, function(err) {
        //console.log('refresh prep done')
        if(err) { 
          //console.log('auto err', err)
          return refetchCallback(err) 
        }
        setrouteStopPairRequestQueueDrainFn()
        //console.log('route stop drain done')
      })
    }).catch(refetchCallback)
  }

  resetRouteStopPairRequestQueue()

  // attempt to load route stop pairs from cache
  fs.stat('./cache/routeStopPairs.json', function(err, stats) {
    if(err) {
      if(err.code === 'ENOENT') {
        // file does not exist, attempt to create it
        refetchAllRoutes(callback)
      } else {
        callback(err)
      }
    } else {
      // check age of cached route stops
      if(stats.mtime.getTime() < (new Date()).getTime() - cacheExpiration) {
        // expired, refetch
        refetchAllRoutes(callback)
      } else {
        // valid, use
        processRouteStops(require('../cache/routeStopPairs.json'))
        setrouteStopPairRequestQueueDrainFn()
      }
    }
  })  
  
}