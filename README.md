# nextbus-to-gtfs-rt

[![npm version](https://badge.fury.io/js/nextbus-to-gtfs-rt.svg)](https://badge.fury.io/js/nextbus-to-gtfs-rt) [![Build Status](https://travis-ci.org/evansiroky/nextbus-to-gtfs-rt.svg?branch=master)](https://travis-ci.org/evansiroky/nextbus-to-gtfs-rt) [![Dependency Status](https://david-dm.org/evansiroky/nextbus-to-gtfs-rt.svg)](https://david-dm.org/evansiroky/nextbus-to-gtfs-rt) [![Test Coverage](https://codeclimate.com/github/evansiroky/nextbus-to-gtfs-rt/badges/coverage.svg)](https://codeclimate.com/github/evansiroky/nextbus-to-gtfs-rt/coverage)

A NodeJS translator of the NextBus API to GTFS-RT.

## CLI Usage

`node scripts\writer.js [options]`

Options:

-a, --agency-id         The NextBus Agency Id              [string] [required]

-d, --output-directory  the directory to save files to[string] [default: "./"]

-h, --help              Show help                                    [boolean]

Example:

`scripts\writer.js -a sf-muni -d output`

This will download the current state of the sf-muni NextBus Feed, translate it to gtfs-rt and save to three files.

## Module Usage

```javascript
var Translator = require('nextbus-to-gtfs-rt')

var translator = new Translator({ 
    nextbusAgencyId: 'sf-muni'
})
```

**Constructor:**

Takes in an object with the following attributes:

nextbusAgencyId: String of the NextBus agency id

debug:  Boolean regarding whether to log calls to NextBus api

**Translator methods:**

Each method takes in a callback funtion argument with the signature: `funtion(err, feedMessage)` where `err` is any error that occurred and `feedMessage` is a protobuf object of the gtfs-rt feed for the requested type.

*processServiceAlerts*

*processTripUpdates*

*processVehiclePositions*

## License

MIT
