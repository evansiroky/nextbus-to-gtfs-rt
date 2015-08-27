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
  nextbus.routeList().then(function(routes) { 
    for (var i = 0; i < routes.length; i++) {
      console.log(routes[i]);
    };
  });
  curTripUpdates = {};
}

var updateAlerts = function() {
  var msg = makeMessageTemplate(),
    nextBusMessageIds = [];
  nextbus.messages().then(function(messages) {
    for (var i = 0; i < messages.route.length; i++) {
      var routeMessages = ensureArray(messages.route[i].message);

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
  curVehiclePositions = {};
}

var updateAll = function() {
  updateTrips();
  updateAlerts();
  updateVehicles();
}

//setInterval(updateAll, 30000);
updateAlerts();

