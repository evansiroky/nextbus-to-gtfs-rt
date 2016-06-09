var assert = require('chai').assert

var util = {}

util.getTranslator = function() {

  var Translator = require('../lib/index.js')

  return new Translator({ 
    nextbusAgencyId: 'seattle-sc',
    debug: true
  })
}

util.assertIsFeedMessageWithExactEntityLength = function(feedMessage, expectedLength) {

  assert.isObject(feedMessage)

  // header
  assert.deepPropertyVal(feedMessage, 'header.gtfs_realtime_version', '1.0')
  assert.property(feedMessage, 'entity')

  // message entities
  var entities = feedMessage.entity

  assert.isArray(entities)
  assert.equal(entities.length, expectedLength)

  return entities

}

util.getEntityOfSpecificType = function(expectedType, entities, idx) {

  var entity = entities[idx]
  assert.isObject(entity)

  var entityTypes = ['trip_update', 'vehicle', 'alert'],
    desiredData

  for (var i = entityTypes.length - 1; i >= 0; i--) {
    if(entityTypes[i] === expectedType) {
      assert.isObject(entity[entityTypes[i]])
      desiredData = entity[entityTypes[i]]
    } else {
      assert.isNull(entity[entityTypes[i]])
    }
  }
  
  return desiredData

}

util.getUInt64 = function(val) {
  return val.toNumber()
}

util.assertUInt64 = function(protoBufInt, expectedInt) {
  assert.equal(util.getUInt64(protoBufInt), expectedInt)
}

module.exports = util