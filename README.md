# nextbus-to-gtfs-rt

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
