var assert = require('chai').assert

var util = {}

util.getTranslator = function() {

  var Translator = require('../lib/index.js')

  return new Translator({ 
    nextbusAgencyId: 'test',
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

util.assertUInt64 = function(protoBufInt, expectedInt) {
  assert.equal(protoBufInt.toNumber(), expectedInt)
}

module.exports = util