# MMM-PlaceInfo

This an extension for the [MagicMirror](https://github.com/MichMich/MagicMirror).

This module pulls country/place information to provide a consolidated view
of remote locations. At the moment, local weather, exchange rate and local time
are supported.

The weather data comes from openweather (requires API key).
NOTE: Weather data still being constructed

The currency exchange information comes from http://fixer.io (requires API key).

## Example

![Screenshot of MMM-PlaceInfo](screenshot.png)

## Installation

Open a terminal session, navigate to your MagicMirror's `modules` folder and execute `git clone https://github.com/njw/MMM-PlaceInfo.git`, a new folder called MMM-PlaceInfo will be created.

Activate the module by adding it to the config.js file as shown below.

## Using the module

```javascript
modules: [
{
  module: 'MMM-PlaceInfo',
  position: 'bottom-center',
  config: {
    weatherAPIKey: "xxxxxx Copy from currentweather xxxxxx",
    currencyAPIKey: "xxxxx Get an API key xxxxxx",
    currencyPrecision: 2,
    currencyRelativeTo: 'USD',

    places: [
      {
          title: "London",
          flag: "gb",
          currency: "GBP",
          timezone: "Europe/London",
          weatherID: "2643743",
      },
      {
          title: "Sao Paolo",
          flag: "br",
          currency: "BRL",
          timezone: "America/Sao_Paulo",
          weatherID: "3448439"
      }
    ]
  }
},
```

## Configuration options

The following properties can be configured:

| **Option** | **Values** | **Description** |
| ---------- | ---------- | --------------- |

TBD
