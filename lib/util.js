var fs = require('fs')

var moment = require('moment'),
  realtime = require('gtfs-realtime-bindings')

var util = {}

util.makeMessageTemplate = function() {
  return new realtime.FeedMessage({
    header: new realtime.FeedHeader({
      gtfs_realtime_version: '1.0',
      timestamp: moment().unix()
    })
  });
}

util.makeSimpleEnglishTranslatedString = function(text) {
  var translation = new realtime.TranslatedString();
  translation.translation.push(new realtime.TranslatedString.Translation({
    language: 'en',
    text: text
  }));
  return translation;
}

util.getEpochTime = function(timeStr) {
  return timeStr ? ( parseInt(timeStr, 10) / 1000 ) : null;
}

util.ensureArray = function(obj) {
  if(obj instanceof Array) {
    return obj;
  } else if(obj) {
    return [obj]
  } 
  return [];
}

module.exports = util;