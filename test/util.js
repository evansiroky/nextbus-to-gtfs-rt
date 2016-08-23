var assert = require('chai').assert

var util = {}

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

util.assertUInt64 = function(protoBufInt, expectedInt) {
  assert.equal(util.getUInt64(protoBufInt), expectedInt)
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

util.getTranslator = function(cfg) {

  var Translator = require('../lib/index.js')

  cfg = cfg || { nextbusAgencyId: 'seattle-sc' }

  return new Translator(cfg)
}

util.getUInt64 = function(val) {
  return val.toNumber()
}

util.makeQueryParams = function(command, query) {
  if(!query) {
    query = {}
  }
  query.command = command
  query.a = 'seattle-sc'
  return query
}

util.predictionsForMultiStopsParams = {
  stops: ['FHS|1551_ar', 'FHS|1651', 'FHS|1661', 'FHS|1671', 'FHS|1681', 'FHS|27500', 
    'FHS|41988', 'FHS|41986', 'FHS|41980', 'FHS|11062', 'FHS|11175_ar', 'FHS|41970', 
    'FHS|41908', 'FHS|41904', 'FHS|27420', 'FHS|1682', 'FHS|1672', 'FHS|1662', 
    'FHS|1652', 'FHS|1552', 'SLU|1630_ar', 'SLU|1619', 'SLU|26665', 'SLU|26645', 
    'SLU|26641', 'SLU|26702', 'SLU|26700', 'SLU|26693_ar', 'SLU|26705_ar', 'SLU|26701', 
    'SLU|26698', 'SLU|26693', 'SLU|26690', 'SLU|26689', 'SLU|26680']
}

module.exports = util