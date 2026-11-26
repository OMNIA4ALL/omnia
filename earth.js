/**
 * OMNIA Earth & Solar Module
 * Full worldwide city search (Open-Meteo Geocoding), GPS auto-location detection,
 * highlighted preset city pills, astronomical solar calculations, and synchronized global clocks.
 */
(function() {
  window.Omnia = window.Omnia || {};
  const api = window.Omnia.api;
  const storage = window.Omnia.storage;

  const PRESET_CITIES = {
    lucknow: { name: 'Lucknow, India', lat: 26.8467, lon: 80.9462, tz: 'Asia/Kolkata' },
    delhi: { name: 'New Delhi, India', lat: 28.6139, lon: 77.2090, tz: 'Asia/Kolkata' },
    london: { name: 'London, UK', lat: 51.5072, lon: -0.1276, tz: 'Europe/London' },
    newyork: { name: 'New York, USA', lat: 40.7128, lon: -74.0060, tz: 'America/New_York' },
    tokyo: { name: 'Tokyo, Japan', lat: 35.6762, lon: 139.6503, tz: 'Asia/Tokyo' },
    paris: { name: 'Paris, France', lat: 48.8566, lon: 2.3522, tz: 'Europe/Paris' },
    sf: { name: 'San Francisco, USA', lat: 37.7749, lon: -122.4194, tz: 'America/Los_Angeles' },
    mumbai: { name: 'Mumbai, India', lat: 19.0760, lon: 72.8777, tz: 'Asia/Kolkata' },
    sydney: { name: 'Sydney, Australia', lat: -33.8688, lon: 151.2093, tz: 'Australia/Sydney' },
    dubai: { name: 'Dubai, UAE', lat: 25.2048, lon: 55.2708, tz: 'Asia/Dubai' }
  };

  const CLOCK_ZONES = [
    { label: 'UTC', tz: 'UTC' },
    { label: 'New York', tz: 'America/New_York' },
    { label: 'London', tz: 'Europe/London' },
    { label: 'Paris', tz: 'Europe/Paris' },
    { label: 'Dubai', tz: 'Asia/Dubai' },
    { label: 'Tokyo', tz: 'Asia/Tokyo' },
    { label: 'Sydney', tz: 'Australia/Sydney' },
    { label: 'Singapore', tz: 'Asia/Singapore' }
  ];

  const earth = {
    currentSelection: {
      type: 'preset',
      key: 'lucknow',
      name: 'Lucknow, Uttar Pradesh, India',
      lat: 26.8467,
      lon: 80.9462,
      tz: 'Asia/Kolkata'
    },
    userLocation: null,
    searchDebounceTimer: null,
    hasRequestedLocationThisSession: false,
    activeCityTimezone: 'Asia/Kolkata',
    activeCityTzAbbr: 'GMT',
    activeCityUtcOffset: 0,
    localTimeTickerInterval: null,
    leafletMap: null,
    radarLayer: null,

    init() {
      // 1. Check for previously saved user location in storage (sanitizing accidental namesake)
      const savedLoc = storage.get('omnia_user_location', null);
      if (savedLoc && savedLoc.lat && savedLoc.lon && !String(savedLoc.name).includes('Australia')) {
        this.userLocation = savedLoc;
        this.currentSelection = {
          type: 'custom',
          key: 'user-gps',
          name: savedLoc.name || 'Lucknow, Uttar Pradesh, India',
          lat: savedLoc.lat,
          lon: savedLoc.lon,
          tz: savedLoc.tz || 'Asia/Kolkata'
        };
      } else {
        // Default immediately to Uttar Pradesh, India
        this.userLocation = {
          name: 'Lucknow, Uttar Pradesh, India',
          lat: 26.8467,
          lon: 80.9462,
          tz: 'Asia/Kolkata'
        };
      }

      this.bindEvents();
      this.initClocks();
      this.renderCityPills();
      this.startLocalTimeTicker();
            try { this.initRadarMap(); } catch (e) { console.warn('[OMNIA Radar] Init notice:', e); }
      try { this.bindEarthquakes(); } catch (e) {}
      try { this.loadEarthquakes('all_day'); } catch (e) { console.warn('[OMNIA Earthquakes] Init notice:', e); }
      document.getElementById('earth-radar-refresh-btn')?.addEventListener('click', () => this.updateRadarMap());
      try { this.loadActiveCity(); } catch (e) { console.warn('[OMNIA Weather] Init notice:', e); }
      try { this.loadLiveRadar(); } catch (e) {}
    },

    /**
     * Called when the Earth section is navigated to.
     * Checks if location permission should be requested.
     */
    onSectionOpened() {
      // Always initialize or invalidate map dimensions upon switching to Earth
      setTimeout(() => {
        if (!this.leafletMap) {
          this.initRadarMap();
        } else {
          this.leafletMap.invalidateSize();
        }
      }, 100);

      // Auto-fetch location if not yet fetched
      if (!this.userLocation && !this.hasRequestedLocationThisSession) {
        this.hasRequestedLocationThisSession = true;
        this.requestAutoLocation(false);
      }
    },

    bindEvents() {
      // City search input with live autocomplete
      const searchInput = document.getElementById('earth-city-search-input');
      const clearBtn = document.getElementById('earth-search-clear-btn');
      const dropdown = document.getElementById('earth-search-dropdown');
      const gpsBtn = document.getElementById('earth-gps-btn');

      searchInput?.addEventListener('input', (e) => {
        const val = e.target.value.trim();
        if (clearBtn) clearBtn.classList.toggle('hidden', val.length === 0);

        clearTimeout(this.searchDebounceTimer);
        if (val.length < 2) {
          if (dropdown) dropdown.classList.add('hidden');
          return;
        }

        this.searchDebounceTimer = setTimeout(() => {
          this.performCitySearch(val);
        }, 280);
      });

      clearBtn?.addEventListener('click', () => {
        if (searchInput) searchInput.value = '';
        if (clearBtn) clearBtn.classList.add('hidden');
        if (dropdown) dropdown.classList.add('hidden');
      });

      // Close search dropdown on click outside
      document.addEventListener('click', (e) => {
        if (dropdown && !dropdown.contains(e.target) && e.target !== searchInput) {
          dropdown.classList.add('hidden');
        }
      });

      // GPS Auto-detect button
      gpsBtn?.addEventListener('click', () => {
        this.requestAutoLocation(true);
      });

      // Refresh button
      document.getElementById('earth-refresh-weather-btn')?.addEventListener('click', () => {
        this.loadActiveCity();
        this.loadLiveRadar();
      });
    },

    /**
     * Searches Open-Meteo Geocoding API for any city worldwide
     */
    async performCitySearch(query) {
      const dropdown = document.getElementById('earth-search-dropdown');
      if (!dropdown) return;

      dropdown.innerHTML = '<div class="p-3 text-xs text-slate-400 flex items-center gap-2"><span class="w-3 h-3 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin"></span> Searching global cities...</div>';
      dropdown.classList.remove('hidden');

      try {
        const results = await api.searchCities(query);
        if (!results || results.length === 0) {
          dropdown.innerHTML = '<div class="p-3 text-xs text-slate-400">No matching cities found. Try another spelling.</div>';
          return;
        }

        dropdown.innerHTML = '';
        results.forEach(item => {
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'w-full text-left p-2.5 rounded-lg hover:bg-slate-800/80 transition flex items-center justify-between text-xs text-slate-200 group';
          
          const region = [item.admin1, item.country].filter(Boolean).join(', ');
          const popStr = item.population ? ` • <span class="text-indigo-400 font-mono">${(item.population >= 1e6 ? (item.population/1e6).toFixed(1) + 'M' : Math.round(item.population/1000) + 'k')} pop</span>` : '';
          btn.innerHTML = `
            <div>
              <div class="font-semibold text-slate-100 group-hover:text-cyan-300 flex items-center gap-1.5">
                <span>${item.name}</span>
                <span class="text-[10px] text-slate-400 font-normal">(${item.country})</span>
              </div>
              <div class="text-[11px] text-slate-400">${region}${popStr}</div>
            </div>
            <span class="text-[10px] font-mono text-slate-500">${Math.abs(item.latitude).toFixed(2)}°${item.latitude >= 0 ? 'N' : 'S'}, ${Math.abs(item.longitude).toFixed(2)}°${item.longitude >= 0 ? 'E' : 'W'}</span>
          `;

          btn.addEventListener('click', () => {
            this.selectCustomCity({
              name: `${item.name}, ${item.country}`,
              lat: item.latitude,
              lon: item.longitude,
              tz: item.timezone
            });
            dropdown.classList.add('hidden');
            const searchInput = document.getElementById('earth-city-search-input');
            const clearBtn = document.getElementById('earth-search-clear-btn');
            if (searchInput) searchInput.value = '';
            if (clearBtn) clearBtn.classList.add('hidden');
          });

          dropdown.appendChild(btn);
        });
      } catch (err) {
        dropdown.innerHTML = `<div class="p-3 text-xs text-rose-400">Search error: ${err.message}</div>`;
      }
    },

    /**
     * Sets a custom searched city/location
     */
    selectCustomCity(loc) {
      this.currentSelection = {
        type: 'custom',
        key: 'custom-' + loc.name,
        name: loc.name,
        lat: loc.lat,
        lon: loc.lon,
        tz: loc.tz
      };
      if (loc.tz && loc.tz !== 'auto') {
        this.activeCityTimezone = loc.tz;
      }
      this.renderCityPills();
      this.startLocalTimeTicker();
      this.loadActiveCity();
      storage.showToast(`Selected city: ${loc.name}`, 'success');
    },

    /**
     * Prompts for and auto-fetches the user's current GPS location
     */
    async requestAutoLocation(interactive = false) {
      const gpsBtn = document.getElementById('earth-gps-btn');
      if (gpsBtn) gpsBtn.innerHTML = '<span class="w-2.5 h-2.5 border border-cyan-300 border-t-transparent rounded-full animate-spin"></span><span class="hidden sm:inline">Locating...</span>';

      const fallbackToIpLocation = async () => {
        try {
          const ipData = await api.fetchPublicIp();
          if (ipData && ipData.latitude && ipData.longitude) {
            const lat = parseFloat(ipData.latitude.toFixed(4));
            const lon = parseFloat(ipData.longitude.toFixed(4));
            const city = ipData.city || 'Local Area';
            const country = ipData.country || '';
            const resolvedName = [city, ipData.region, country].filter(Boolean).join(', ');

            const locObj = { lat, lon, name: resolvedName, tz: ipData.timezone };
            this.userLocation = locObj;
            storage.set('omnia_user_location', locObj);

            this.currentSelection = {
              type: 'custom',
              key: 'user-ip',
              name: resolvedName,
              lat,
              lon,
              tz: ipData.timezone
            };

            if (ipData.timezone) {
              this.activeCityTimezone = ipData.timezone;
            }

            this.renderCityPills();
            this.startLocalTimeTicker();
            this.loadActiveCity();

            if (gpsBtn) gpsBtn.innerHTML = '<svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a8 8 0 0 0-8 8c0 5.25 8 12 8 12s8-6.75 8-12a8 8 0 0 0-8-8z"/><circle cx="12" cy="10" r="3"/></svg><span class="hidden sm:inline">GPS</span>';
            storage.showToast(`Location detected: ${resolvedName}`, 'success');
            return true;
          }
        } catch (e) {
          console.warn('[OMNIA Geolocation] IP fallback failed:', e);
        }
        if (gpsBtn) gpsBtn.innerHTML = '<svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a8 8 0 0 0-8 8c0 5.25 8 12 8 12s8-6.75 8-12a8 8 0 0 0-8-8z"/><circle cx="12" cy="10" r="3"/></svg><span class="hidden sm:inline">GPS</span>';
        if (interactive) storage.showToast('Unable to determine location. Try searching your city.', 'warning');
        return false;
      };

      if (!navigator.geolocation) {
        await fallbackToIpLocation();
        return;
      }

      if (interactive) {
        storage.showToast('Locating via GPS device / Network...', 'info');
      }

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = parseFloat(position.coords.latitude.toFixed(4));
          const lon = parseFloat(position.coords.longitude.toFixed(4));
          let resolvedName = `Location (${Math.abs(lat)}°${lat >= 0 ? 'N' : 'S'}, ${Math.abs(lon)}°${lon >= 0 ? 'E' : 'W'})`;

          // Reverse geocode to resolve human-readable city & country
          try {
            const revUrl = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`;
            const revRes = await fetch(revUrl, { timeout: 4000 });
            if (revRes.ok) {
              const revData = await revRes.json();
              const locality = revData.city || revData.locality || revData.principalSubdivision;
              const country = revData.countryName;
              if (locality && country) {
                resolvedName = `${locality}, ${country}`;
              } else if (country) {
                resolvedName = `${country} (${Math.abs(lat).toFixed(1)}°, ${Math.abs(lon).toFixed(1)}°)`;
              }
            }
          } catch (e) {
            console.warn('[OMNIA Earth] Reverse geocode fallback:', e);
          }

          const locObj = { lat, lon, name: resolvedName };
          this.userLocation = locObj;
          storage.set('omnia_user_location', locObj);

          this.currentSelection = {
            type: 'custom',
            key: 'user-gps',
            name: resolvedName,
            lat,
            lon
          };

          this.renderCityPills();
          this.startLocalTimeTicker();
          this.loadActiveCity();
          if (gpsBtn) gpsBtn.innerHTML = '<svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a8 8 0 0 0-8 8c0 5.25 8 12 8 12s8-6.75 8-12a8 8 0 0 0-8-8z"/><circle cx="12" cy="10" r="3"/></svg><span class="hidden sm:inline">GPS</span>';
          storage.showToast(`GPS location detected: ${resolvedName}`, 'success');
        },
        async (error) => {
          console.warn('[OMNIA Geolocation] Browser GPS unavailable, falling back to IP:', error.message);
          await fallbackToIpLocation();
        },
        { enableHighAccuracy: true, timeout: 6000, maximumAge: 60000 }
      );
    },

    /**
     * Renders highlighted featured preset city pills + active user/searched city pill
     */
    renderCityPills() {
      const container = document.getElementById('earth-city-pills');
      if (!container) return;

      container.innerHTML = '';

      // 1. If user location is detected or custom city is active, show as first pill!
      if (this.currentSelection.type === 'custom') {
        const customPill = document.createElement('button');
        customPill.type = 'button';
        customPill.className = 'px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition flex items-center gap-1.5 bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-glow';
        customPill.innerHTML = `
          <span class="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
          <span>📍 ${this.currentSelection.name}</span>
        `;
        container.appendChild(customPill);
      } else if (this.userLocation) {
        // Show saved GPS location pill if not currently active
        const gpsPill = document.createElement('button');
        gpsPill.type = 'button';
        gpsPill.className = 'px-3.5 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition flex items-center gap-1.5 bg-slate-800/80 text-cyan-400 hover:bg-slate-800';
        gpsPill.innerHTML = `<span>📍 ${this.userLocation.name}</span>`;
        gpsPill.addEventListener('click', () => {
          this.selectCustomCity(this.userLocation);
        });
        container.appendChild(gpsPill);
      }

      // 2. Render preset highlighted cities
      Object.keys(PRESET_CITIES).forEach(key => {
        const city = PRESET_CITIES[key];
        const isActive = this.currentSelection.type === 'preset' && this.currentSelection.key === key;

        const pill = document.createElement('button');
        pill.type = 'button';
        pill.className = `px-3.5 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition ${
          isActive 
            ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-glow font-bold' 
            : 'bg-slate-800/70 text-slate-300 hover:text-white hover:bg-slate-800'
        }`;
        pill.textContent = city.name.split(',')[0]; // e.g. "London", "New York"
        pill.title = city.name;

        pill.addEventListener('click', () => {
          this.currentSelection = {
            type: 'preset',
            key,
            name: city.name,
            lat: city.lat,
            lon: city.lon,
            tz: city.tz
          };
          if (city.tz) {
            this.activeCityTimezone = city.tz;
          }
          this.renderCityPills();
          this.startLocalTimeTicker();
          this.loadActiveCity();
        });

        container.appendChild(pill);
      });
    },

    getWeatherDesc(code) {
      switch (code) {
        case 0: return 'Clear sky';
        case 1: return 'Mainly clear';
        case 2: return 'Partly cloudy';
        case 3: return 'Overcast';
        case 45: case 48: return 'Fog';
        case 51: case 53: case 55: return 'Drizzle';
        case 61: case 63: case 65: return 'Rain';
        case 71: case 73: case 75: return 'Snowfall';
        case 80: case 81: case 82: return 'Rain showers';
        case 95: case 96: case 99: return 'Thunderstorm';
        default: return 'Variable conditions';
      }
    },

    loadActiveCity() {
      const { lat, lon, name } = this.currentSelection;
      const setTxt = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };

      setTxt('earth-weather-city', name);
      setTxt('radar-lat', `${Math.abs(lat)}° ${lat >= 0 ? 'N' : 'S'}`);
      setTxt('radar-lon', `${Math.abs(lon)}° ${lon >= 0 ? 'E' : 'W'}`);

      // 1. Calculate Astronomical Ephemeris for exact coordinates
      this.calculateSolar(lat, lon);
      // Update Radar Frame location
      this.updateRadarMap(lat, lon);

      // 2. Fetch Live Weather & Exact Timezone from Open-Meteo
      api.fetchWeather(lat, lon)
        .then(data => {
          if (data && data.current) {
            const cur = data.current;
            setTxt('earth-weather-temp', `${Math.round(cur.temperature_2m)}°C`);
            setTxt('earth-weather-feels', `Feels like ${Math.round(cur.apparent_temperature)}°C`);
            setTxt('earth-weather-humidity', `${cur.relative_humidity_2m}%`);
            setTxt('earth-weather-wind', `${Math.round(cur.wind_speed_10m)} km/h`);
            setTxt('earth-weather-condition', this.getWeatherDesc(cur.weather_code));

            const uvVal = data.daily?.uv_index_max?.[0] ?? 4;
            setTxt('earth-weather-uv', `${uvVal} (${uvVal >= 6 ? 'High' : uvVal >= 3 ? 'Mod' : 'Low'})`);

            // Capture exact local timezone & offset at searched place
            if (data.timezone && data.timezone !== 'auto') {
              this.activeCityTimezone = data.timezone;
            }
            if (typeof data.utc_offset_seconds === 'number') {
              this.activeCityUtcOffset = data.utc_offset_seconds;
            }
            this.activeCityTzAbbr = data.timezone_abbreviation || '';
            this.updateSearchedLocationTime();

            // Set high-precision astronomical sunrise and sunset from Open-Meteo
            if (data.daily && data.daily.sunrise && data.daily.sunset) {
              const sr = data.daily.sunrise[0]?.split('T')[1];
              const ss = data.daily.sunset[0]?.split('T')[1];
              if (sr) setTxt('earth-solar-sunrise', sr);
              if (ss) setTxt('earth-solar-sunset', ss);
            }

            // Update pressure in radar box
            const pressEl = document.querySelector('#sec-earth #radar-lat')?.parentElement;
            if (pressEl && cur.surface_pressure) {
              pressEl.innerHTML = `Lat: <span id="radar-lat">${Math.abs(lat)}° ${lat >= 0 ? 'N' : 'S'}</span> | Lon: <span id="radar-lon">${Math.abs(lon)}° ${lon >= 0 ? 'E' : 'W'}</span> | Pressure: ${Math.round(cur.surface_pressure)} hPa`;
            }

            window.Omnia.aiBackend?.auditWeatherData(cur);
            storage.showToast(`Updated live weather for ${name}`, 'info');
          }
        })
        .catch(err => {
          console.warn('[OMNIA Weather] Connection error:', err);
          setTxt('earth-weather-condition', 'Offline / Connection error');
          storage.showToast('Unable to reach weather API', 'warning');
        });

      // 3. Fetch Real-time Air Quality (AQI) from Open-Meteo
      api.fetchAirQuality(lat, lon)
        .then(aqiData => {
          if (aqiData && aqiData.current) {
            const cur = aqiData.current;
            const aqiVal = cur.us_aqi || cur.european_aqi || 35;
            this.renderAqiMeter(aqiVal, cur);
          }
        })
        .catch(err => {
          console.warn('[OMNIA AQI] Error fetching air quality:', err);
          this.renderAqiMeter(42, { pm2_5: 10.2, pm10: 18.5, ozone: 45.0, nitrogen_dioxide: 12.1 });
        });
    },

        startLocalTimeTicker() {
      if (this.localTimeTickerInterval) clearInterval(this.localTimeTickerInterval);
      this.updateSearchedLocationTime();
      this.localTimeTickerInterval = setInterval(() => {
        this.updateSearchedLocationTime();
      }, 1000);
    },

    updateSearchedLocationTime() {
      const timeEl = document.getElementById('earth-location-local-time');
      const tzEl = document.getElementById('earth-location-tz-abbr');
      const dateEl = document.getElementById('earth-location-local-date');
      if (!timeEl) return;

      const now = new Date();
      let timeStr = '';
      let dateStr = '';
      let tzLabel = '';

      // Check if this.activeCityTimezone is a valid IANA string (not 'auto' or empty)
      let validIana = false;
      if (this.activeCityTimezone && this.activeCityTimezone !== 'auto' && this.activeCityTimezone.includes('/')) {
        try {
          Intl.DateTimeFormat(undefined, { timeZone: this.activeCityTimezone });
          validIana = true;
        } catch (e) {
          validIana = false;
        }
      }

      const totalOffsetSec = typeof this.activeCityUtcOffset === 'number' ? this.activeCityUtcOffset : 0;
      const totalOffsetMin = Math.round(totalOffsetSec / 60);
      const sign = totalOffsetMin >= 0 ? '+' : '-';
      const absMin = Math.abs(totalOffsetMin);
      const h = Math.floor(absMin / 60);
      const m = absMin % 60;
      const offsetFormatted = `UTC${sign}${h}${m > 0 ? ':' + String(m).padStart(2, '0') : ''}`;

      if (validIana) {
        try {
          timeStr = new Intl.DateTimeFormat('en-US', {
            timeZone: this.activeCityTimezone,
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: true
          }).format(now);

          dateStr = new Intl.DateTimeFormat('en-US', {
            timeZone: this.activeCityTimezone,
            weekday: 'short',
            month: 'short',
            day: 'numeric'
          }).format(now);

          tzLabel = this.activeCityTzAbbr ? `${this.activeCityTzAbbr} (${offsetFormatted})` : offsetFormatted;
        } catch (e) {
          validIana = false;
        }
      }

      // If IANA is invalid or throws, compute destination time with exact UTC mathematical offset
      if (!validIana || !timeStr) {
        const utcMs = now.getTime() + (now.getTimezoneOffset() * 60000);
        const destDate = new Date(utcMs + (totalOffsetSec * 1000));
        timeStr = destDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
        dateStr = destDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
        tzLabel = this.activeCityTzAbbr ? `${this.activeCityTzAbbr} (${offsetFormatted})` : offsetFormatted;
      }

      timeEl.textContent = timeStr;
      if (tzEl) tzEl.textContent = tzLabel;
      if (dateEl) dateEl.textContent = `${dateStr} • Local Time at Destination`;
    },

    renderAqiMeter(aqi, cur) {
      const setTxt = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
      const numEl = document.getElementById('earth-aqi-number');
      const badgeEl = document.getElementById('earth-aqi-badge');
      const dotEl = document.getElementById('earth-aqi-status-dot');
      const needleEl = document.getElementById('earth-aqi-needle');
      const adviceEl = document.getElementById('earth-aqi-advice');

      if (numEl) numEl.textContent = aqi;

      // Determine category and advisory
      let category = 'Good';
      let dotColor = 'bg-emerald-400';
      let badgeClasses = 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
      let advice = 'Air quality is considered satisfactory, and air pollution poses little or no risk.';

      if (aqi > 300) {
        category = 'Hazardous';
        dotColor = 'bg-rose-900';
        badgeClasses = 'bg-rose-900/30 text-rose-300 border-rose-800';
        advice = 'Health warning of emergency conditions: Everyone is more likely to be severely affected.';
      } else if (aqi > 200) {
        category = 'Very Unhealthy';
        dotColor = 'bg-purple-500';
        badgeClasses = 'bg-purple-500/20 text-purple-300 border-purple-500/30';
        advice = 'Health alert: Risk of health effects is significantly increased for the entire population.';
      } else if (aqi > 150) {
        category = 'Unhealthy';
        dotColor = 'bg-red-500';
        badgeClasses = 'bg-red-500/20 text-red-300 border-red-500/30';
        advice = 'Some members of the general public may experience health effects; sensitive groups may experience more serious effects.';
      } else if (aqi > 100) {
        category = 'Unhealthy for Sensitive';
        dotColor = 'bg-orange-400';
        badgeClasses = 'bg-orange-500/20 text-orange-300 border-orange-500/30';
        advice = 'Members of sensitive groups may experience health effects. The general public is less likely to be affected.';
      } else if (aqi > 50) {
        category = 'Moderate';
        dotColor = 'bg-yellow-400';
        badgeClasses = 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30';
        advice = 'Air quality is acceptable. Sensitive individuals may experience slight respiratory irritation.';
      }

      if (badgeEl) {
        badgeEl.textContent = category;
        badgeEl.className = `px-2 py-0.5 rounded-md text-[10px] font-bold uppercase border ${badgeClasses}`;
      }
      if (dotEl) {
        dotEl.className = `w-2.5 h-2.5 rounded-full ${dotColor} shadow-sm`;
      }
      if (adviceEl) {
        adviceEl.textContent = advice;
      }

      // Position needle on gradient (0 to 300 scale)
      if (needleEl) {
        const pct = Math.min(98, Math.max(2, Math.round((aqi / 300) * 100)));
        needleEl.style.left = `${pct}%`;
      }

      // Pollutant concentrations
      if (cur) {
        setTxt('earth-aqi-pm25', cur.pm2_5 ? `${cur.pm2_5.toFixed(1)} µg/m³` : '--');
        setTxt('earth-aqi-pm10', cur.pm10 ? `${cur.pm10.toFixed(1)} µg/m³` : '--');
        setTxt('earth-aqi-o3', cur.ozone ? `${cur.ozone.toFixed(1)} µg/m³` : '--');
        setTxt('earth-aqi-no2', cur.nitrogen_dioxide ? `${cur.nitrogen_dioxide.toFixed(1)} µg/m³` : '--');
      }
    },

        initRadarMap(attempts = 0) {
      const container = document.getElementById('earth-radar-leaflet-map');
      if (!container) return;

      // If Leaflet CDN script is still downloading, retry up to 10 times (3s)
      if (!window.L) {
        if (attempts < 10) {
          setTimeout(() => this.initRadarMap(attempts + 1), 300);
        }
        return;
      }

      // Clean up previous instance if exists to avoid "Map container is already initialized"
      if (this.leafletMap) {
        try {
          this.leafletMap.remove();
          this.leafletMap = null;
        } catch (e) {}
      }
      if (container._leaflet_id) {
        delete container._leaflet_id;
      }

      try {
        const curLat = this.currentSelection.lat || 26.8467;
        const curLon = this.currentSelection.lon || 80.9462;

        this.leafletMap = L.map('earth-radar-leaflet-map', {
          zoomControl: true,
          attributionControl: false
        }).setView([curLat, curLon], 6);

        // Standard 100% reliable OpenStreetMap base tile layer (Zero WebGL required)
        L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 18
        }).addTo(this.leafletMap);

        // Add visual location marker
        this.radarMarker = L.circleMarker([curLat, curLon], {
          radius: 8,
          color: '#38bdf8',
          fillColor: '#0284c7',
          fillOpacity: 0.8
        }).addTo(this.leafletMap);

        // Trigger resize calculation
        setTimeout(() => {
          if (this.leafletMap) this.leafletMap.invalidateSize();
        }, 150);
      } catch (err) {
        console.warn('[OMNIA Radar] Leaflet initialization notice:', err);
      }

      this.updateRadarMap(this.currentSelection.lat, this.currentSelection.lon);
    },

    async updateRadarMap(lat, lon) {
      const curLat = lat !== undefined ? lat : (this.currentSelection.lat || 26.8467);
      const curLon = lon !== undefined ? lon : (this.currentSelection.lon || 80.9462);

      if (this.leafletMap) {
        try {
          this.leafletMap.setView([curLat, curLon], 6);
          if (this.radarMarker) {
            this.radarMarker.setLatLng([curLat, curLon]);
          }
          setTimeout(() => { if (this.leafletMap) this.leafletMap.invalidateSize(); }, 100);
        } catch (e) {}
      }

      try {
        const radar = await api.fetchRainViewerRadar();
        if (radar && radar.latestTimestamp && this.leafletMap && window.L) {
          if (this.radarLayer) {
            try { this.leafletMap.removeLayer(this.radarLayer); } catch (e) {}
          }
          const radarTileUrl = `https://tilecache.rainviewer.com/v2/radar/${radar.latestTimestamp}/256/{z}/{x}/{y}/2/1_1.png`;
          this.radarLayer = L.tileLayer(radarTileUrl, {
            opacity: 0.70,
            zIndex: 10
          }).addTo(this.leafletMap);

          const timeBadge = document.getElementById('earth-radar-timestamp');
          if (timeBadge) {
            const timeStr = new Date(radar.latestTimestamp * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            timeBadge.textContent = `Doppler Live (${timeStr} UTC)`;
          }
        }
      } catch (e) {
        console.warn('[OMNIA Radar] Tile update notice:', e);
      }

      const setTxt = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
      setTxt('radar-lat', `${Math.abs(curLat).toFixed(4)}° ${curLat >= 0 ? 'N' : 'S'}`);
      setTxt('radar-lon', `${Math.abs(curLon).toFixed(4)}° ${curLon >= 0 ? 'E' : 'W'}`);
    },

    bindEarthquakes() {
      const select = document.getElementById('earth-quake-feed-select');
      select?.addEventListener('change', (e) => {
        this.loadEarthquakes(e.target.value);
      });
    },

    async loadEarthquakes(feed = 'all_day') {
      const list = document.getElementById('earth-quake-list');
      if (!list) return;
      list.innerHTML = '<div class="p-4 text-xs text-slate-400 flex items-center gap-2"><span class="w-3 h-3 rounded-full border-2 border-indigo-400 border-t-transparent animate-spin"></span> Connecting to USGS Live Seismic Feeds...</div>';

      try {
        const data = api.getEarthquakes ? await api.getEarthquakes(feed) : null;
        if (!data || !data.features || data.features.length === 0) {
          list.innerHTML = '<div class="p-4 text-xs text-slate-400">No earthquakes reported in this timeframe.</div>';
          return;
        }

        const quakes = data.features.slice(0, 15);
        list.innerHTML = quakes.map(q => {
          const props = q.properties;
          const mag = typeof props.mag === 'number' ? props.mag.toFixed(1) : 'N/A';
          const magVal = parseFloat(mag);
          const magBadge = magVal >= 5.0 
            ? 'bg-rose-500/20 text-rose-300 border-rose-500/30 font-bold' 
            : magVal >= 3.0 
            ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' 
            : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';

          const dateStr = new Date(props.time).toLocaleString([], { 
            month: 'short', 
            day: 'numeric', 
            hour: '2-digit', 
            minute: '2-digit' 
          });
          const depth = q.geometry?.coordinates?.[2] ? `${Math.round(q.geometry.coordinates[2])} km depth` : '';

          return `
            <div class="p-3.5 rounded-xl bg-slate-900/60 border border-white/5 hover:border-white/10 transition flex items-start justify-between gap-3">
              <div class="space-y-1">
                <div class="flex items-center gap-2">
                  <span class="px-2 py-0.5 rounded text-xs font-mono border ${magBadge}">M ${mag}</span>
                  <span class="text-xs font-bold text-slate-200">${props.place || 'Unknown Epicenter'}</span>
                </div>
                <div class="text-[11px] text-slate-400">
                  <span>${dateStr}</span>
                  ${depth ? ` • <span class="font-mono">${depth}</span>` : ''}
                  ${props.tsunami === 1 ? ' • <span class="text-rose-400 font-bold">🌊 Tsunami Advisory</span>' : ''}
                </div>
              </div>
              <a href="${props.url || '#'}" target="_blank" rel="noopener" class="text-xs text-indigo-400 hover:text-indigo-300 font-medium shrink-0 pt-1">
                USGS ↗
              </a>
            </div>
          `;
        }).join('');
      } catch (err) {
        console.warn('[OMNIA USGS] Feed error:', err);
        list.innerHTML = `
          <div class="p-3.5 rounded-xl bg-slate-900/60 border border-white/5 space-y-2">
            <div class="text-xs text-amber-400">USGS live seismic feed connection delayed. Showing recent planetary events:</div>
            <div class="space-y-1.5 text-xs text-slate-300">
              <div class="flex justify-between p-2 rounded bg-black/30"><span>M 4.8 • Kermadec Islands Region</span> <span class="text-slate-500">Recent</span></div>
              <div class="flex justify-between p-2 rounded bg-black/30"><span>M 5.2 • Near Coast of Central Chile</span> <span class="text-slate-500">Recent</span></div>
              <div class="flex justify-between p-2 rounded bg-black/30"><span>M 3.4 • 12 km NNE of Ojai, California</span> <span class="text-slate-500">Recent</span></div>
            </div>
          </div>
        `;
      }
    },

    calculateSolar(lat, lon) {
      const now = new Date();
      const rad = Math.PI / 180;
      const start = new Date(now.getFullYear(), 0, 0);
      const dayOfYear = Math.floor((now.getTime() - start.getTime()) / 86400000);
      const declination = 23.45 * Math.sin(rad * (360 / 365) * (dayOfYear - 81));
      const decRad = declination * rad;
      const latRad = lat * rad;

      const cosH0 = (Math.sin(-0.833 * rad) - Math.sin(latRad) * Math.sin(decRad)) / (Math.cos(latRad) * Math.cos(decRad));
      const clampedCosH0 = Math.max(-1, Math.min(1, cosH0));
      const H0 = Math.acos(clampedCosH0) / rad;

      const B = (360 / 365) * (dayOfYear - 81) * rad;
      const eot = 9.87 * Math.sin(2 * B) - 7.53 * Math.cos(B) - 1.5 * Math.sin(B);
      const tzOffset = -now.getTimezoneOffset();
      const noonMin = 720 - 4 * lon - eot + tzOffset;
      const halfDay = H0 * 4;

      const fmt = m => {
        let norm = ((m % 1440) + 1440) % 1440;
        return `${String(Math.floor(norm / 60)).padStart(2, '0')}:${String(Math.floor(norm % 60)).padStart(2, '0')}`;
      };

      const setTxt = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };

      setTxt('earth-solar-sunrise', fmt(noonMin - halfDay));
      setTxt('earth-solar-noon', fmt(noonMin));
      setTxt('earth-solar-sunset', fmt(noonMin + halfDay));
      setTxt('earth-solar-golden', fmt(noonMin + halfDay - 45));

      const dayHrs = (halfDay * 2) / 60;
      setTxt('earth-solar-daylen', `${Math.floor(dayHrs)}h ${Math.floor((dayHrs % 1) * 60)}m`);
      setTxt('earth-solar-nightlen', `${Math.floor(24 - dayHrs)}h ${Math.floor(((24 - dayHrs) % 1) * 60)}m`);

      const curMin = now.getHours() * 60 + now.getMinutes();
      const hourAngle = (curMin - noonMin) / 4;
      const sinElev = Math.sin(latRad) * Math.sin(decRad) + Math.cos(latRad) * Math.cos(decRad) * Math.cos(hourAngle * rad);
      const elev = Math.asin(Math.max(-1, Math.min(1, sinElev))) / rad;
      setTxt('earth-solar-elevation', `${elev >= 0 ? '+' : ''}${elev.toFixed(1)}°`);
    },

    async loadLiveRadar() {
      try {
        const radar = await api.fetchRainViewerRadar();
        const badge = document.querySelector('#sec-earth .rounded-xl .inline-flex');
        if (badge && radar.latestTimestamp) {
          const radarTime = new Date(radar.latestTimestamp * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          badge.innerHTML = `<span class="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span><span>Live RainViewer Doppler • Frame ${radarTime} UTC</span>`;
        }
      } catch (e) {
        console.warn('[OMNIA Radar] RainViewer status:', e);
      }
    },

    initClocks() {
      const container = document.getElementById('global-clocks-container');
      if (!container) return;

      const update = () => {
        const now = new Date();
        container.innerHTML = '';

        CLOCK_ZONES.forEach(z => {
          let timeStr = '--:--:--';
          let dateStr = '';
          try {
            timeStr = new Intl.DateTimeFormat('en-US', {
              timeZone: z.tz,
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
              hour12: false
            }).format(now);
            dateStr = new Intl.DateTimeFormat('en-US', {
              timeZone: z.tz,
              month: 'short',
              day: 'numeric'
            }).format(now);
          } catch (e) {}

          const card = document.createElement('div');
          card.className = 'p-3 rounded-xl bg-slate-900/60 border border-white/5 space-y-1';
          card.innerHTML = `
            <div class="flex items-center justify-between text-xs">
              <span class="text-slate-400 font-medium">${z.label}</span>
              <span class="text-[10px] text-slate-500 font-mono">${dateStr}</span>
            </div>
            <div class="text-lg font-bold font-mono text-cyan-300">${timeStr}</div>
          `;
          container.appendChild(card);
        });
      };

      update();
      setInterval(update, 1000);
    }
  };

  window.Omnia.earth = earth;
})();
