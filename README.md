# nextbus-to-gtfs-rt

[![npm version](https://badge.fury.io/js/nextbus-to-gtfs-rt.svg)](https://badge.fury.io/js/nextbus-to-gtfs-rt) [![Build Status](https://travis-ci.org/evansiroky/nextbus-to-gtfs-rt.svg?branch=master)](https://travis-ci.org/evansiroky/nextbus-to-gtfs-rt) [![Dependency Status](https://david-dm.org/evansiroky/nextbus-to-gtfs-rt.svg)](https://david-dm.org/evansiroky/nextbus-to-gtfs-rt) [![Test Coverage](https://codeclimate.com/github/evansiroky/nextbus-to-gtfs-rt/badges/coverage.svg)](https://codeclimate.com/github/evansiroky/nextbus-to-gtfs-rt/coverage)

A NodeJS translator of the NextBus API to GTFS-RT.

## CLI Usage

### One-Off Script

`node scripts\writer.js [options]`

#### Options:

`-a, --agency-id`         The NextBus Agency Id              [string] [required]

`-d, --output-directory`  the directory to save files to[string] [default: "./"]

`-e, --cache-expiration-time`  Number of hours between cache refreshes
                                                                 [default: 24]

`-h, --help`              Show help                                    [boolean]

#### Example:

`scripts\writer.js -a sf-muni -d output`

This will download the current state of the sf-muni NextBus Feed, translate it to gtfs-rt and save to three files.

### Continuous Script

`scripts\continuousWriter.js [options]`

#### Options:

`-a, --agency-id`              The NextBus Agency Id         [string] [required]

`-d, --output-directory`       the directory to save files to
                                                      [string] [default: "./"]

`-e, --cache-expiration-time`  Number of hours between cache refreshes
                                                                 [default: 24]

`-s, --seconds`                number of seconds to wait after execution of
                               previous writer finishes          [default: 60]

`-h, --help`                   Show help                               [boolean]

#### Example:

`scripts\continuousWriter.js -a sf-muni -d output`

Download the current state of the sf-muni NextBus Feed, Translate it to gtfs-rt and save to files every minute.
                                            
#### Note:  

It is recommended to use the continuous writer in conjuction with the package [forever](https://github.com/foreverjs/forever).

## Module Usage

```javascript
var Translator = require('nextbus-to-gtfs-rt')

var translator = new Translator({ 
  nextbusAgencyId: 'sf-muni'
})
```

### Constructor

Takes in an object with the following attributes:

*nextbusAgencyId* (string, required) String of the NextBus agency id

*cacheExpiration*  (int, optional, default=24)  Number of hours between cache refreshes

*debug*  (bool, optional, default=false) Whether to log calls to NextBus api

### Translator methods

Each method takes in a callback funtion argument with the signature: `funtion(err, feedMessage)` where `err` is any error that occurred and `feedMessage` is a protobuf object of the gtfs-rt feed for the requested type.

*processServiceAlerts*

*processTripUpdates*

*processVehiclePositions*

## License

MIT
