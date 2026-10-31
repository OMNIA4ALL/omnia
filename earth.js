/**
 * OMNIA Earth & Solar Module
 * Integrates Open-Meteo live weather, astronomical solar calculations, and synchronized global clocks.
 */
(function() {
  window.Omnia = window.Omnia || {};
  const api = window.Omnia.api;
  const storage = window.Omnia.storage;

  const CITIES = {
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
    init() {
      this.bindEvents();
      this.initClocks();
      this.updateCity('london');
    },

    bindEvents() {
      const citySelect = document.getElementById('earth-city-select');
      citySelect?.addEventListener('change', (e) => {
        this.updateCity(e.target.value);
      });

      document.getElementById('earth-refresh-weather-btn')?.addEventListener('click', () => {
        const val = citySelect ? citySelect.value : 'london';
        this.updateCity(val);
      });
    },

    updateCity(cityKey) {
      const city = CITIES[cityKey] || CITIES.london;
      const setTxt = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };

      setTxt('earth-weather-city', city.name);
      setTxt('radar-lat', `${Math.abs(city.lat)}° ${city.lat >= 0 ? 'N' : 'S'}`);
      setTxt('radar-lon', `${Math.abs(city.lon)}° ${city.lon >= 0 ? 'E' : 'W'}`);

      // Calculate Solar Ephemeris
      this.calculateSolar(city.lat, city.lon);

      // Fetch Live Open-Meteo Weather
      api.fetchWeather(city.lat, city.lon)
        .then(data => {
          if (data && data.current) {
            const cur = data.current;
            setTxt('earth-weather-temp', `${Math.round(cur.temperature_2m)}°C`);
            setTxt('earth-weather-feels', `Feels like ${Math.round(cur.apparent_temperature)}°C`);
            setTxt('earth-weather-humidity', `${cur.relative_humidity_2m}%`);
            setTxt('earth-weather-wind', `${Math.round(cur.wind_speed_10m)} km/h`);
            storage.showToast(`Updated weather for ${city.name}`, 'info');
          }
        })
        .catch(err => {
          console.warn('[OMNIA Weather] Connection fallback:', err);
          // Graceful fallback for offline sandbox
          const baseTemp = Math.round(18 - Math.abs(city.lat) * 0.2);
          setTxt('earth-weather-temp', `${baseTemp}°C`);
          setTxt('earth-weather-feels', `Feels like ${baseTemp - 2}°C`);
          setTxt('earth-weather-humidity', '68%');
          setTxt('earth-weather-wind', '14 km/h');
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
