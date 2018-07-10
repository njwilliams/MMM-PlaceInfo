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
        weatherUnits: config.units,
        weatherAPI: "https://api.openwathermap.org/data/",
        weatherAPIEndpoint: "weather",
        weatherAPIVersion: "2.5",
        weatherAPIKey: "",
        currencyAPI: "http://data.fixer.io/api/latest",                
        currencyBase: "EUR", // cannot change, unless you're using a paid-up plan.
        currencyRelativeTo: "USD",
        currencyPrecision: 3, // how many decimal places
        places: [
          {
            title: "New York",
            timezone: "America/New_York",
            flag: "us",
            currency: "USD"
          }
        ]
    },
    
    getScripts: function() {
        return ["moment.js"];
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
        Log.info('Starting module: ' + this.name);
        this.loadCSS();

        if (!this.config.currencyAPIKey) {
            Log.error("No API key for currencies: disabling currency lookup");
        } else {
            this.updateCurrencies();
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
            if (!this.config.CurrencyAPIKey) {
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
            customHeader.className = "light small UNDERLINE";
            wrapper.appendChild(customHeader);
        }

        // get ready to process data and print it to the screen
        var outputWrapper = document.createElement('div');

        var dataLimit = ((this.config.places.length > 8) ? 3 : 2); 

        if (this.config.layoutStyle == 'table') {
            var table = document.createElement('table');
            table.className = "small align-left";
        }

        // about to change this to places
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
            placeContainer.className = "light small";

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
            timeWrapper.className = "time";
            placeContainer.appendChild(timeWrapper);

            // determine if user wants to see the abbreviated currency text (EUR, USD, ..)
            if (place.currency != "") {
                var currencySpan = document.createElement('span');
                if (this.rates && this.rates.hasOwnProperty(place.currency)) {
                    currencySpan.innerHTML = place.currency + ": " + this.rates[place.currency];
                } else {
                    currencySpan.innerHTML = "No data";
                    currencySpan.className = "dimmed light small";
                }
                placeContainer.appendChild(currencySpan);            
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
                } else {
                    Log.error(self.name + ": Could not load weather.");
                }
            }
        };
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
        var params = "?";
        params += "&APPID=" + this.config.weatherAPIKey
        params += "&q=" + Object.keys(placeIDs).join();
        params += "&units=" + this.config.weatherUnits;
        return params;
    },

    processWeather: function(data) {
        if (!data || !data.main || typeof data.main.temp === "undefined") {
            return;
        }
        console.log("received weather data: " + data);
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
        this.rates = data.rates;
        // if we got data in a different base, we need to convert
        if (this.config.currencyBase != this.config.currencyRelativeTo) {
            var conversion = this.rates[this.config.currencyRelativeTo];
            for (var cur in this.rates) {
                this.rates[cur] /= conversion;
                this.rates[cur] = this.rates[cur].toFixed(this.config.currencyPrecision);
            }
        }

        this.updateDom(this.config.animationSpeed);
    },

    scheduleUpdate: function() {
        var self = this;
        setTimeout(function() {
            self.updateCurrencies();
        }, self.config.updateInterval);
    },

});
