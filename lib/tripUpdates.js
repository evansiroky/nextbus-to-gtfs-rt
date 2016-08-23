var fs = require('fs'),
  path = require('path')

var async = require('async'),
  debug = require('debug')('ntgr.tripUpdates'),
  moment = require('moment'),
  realtime = require('gtfs-realtime-bindings')

var util = require('./util.js')

var cacheDir = path.join(path.dirname(__dirname), 'cache'),
  routeStopsCache = path.join(cacheDir, 'routeStopPairs.json')


module.exports = function(nextbus, cacheExpiration, callback) {

  debug('begin trip updates')

  if(!cacheExpiration) {
    cacheExpiration = 86400000
  } else {
    cacheExpiration *= 3600000
  }

  var msg = util.makeMessageTemplate(),
    tripUpdates = {},
    routeStopPairRequestQueue

  var resetRouteStopPairRequestQueue = function() {
    if(routeStopPairRequestQueue) {
      routeStopPairRequestQueue.kill()
    }
    routeStopPairRequestQueue = async.queue(getMultiPredictions)
  }

  var getMultiPredictions = function(routeStopPairs, routeStopPairsCallback) {
    
    debug('getMultiPredictions')

    // requests predictions for each route/stop combo
    nextbus.predictionsForMultiStops(routeStopPairs.data, function(err, data) {

      if(err) {
        debug('getMultiPredictions err', err)
        if(err.message && err.message.indexOf('cannot determine which stop to provide data for') > -1) {
          debug('potential schedule change detected, refresh cache')
          resetRouteStopPairRequestQueue()
          return refetchAllRoutes(callback)
        } else {
          return callback(err)
        }
      }

      predictions = util.ensureArray(data.predictions)

      //debug(JSON.stringify(predictions, null, 2))
      for (var i = 0; i < predictions.length; i++) {
        var curPrediction = predictions[i]

        //debug('curPrediction', curPrediction)
        
        var directions = util.ensureArray(curPrediction.direction)
        for (var j = 0; j < directions.length; j++ ) {
          var directionPredictions = util.ensureArray(directions[j].prediction)
          for (var k = 0; k < directionPredictions.length; k++) {
            var tripPrediction = directionPredictions[k]
            //debug(tripPrediction)
            if(!tripUpdates[tripPrediction.$.tripTag]) {
              var tripUpdate = new realtime.TripUpdate({
                trip: new realtime.TripDescriptor({
                  route_id: curPrediction.$.routeTag,
                  trip_id: tripPrediction.$.tripTag
                })
              })
              if(tripPrediction.$.vehicle) {
                tripUpdate.vehicle = new realtime.VehicleDescriptor({
                  id: tripPrediction.$.vehicle
                })
              }
              tripUpdates[tripPrediction.$.tripTag] = tripUpdate
            }
            var stopTimeUpdate = new realtime.TripUpdate.StopTimeUpdate({
              stop_id: curPrediction.$.stopTag
            })
            var stopTimeEvent = new realtime.TripUpdate.StopTimeEvent({
              time: util.getEpochTime(tripPrediction.$.epochTime)
            })
            if(tripPrediction.$.isDeparture === 'false') {
              stopTimeUpdate.arrival = stopTimeEvent
            } else {
              stopTimeUpdate.departure = stopTimeEvent
            }
            tripUpdates[tripPrediction.$.tripTag].stop_time_update.push(stopTimeUpdate)
          }
        }
      }
      debug('routeStopPairsCallback')
      //debug('trips', Object.keys(tripUpdates))
      routeStopPairsCallback()
    })
  }

  var processRouteStops = function(routeStops) {
    var routes = Object.keys(routeStops),
      predictionStopsToRequest = {}
      curNumRouteStopPairs = 0

    debug('begin processRouteStops ' + routes.length)

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
      }))
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

    debug('begin refetchAllRoutes')

    nextbus.routeList(function(err, data) {

      if(err) return refetchCallback(err)

      var routes = util.ensureArray(data.route)
        routeStopLookup = {}

      var processNextBusRouteStops = function(routeStopData) {
        
        var routeStopRoutes = util.ensureArray(routeStopData.route)
        
        for (var i = 0; i < routeStopRoutes.length; i++) {
          var stops = util.ensureArray(routeStopRoutes[i].stop),
            curRouteTag = routeStopRoutes[i].$.tag

          for (var j = 0; j < stops.length; j++) {
            if(!routeStopLookup[curRouteTag]) {
              routeStopLookup[curRouteTag] = []
            }
            routeStopLookup[curRouteTag].push(stops[j].$.tag)
          }
        }
      }

      async.auto({
        first100Routes: function(cb) {
          debug('fetch the first 100 routes that nextBus can give')
          nextbus.routeConfig(function(err, routeStopData) {
            if(err) return cb(err)
            processNextBusRouteStops(routeStopData)
            cb()
          })
        },
        remainingRoutes: ['first100Routes', function(results, cb) {
          debug("iterate through route list and fetch those routes one-by-one that weren't part of first 100")
          var routeRequestQueue = async.queue(function(routeTags, routeRequestCallback) {
            nextbus.routeConfig(routeTags, function(err, routeStopData) {
              if(err) return cb(err)
              processNextBusRouteStops(routeStopData)
              routeRequestCallback()
            })
          })

          var numPlus100 = 0,
            plus100batch = []

          for (var i = routes.length - 1; i >= 0; i--) {
            var routeTag = routes[i].$.tag
            if(!routeStopLookup[routeTag]) {
              plus100batch.push(routeTag)
              if(plus100batch.length == 100){
                routeRequestQueue.push(plus100batch)
                plus100batch = []
              }
              numPlus100++
            }
          }

          if(numPlus100 > 0) {
            if(plus100batch.length > 0) {
              routeRequestQueue.push(plus100batch)
            }
            routeRequestQueue.drain = cb
          } else {
            cb()
          }

        }],
        makeCacheDir: ['remainingRoutes', function(results, cb) {
          debug('makeCacheDir')
          fs.mkdir(cacheDir, function(err) {
            if(err && err.code === 'EEXIST') {
              cb()
            } else {
              cb(err)
            }
          })
        }],
        writeRouteStopPairsToCache: ['makeCacheDir', function(results, cb) {
          debug('writeRouteStopPairsToCache')
          fs.writeFile(routeStopsCache, JSON.stringify(routeStopLookup), cb)
        }],
        processRouteStops: ['remainingRoutes', function(results, cb) {
          debug('processRouteStops')
          processRouteStops(routeStopLookup)
          debug('done processRouteStops')
          cb()
        }]
      }, function(err) {
        debug('refresh prep done')
        if(err) { 
          debug('auto err', err)
          return refetchCallback(err) 
        }
        setrouteStopPairRequestQueueDrainFn()
        debug('route stop drain done')
      })
    })
  }

  resetRouteStopPairRequestQueue()

  debug('attempt to load route stop pairs from cache')
  fs.stat(routeStopsCache, function(err, stats) {
    if(err) {
      if(err.code === 'ENOENT') {
        debug('file does not exist, attempt to create it')
        refetchAllRoutes(callback)
      } else {
        debug('unknown file access error')
        debug(err)
        callback(err)
      }
    } else {
      // check age of cached route stops
      if(stats.mtime.getTime() < (new Date()).getTime() - cacheExpiration) {
        debug('cache expired, refetch')
        refetchAllRoutes(callback)
      } else {
        debug('cache is valid, use')
        processRouteStops(require(routeStopsCache))
        setrouteStopPairRequestQueueDrainFn()
      }
    }
  })  
  
}