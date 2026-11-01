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
      type: 'preset', // 'preset' or 'custom'
      key: 'london',
      name: 'London, UK',
      lat: 51.5072,
      lon: -0.1276
    },
    userLocation: null,
    searchDebounceTimer: null,
    hasRequestedLocationThisSession: false,

    init() {
      // 1. Check for previously saved user location in storage
      const savedLoc = storage.get('omnia_user_location', null);
      if (savedLoc && savedLoc.lat && savedLoc.lon) {
        this.userLocation = savedLoc;
        this.currentSelection = {
          type: 'custom',
          key: 'user-gps',
          name: savedLoc.name || 'Your Location',
          lat: savedLoc.lat,
          lon: savedLoc.lon
        };
      }

      this.bindEvents();
      this.initClocks();
      this.renderCityPills();
      this.loadActiveCity();
      this.loadLiveRadar();
    },

    /**
     * Called when the Earth section is navigated to.
     * Checks if location permission should be requested.
     */
    onSectionOpened() {
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
          btn.innerHTML = `
            <div>
              <div class="font-semibold text-slate-100 group-hover:text-cyan-300">${item.name}</div>
              <div class="text-[11px] text-slate-400">${region}</div>
            </div>
            <span class="text-[10px] font-mono text-slate-500">${Math.abs(item.latitude).toFixed(1)}°${item.latitude >= 0 ? 'N' : 'S'}, ${Math.abs(item.longitude).toFixed(1)}°${item.longitude >= 0 ? 'E' : 'W'}</span>
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
        lon: loc.lon
      };
      this.renderCityPills();
      this.loadActiveCity();
      storage.showToast(`Selected city: ${loc.name}`, 'success');
    },

    /**
     * Prompts for and auto-fetches the user's current GPS location
     */
    requestAutoLocation(interactive = false) {
      if (!navigator.geolocation) {
        if (interactive) storage.showToast('Geolocation is not supported by your browser', 'warning');
        return;
      }

      if (interactive) {
        storage.showToast('Requesting GPS location permission...', 'info');
      }

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = parseFloat(position.coords.latitude.toFixed(4));
          const lon = parseFloat(position.coords.longitude.toFixed(4));
          let resolvedName = `Location (${Math.abs(lat)}°${lat >= 0 ? 'N' : 'S'}, ${Math.abs(lon)}°${lon >= 0 ? 'E' : 'W'})`;

          // Attempt free reverse geocoding to resolve city and country name
          try {
            const revUrl = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`;
            const revRes = await fetch(revUrl);
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
          this.loadActiveCity();
          storage.showToast(`Auto-fetched your location: ${resolvedName}`, 'success');
        },
        (error) => {
          if (interactive) {
            storage.showToast('Location permission denied or unavailable', 'warning');
          }
        },
        { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
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
            lon: city.lon
          };
          this.renderCityPills();
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

      // 2. Fetch Live Weather from Open-Meteo
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

            // Update pressure in radar box
            const pressEl = document.querySelector('#sec-earth #radar-lat')?.parentElement;
            if (pressEl && cur.surface_pressure) {
              pressEl.innerHTML = `Lat: <span id="radar-lat">${Math.abs(lat)}° ${lat >= 0 ? 'N' : 'S'}</span> | Lon: <span id="radar-lon">${Math.abs(lon)}° ${lon >= 0 ? 'E' : 'W'}</span> | Pressure: ${Math.round(cur.surface_pressure)} hPa`;
            }

            storage.showToast(`Updated live weather for ${name}`, 'info');
          }
        })
        .catch(err => {
          console.warn('[OMNIA Weather] Connection error:', err);
          setTxt('earth-weather-condition', 'Offline / Connection error');
          storage.showToast('Unable to reach weather API', 'warning');
        });
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
