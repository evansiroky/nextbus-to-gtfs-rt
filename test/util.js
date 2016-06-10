var assert = require('chai').assert

var util = {}

util.getTranslator = function() {

  var Translator = require('../lib/index.js')

  return new Translator({ 
    nextbusAgencyId: 'seattle-sc',
    debug: false
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

util.assertAllEntitiesAreSameType = function(expectedType, entities) {

  var entityTypes = ['trip_update', 'vehicle', 'alert']

  for (var i = entities.length - 1; i >= 0; i--) {
    var entity = entities[i]
  
    for (var j = entityTypes.length - 1; j >= 0; j--) {
      if(entityTypes[j] === expectedType) {
        assert.isObject(entity[entityTypes[j]])
        desiredData = entity[entityTypes[j]]
      } else {
        assert.isNull(entity[entityTypes[j]])
      }
    }

  }

}

util.findEntity = function(expectedType, entities, id) {
  for (var i = entities.length - 1; i >= 0; i--) {
    switch(expectedType) {
      case 'trip_update':
        if(entities[i].trip_update && entities[i].trip_update.trip && entities[i].trip_update.trip.trip_id === id) {
          return entities[i][expectedType]
        }
        break
      case 'vehicle':
        if(entities[i].vehicle && entities[i].vehicle.vehicle && entities[i].vehicle.vehicle.id === id) {
          return entities[i][expectedType]
        }
        break
      case 'alert':
        if(entities[i].alert && entities[i].id === id) {
          return entities[i][expectedType]
        }
        break
    }
  }
  var err = new Error('item not found')
  throw err
}

util.getUInt64 = function(val) {
  return val.toNumber()
}

util.assertUInt64 = function(protoBufInt, expectedInt) {
  assert.equal(util.getUInt64(protoBufInt), expectedInt)
}

module.exports = util