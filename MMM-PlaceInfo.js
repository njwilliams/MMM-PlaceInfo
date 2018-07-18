/* global Module */

/* Magic Mirror
 * Module: MMM-PlaceInfo
 *
 * By Nick Williams
 * MIT Licensed.
 */


Module.register('MMM-PlaceInfo',{
    
    defaults: {
        symbols: null,
        units: config.units,
        animationSpeed: 1000,
        updateInterval: 1000 * 3600, //update every hour
        timeFormat: config.timeFormat,
        lang: config.language,
        showCustomHeader: false,
        layoutStyle: "table",
        showFlag: true,
        showText: true,

        // would make this more structured, but the config is not merged from the
        // the user config file, but replaces things, so the whole structure would be
        // blitzed if the user wanted to change one property.
        weatherUnits: config.units,
        weatherAPI: "https://api.openweathermap.org/data/",
        weatherAPIEndpoint: "group",
        weatherAPIVersion: "2.5",
        weatherAPIKey: "",
        weatherInterval: 10*60*1000, // every 10 minutes. Allowed 60calls/min
        weatherLoadDelay: 0,
        weatherRetryDelay: 2500,
        weatherPrecision: 0,

        weatherIcons: {
            "01d": "wi-day-sunny",
            "02d": "wi-day-cloudy",
            "03d": "wi-cloudy",
            "04d": "wi-cloudy-windy",
            "09d": "wi-showers",
            "10d": "wi-rain",
            "11d": "wi-thunderstorm",
            "13d": "wi-snow",
            "50d": "wi-fog",
            "01n": "wi-night-clear",
            "02n": "wi-night-cloudy",
            "03n": "wi-night-cloudy",
            "04n": "wi-night-cloudy",
            "09n": "wi-night-showers",
            "10n": "wi-night-rain",
            "11n": "wi-night-thunderstorm",
            "13n": "wi-night-snow",
            "50n": "wi-night-alt-cloudy-windy"
        },

        currencyAPI: "http://data.fixer.io/api/latest",                
        currencyBase: "EUR", // cannot change, unless you're using a paid-up plan.
        currencyRelativeTo: "EUR",
        currencyPrecision: 3, // how many decimal places
        currencyInterval: 2*60*60*1000, // 2hr. don't want frequent since free limit is 2k/mon
        currencyLoadDelay: 0,
        currencyRetryDelay: 2500,

        // Example place
        places: [
          {
            title: "New York",
            timezone: "America/New_York",
            flag: "us",
            currency: "USD",
            weatherID: 5128581
          }
        ]
    },

    state: {
        weather: {
            timer: undefined,
            values: {}, // results of lookup
            loaded: false,
        },
        currency: {
            timer: undefined,
            values: {}, // results of currency lookup
            loaded: false,
        },
    },
    
    getScripts: function() {
        return ["weather-icons.css", "moment.js"];
    },

    getStyles: function() {
        return ['MMM-PlaceInfo.css'];
    },    

    loadCSS: function() {
      var css = [
        {
          id:'flag-icon-CSS',
          href: 'https://cdnjs.cloudflare.com/ajax/libs/flag-icon-css/2.8.0/css/flag-icon.min.css'
        }
      ]
      css.forEach(function(c) {
        if (!document.getElementById(c.id)) {
          var head  = document.getElementsByTagName('head')[0]
          var link  = document.createElement('link')
          link.id   = c.id
          link.rel  = 'stylesheet'
          link.type = 'text/css'
          link.href = c.href
          link.media = 'all'
          head.appendChild(link)
        }
      })
    },

    start: function() {
        Log.info(this.name + ': Starting module');
        this.loadCSS();

        this.state.weather.fn = this.updateWeather;
        this.state.weather.interval = this.config.weatherInterval;
        this.state.currency.fn = this.updateCurrencies;
        this.state.currency.interval = this.config.currencyInterval;

        if (!this.config.currencyAPIKey) {
            Log.info(this.name + ": No API key for currencies: disabling currency lookup");
        } else {
            this.scheduleUpdate(this.state.currency, this.config.currencyLoadDelay);
        }
        if (!this.config.weatherAPIKey) {
            Log.info(this.name + ": No API key for weather: disabling weather lookup");
        } else {
            this.scheduleUpdate(this.state.weather, this.config.weatherLoadDelay);
        }

        // guarantee that we always have a valid base
        if (this.config.currencyBase == "") {
            this.config.currencyBase = "EUR";
        }
        
        var self = this;
        setInterval(function() {
            self.updateDom();
        }, self.config.animationSpeed);

    },

    getDom: function() {
        var wrapper = document.createElement("div");

        // display a custom header, just in case
        if (this.config.showCustomHeader) {
            var customHeader = document.createElement('div');
            currencyInfo = "";
            if (!this.config.currencyAPIKey) {
                currencyInfo += "Currency data disabled (no API key)\n";
            } else {
                if (this.hasOwnProperty("rateUpdate")) {
                    currencyInfo += "Currency data last updated " + this.rateUpdate + "\n";
                }
                if (this.config.currencyRelativeTo) {
                    currencyInfo += "Currency relative to " + this.config.currencyRelativeTo + "\n";
                } else {
                    currencyInfo = "Currency relative to " + this.config.currencyBase + "\n";
                }
            }
            customHeader.innerHTML = currencyInfo;
            customHeader.className = "light small";
            wrapper.appendChild(customHeader);
        }

        // get ready to process data and print it to the screen
        var outputWrapper = document.createElement('div');

        var dataLimit = 3;
        if (this.config.places.length == 4) {
            dataLimit = 2;
        } else if (this.config.places.length == 7) {
            dataLimit = 4;
        } else if (this.config.places.length > 9) {
            dataLimit = 4;
        }

        if (this.config.layoutStyle == 'table') {
            var table = document.createElement('table');
            table.className = "placetable";
        }

        for (var placeIdx in this.config.places) {
            var place = this.config.places[placeIdx];
            if (this.config.layoutStyle == 'table') {
                // we want more columns to save some space on screen, so we iterate and only create a new row with every second dataset
                if ( placeIdx % dataLimit == 0) {
                    var row = document.createElement('tr');
                }
                var cell = document.createElement('td');
            }
            var placeContainer = document.createElement('span');

            // determine if user wants to see the flag
            if (place.flag != "") {
                var flagWrapper = document.createElement("div");
                flagWrapper.className = "flag";
                var flagIconWrapper = document.createElement("span");
                flagIconWrapper.className = "flag-icon flag-icon-squared";
                flagIconWrapper.className += " flag-icon-" + place.flag;
                flagWrapper.appendChild(flagIconWrapper);
                placeContainer.appendChild(flagWrapper);
            }
        
            var labelWrapper = document.createElement("span");
            labelWrapper.className = "label bright";
            labelWrapper.innerHTML = place.title;
            placeContainer.appendChild(labelWrapper);

            var timeString;
            var clock = moment();
            if (place.timezone == null || undefined) {
                clock.local();
            } else {
                clock.tz(place.timezone);
            }
            timeString = clock.format(this.config.timeFormat);
            var timeWrapper = document.createElement("div");
            timeWrapper.innerHTML = timeString;
            timeWrapper.className = "time small";
            placeContainer.appendChild(timeWrapper);

            // determine if user wants to see the abbreviated currency text (EUR, USD, ..)
            if (place.currency != "") {
                var currencySpan = document.createElement('div');
                currencySpan.className = "currency small";
                if (this.state.currency.values && this.state.currency.values.hasOwnProperty(place.currency)) {
                    currencySpan.innerHTML = place.currency + ": " + this.state.currency.values[place.currency];
                } else {
                    currencySpan.innerHTML = "No data";
                    currencySpan.className = "currency dimmed light small";
                }
                placeContainer.appendChild(currencySpan);            
            }

            if (place.weatherID) {
                var weatherSpan = document.createElement('div');
                weatherSpan.className = "weather";
                if (!this.state.weather || !this.state.weather.values[placeIdx]) {
                    weatherSpan.innerHTML = "No data";
                    weatherSpan.className = "weather dimmed light small";
                } else {
                    var weather = this.state.weather.values[placeIdx];
                    var weatherIcon = document.createElement("span");
                    var icon = this.config.weatherIcons[weather.weather[0].icon];
                    weatherIcon.className = "wi weathericon " + icon;
                    weatherSpan.appendChild(weatherIcon);

                    var degreeLabel = "";
                    if (this.config.degreeLabel) {
                        switch (this.config.units ) {
                        case "metric":
                            degreeLabel = "C";
                            break;
                        case "imperial":
                            degreeLabel = "F";
                            break;
                        case "default":
                            degreeLabel = "K";
                            break;
                        }
                    }
                    var weatherTemp = document.createElement('span');
                    weatherTemp.innerHTML = weather.main.temp.toFixed(this.config.weatherPrecision) + "&deg;" + degreeLabel;

                    weatherSpan.appendChild(weatherTemp);
                }
                placeContainer.appendChild(weatherSpan);            
            }

            // if the user wants a table, we add the dataset to a cell. If this is the last dataset for a row or the final dataset we add the row to the table 
            if (this.config.layoutStyle == 'table') {
                cell.appendChild(placeContainer);
                row.appendChild(cell);
                if ( placeIdx % dataLimit != 0 || placeIdx == (this.config.places.length-1) ) { 
                    table.appendChild(row) 
                }
            } else {
                outputWrapper.appendChild(placeContainer);
            }
        }

        if (this.config.layoutStyle == 'table') {
            outputWrapper.appendChild(table);
            wrapper.appendChild(outputWrapper);

        } else if (this.config.layoutStyle == 'ticker') {
            var marqueeTicker = document.createElement("marquee");
            marqueeTicker.innerHTML = outputWrapper.innerHTML;
            marqueeTicker.className = "small thin light";
            marqueeTicker.width = document.getElementsByClassName("MMM-PlaceInfo")[0].clientWidth;
            marqueeTicker.scrollDelay = 100;
            wrapper.appendChild(marqueeTicker);
        }

        return wrapper;
    },

    updateWeather: function() {
        var params = this.getWeatherParams();
        if (params == "") {
            console.log(this.name + ": no weathers to request");
            return;
        }
        var url = this.config.weatherAPI + this.config.weatherAPIVersion + "/" + this.config.weatherAPIEndpoint + params;
        var self = this;
        var retry = true;
        console.log(this.name + ": weather request(" + url + ")");
        var weatherRequest = new XMLHttpRequest();
        weatherRequest.open("GET", url, true);
        weatherRequest.onreadystatechange = function() {
            if (this.readyState === 4) {
                if (this.status === 200) {
                    self.processWeather(JSON.parse(this.response));
                } else if (this.status === 401) {
                    self.updateDom(self.config.animationSpeed);
                    Log.error(self.name + ": Incorrect APPID.");
                    retry = false;
                } else {
                    Log.error(self.name + ": Could not load weather: " + this.status);
                }

                if (retry) {
                    self.scheduleUpdate(self.state.weather, (self.state.weather.loaded)? -1 : this.config.weatherRetryDelay);
                }

            }
        };
        weatherRequest.send();
    },

    getWeatherParams: function() {
        var placeIDs = {}
        for (var placeIdx in this.config.places) {
            var place = this.config.places[placeIdx];
            if (place.weatherID) {
                placeIDs[place.weatherID] = 1;
            }
        }
        if (Object.keys(placeIDs).length == 0) {
            return "";
        }
        var params = "?APPID=" + this.config.weatherAPIKey
        params += "&id=" + Object.keys(placeIDs).join();
        params += "&units=" + this.config.weatherUnits;
        return params;
    },

    processWeather: function(data) {
        if (!data || !data.cnt) {
            Log.error(this.name + ": failed to process weather data: " + JSON.stringify(data))
            return;
        }
        this.state.weather.values = [];
        for (var cityIdx in data.list) {
            for (var placeIdx in this.config.places) {
                if (this.config.places[placeIdx].hasOwnProperty("weatherID") && this.config.places[placeIdx].weatherID == data.list[cityIdx].id) {
                    this.state.weather.values[placeIdx] = data.list[cityIdx];
                }
            }
        }
        this.state.weather.loaded = true;
        this.updateDom(this.config.animationSpeed);
    },

    updateCurrencies: function() {
        var url = this.config.currencyAPI
        var params = this.getCurrencyParams();
        if (params == "") {
            Log.info(this.name + ": no currencies to request");
            return;
        }
        url += params;
        var self = this;
        var retry = true;

        console.log(this.name + ": currency request(" + url + ")");
        var Request = new XMLHttpRequest();
        Request.open("GET", url, true);
        Request.onreadystatechange = function() {
            if (this.readyState === 4) {
                if (this.status === 200) {
                    self.processCurrencies(JSON.parse(this.response));
                } else {
                    Log.error(self.name + ": Could not load data.");
                }
                self.scheduleUpdate(self.state.currency, (self.state.currency.loaded)? -1 : this.config.currencyRetryDelay);
            }
        };
        Request.send();
    },

    getCurrencyParams: function() {
        var currencies = {};
        for (var placeIdx in this.config.places) {
            var place = this.config.places[placeIdx];
            if (place.currency) {
              currencies[place.currency] = 1;
            }
        }
        if (Object.keys(currencies).length == 0) {
            return "";
        }
        if (this.config.currencyBase != this.config.currencyRelativeTo) {
            currencies[this.config.currencyRelativeTo] = 1;
        }
        params = "?access_key=" + this.config.currencyAPIKey;
        params += "&base=" + this.config.currencyBase;
        params += "&symbols=" + Object.keys(currencies).join()
        return params;
    },

    processCurrencies: function(data) {
        if (!data.rates) {
            // Did not receive usable new data.
            // Maybe this needs a better check?
            Log.error(self.name + ": failed to process currency data, no rates " + JSON.stringify(data))
            return;
        }

        this.rateUpdate = data.date;
        this.state.currency.values = data.rates;
        // if we got data in a different base, we need to convert
        if (this.config.currencyBase != this.config.currencyRelativeTo) {
            var conversion = this.state.currency.values[this.config.currencyRelativeTo];
            if (!conversion) {
                conversion = 1; // prevent stupidness
            }
            for (var cur in this.state.currency.values) {
                this.state.currency.values[cur] /= conversion;
            }
        }
        for (var cur in this.state.currency.values) {
            this.state.currency.values[cur] = this.state.currency.values[cur].toFixed(this.config.currencyPrecision);
        }
        this.state.currency.loaded = true;
        this.updateDom(this.config.animationSpeed);
    },

    scheduleUpdate: function(cnf, delay) {
        var self = this;
        var nextLoad = cnf.interval;
        if (typeof delay !== "undefined" && delay >= 0) {
            nextLoad = delay;
        }

        clearTimeout(cnf.timer);
        cnf.timer = setTimeout(function() {
            cnf.fn.call(self);
        }, nextLoad);
    },

});
