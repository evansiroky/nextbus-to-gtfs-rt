var debug = require('debug')('ntgr.nextbus'),
  parseString = require('xml2js').parseString,
  request = require('request')

var util = require('./util')


var nextbusURL = 'http://webservices.nextbus.com/service/publicXMLFeed',
  qsStringifyOptions = { indices: false }

var API = function(agencyId, timeout) {
  this.agencyId = agencyId
  this.timeout = timeout ? timeout : 30000
}

API.prototype._send = function(command, params, callback) {

  var numRequests = 0,
    retryDelay = 1000,
    maxRequests = 3,
    query = util.clone(params),
    timeout = this.timeout

  query.command = command
  query.a = this.agencyId
  debug('initiate API call for ' + command)

  var handleParseResult = function(err, result) {
    if(err) {
      debug('XML parse error: ', err)
      return callback(err)
    }

    debug('successful parse')
    //debug(JSON.stringify(result, null, 2))

    if(!result.body) {
      return callback(new Error('Unrecognized XML message format'))
    }

    if(result.body.Error) {
      debug('Nextbus Error')
      debug(JSON.stringify(result, null, 2))
      return callback(new Error(result.body.Error._))
    }

    debug('valid response')
    callback(null, result.body)
  }

  var handleResponse = function (err, response, body) {
    if (!err && response.statusCode == 200) {
      debug('successful response from server')
      parseString(body, { explicitArray: false }, handleParseResult)
    } else {
      
      if(!err) {
        debug('Received non-200 response from server: ' + response.statusCode)
      } else {
        // http error encountered
        if(err.code === 'ETIMEDOUT') {
          debug('Connection timeout')
        } else if(err.code === 'ESOCKETTIMEDOUT') {
          debug('Response read timeout')
        } else {
          debug(err)
        }
      }
      
      setTimeout(makeRequest, retryDelay)

      retryDelay *= 2
    }
  }

  var makeRequest = function() {
 
    debug('request #' + numRequests)
    debug(command, Object.keys(query))

    numRequests += 1

    if(numRequests > maxRequests) {
      var err = new Error('Maximum request retries exceeded')
      debug(err)
      return callback(err)
    }

    request({
      url: nextbusURL,
      qs: query,
      qsStringifyOptions: qsStringifyOptions,
      timeout: timeout
    }, handleResponse)
  }

  makeRequest()

}

API.prototype.messages = function(callback) {
  this._send('messages', { t: 0 }, callback)
}

API.prototype.predictionsForMultiStops = function(routeStopPairs, callback) {

  var stops = [],
    routes = Object.keys(routeStopPairs)

  for (var i = routes.length - 1; i >= 0; i--) {
    var routeTag = routes[i]
    for (var j = routeStopPairs[routeTag].length - 1; j >= 0; j--) {
      stops.push(routeTag + "|" + routeStopPairs[routeTag][j])
    }
  }

  this._send('predictionsForMultiStops', { stops: stops }, callback)
}

API.prototype.routeConfig = function(routeTag, callback) {
  var query = {}
  if(!callback) {
    callback = routeTag
  } else {
    query.r = routeTag
  }
  this._send('routeConfig', query, callback)
}

API.prototype.routeList = function(callback) {
  this._send('routeList', {}, callback)
}

API.prototype.vehicleLocations = function(callback) {
  this._send('vehicleLocations', { r: '', t: 0 }, callback)
}


module.exports = API