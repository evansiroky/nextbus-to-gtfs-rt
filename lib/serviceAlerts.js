var realtime = require('gtfs-realtime-bindings')

var util = require('./util.js')

module.exports = function(nextbus, callback) {

  var msg = util.makeMessageTemplate(),
    nextBusMessageIds = {}

  nextbus.messages(function(err, messages) {

    if(err) {
      return callback(err)
    }

    var messagesByRoute = util.ensureArray(messages.route)

    for (var i = 0; i < messagesByRoute.length; i++) {
      var routeMessages = util.ensureArray(messagesByRoute[i].message)

      for (var j = 0; j < routeMessages.length; j++) {
        curMsg = routeMessages[j]

        // check if message is already added elsewhere
        if(!nextBusMessageIds[curMsg.$.id]) {

          // create alert message
          var alert = new realtime.Alert({
            header_text: util.makeSimpleEnglishTranslatedString(curMsg.text)
          })

          // add active_periods if provided
          if(curMsg.$.startBoundary || curMsg.$.endBoundary) {
            alert.active_period.push(new realtime.TimeRange({
              start: util.getEpochTime(curMsg.$.startBoundary),
              end: util.getEpochTime(curMsg.$.endBoundary)
            }))
          }

          // add route stop combos if provided
          if(curMsg.routeConfiguredForMessage) {
            var curMsgRoutes = util.ensureArray(curMsg.routeConfiguredForMessage)
            for (var k = 0; k < curMsgRoutes.length; k++) {
              var curRoute = curMsgRoutes[k]
              alert.informed_entity.push(new realtime.EntitySelector({
                route_id: curRoute.$.tag
              }))
              if(curRoute.stop) {
                curRouteStops = util.ensureArray(curRoute.stop)
                for (var l = 0; l < curRouteStops.length; l++) {
                  alert.informed_entity.push(new realtime.EntitySelector({
                    route_id: curRoute.$.tag,
                    stop_id: curRouteStops[l].$.tag
                  }))
                }
              }
            }
          }

          // add alert to overall feed message
          msg.entity.push(new realtime.FeedEntity({
            id: curMsg.$.id,
            alert: alert
          }))

          // mark message id as processed
          nextBusMessageIds[curMsg.$.id] = true
        }
      }
    }
    callback(null, msg)
  })
}