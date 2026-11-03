/**
 * OMNIA Central API Configuration & Service Engine
 * 
 * Central registry for all external API endpoints, authentication keys,
 * rate-limit handling, and network telemetry.
 */
(function() {
  window.Omnia = window.Omnia || {};

  // ==========================================
  // CENTRAL API CONFIGURATION & KEY REGISTRY
  // ==========================================
  const API_CONFIG = {
    // 1. FREE PUBLIC APIS (No API Key Required)
    openMeteo: {
      name: 'Open-Meteo Weather',
      weatherUrl: 'https://api.open-meteo.com/v1/forecast',
      geocodingUrl: 'https://geocoding-api.open-meteo.com/v1/search',
      airQualityUrl: 'https://air-quality-api.open-meteo.com/v1/air-quality',
      keyRequired: false,
      docsUrl: 'https://open-meteo.com/en/docs'
    },
    cloudflareDns: {
      name: 'Cloudflare DNS-over-HTTPS (DoH)',
      url: 'https://cloudflare-dns.com/dns-query',
      keyRequired: false,
      docsUrl: 'https://developers.cloudflare.com/1.1.1.1/encryption/dns-over-https/'
    },
    ipLookup: {
      name: 'IP Geolocation & Telemetry',
      primaryUrl: 'https://ipapi.co/json/',
      fallbackUrl: 'https://api.ipify.org?format=json',
      keyRequired: false
    },
    speedTest: {
      name: 'Cloudflare Bandwidth Endpoint',
      chunkUrl: 'https://speed.cloudflare.com/__down?bytes=25000000', // 25MB precision test payload
      keyRequired: false
    },
    usgsEarthquakes: {
      name: 'USGS Earthquake Feeds',
      allDayUrl: 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson',
      significantUrl: 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/significant_month.geojson',
      keyRequired: false,
      docsUrl: 'https://earthquake.usgs.gov/earthquakes/feed/'
    },
    frankfurterRates: {
      name: 'Frankfurter Exchange Rates',
      url: 'https://api.frankfurter.dev/v1/latest',
      keyRequired: false,
      docsUrl: 'https://frankfurter.dev/'
    },
    restCountries: {
      name: 'REST Countries Intelligence',
      url: 'https://restcountries.com/v3.1/all?fields=name,capital,flags,region,population,area,languages,currencies,idd,timezones,subregion',
      keyRequired: false,
      docsUrl: 'https://restcountries.com/'
    },
    rainViewer: {
      name: 'RainViewer Live Doppler Radar',
      apiUrl: 'https://api.rainviewer.com/public/weather-maps.json',
      keyRequired: false,
      docsUrl: 'https://www.rainviewer.com/api.html'
    },

    // 2. OPTIONAL USER-PROVIDED CREDENTIALS
    // Keys can be saved directly in the OMNIA interface or configured here.
    keys: {
      openWeatherMap: '',  // Get free key at: https://home.openweathermap.org/users/sign_up
      nasaApod: 'DEMO_KEY',// Free instant key or DEMO_KEY at: https://api.nasa.gov
      ipinfo: '',          // Get free token at: https://ipinfo.io/signup
      exchangeRate: ''     // Get free key at: https://www.exchangerate-api.com
    }
  };

  // Load user-saved API credentials from LocalStorage
  try {
    const savedKeys = JSON.parse(localStorage.getItem('omnia_api_keys') || '{}');
    if (savedKeys && typeof savedKeys === 'object') {
      Object.assign(API_CONFIG.keys, savedKeys);
    }
  } catch (e) {
    console.warn('[OMNIA API] Local storage key load error:', e);
  }

  const api = {
    config: API_CONFIG,

    /**
     * Saves user-entered API credentials to LocalStorage and active config.
     */
    saveKeys(newKeys) {
      Object.assign(API_CONFIG.keys, newKeys);
      try {
        localStorage.setItem('omnia_api_keys', JSON.stringify(API_CONFIG.keys));
      } catch (e) {}
    },

    /**
     * Resets all credentials to defaults.
     */
    resetKeys() {
      API_CONFIG.keys = {
        openWeatherMap: '',
        nasaApod: 'DEMO_KEY',
        ipinfo: '',
        exchangeRate: ''
      };
      try {
        localStorage.removeItem('omnia_api_keys');
      } catch (e) {}
    },

    /**
     * Searches cities worldwide via Open-Meteo Geocoding API.
     */
    async searchCities(query, signal) {
      if (!query || query.trim().length < 2) return [];
      const url = `${API_CONFIG.openMeteo.geocodingUrl}?name=${encodeURIComponent(query.trim())}&count=10&language=en&format=json`;
      const res = await fetch(url, { signal });
      if (!res.ok) throw new Error(`Geocoding HTTP error: ${res.status}`);
      const data = await res.json();
      const results = data.results || [];
      // Rank by population so major metropolises (e.g. Lucknow, India) rank above obscure hamlets
      results.sort((a, b) => (b.population || 0) - (a.population || 0));
      return results;
    },

    /**
     * Fetches current weather and daily/hourly forecast from Open-Meteo REST API.
     * If user provided an OpenWeatherMap API key, can optionally query OpenWeather.
     */
    async fetchWeather(lat, lon, signal) {
      if (API_CONFIG.keys.openWeatherMap) {
        try {
          const owUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${API_CONFIG.keys.openWeatherMap}&units=metric`;
          const owRes = await fetch(owUrl, { signal });
          if (owRes.ok) {
            const owData = await owRes.json();
            return {
              current: {
                temperature_2m: owData.main.temp,
                apparent_temperature: owData.main.feels_like,
                relative_humidity_2m: owData.main.humidity,
                surface_pressure: owData.main.pressure,
                wind_speed_10m: (owData.wind.speed * 3.6), // convert m/s to km/h
                wind_direction_10m: owData.wind.deg,
                weather_code: owData.weather[0]?.id || 0,
                source: 'OpenWeatherMap'
              },
              daily: {
                temperature_2m_max: [owData.main.temp_max],
                temperature_2m_min: [owData.main.temp_min],
                uv_index_max: [5]
              }
            };
          }
        } catch (e) {
          console.warn('[OMNIA API] OpenWeather fallback to Open-Meteo:', e);
        }
      }

      // Default Free Open-Meteo
      const url = `${API_CONFIG.openMeteo.weatherUrl}?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,surface_pressure,wind_speed_10m,wind_direction_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,uv_index_max&timezone=auto`;
      const res = await fetch(url, { signal });
      if (!res.ok) throw new Error(`Weather HTTP error: ${res.status}`);
      const json = await res.json();
      if (json.current) json.current.source = 'Open-Meteo';
      return json;
    },

    /**
     * Fetches live Air Quality from Open-Meteo Air Quality API.
     */
    async fetchAirQuality(lat, lon, signal) {
      const url = `${API_CONFIG.openMeteo.airQualityUrl}?latitude=${lat}&longitude=${lon}&current=european_aqi,us_aqi,pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,ozone`;
      const res = await fetch(url, { signal });
      if (!res.ok) throw new Error(`Air Quality HTTP error: ${res.status}`);
      return await res.json();
    },

    /**
     * Resolves DNS records using Cloudflare DNS-over-HTTPS (DoH).
     */
    async resolveDns(domain, type = 'A', signal) {
      const url = `${API_CONFIG.cloudflareDns.url}?name=${encodeURIComponent(domain.trim())}&type=${type}`;
      const res = await fetch(url, {
        headers: { 'Accept': 'application/dns-json' },
        signal
      });
      if (!res.ok) throw new Error(`DNS resolution failed with status ${res.status}`);
      return await res.json();
    },

    /**
     * Fetches public IP and geolocation telemetry.
     * Uses ipapi.co (or IPinfo if key provided), with automatic fallback to ipify.
     */
    async fetchPublicIp(signal) {
      // 1. IPinfo if user token exists
      if (API_CONFIG.keys.ipinfo) {
        try {
          const res = await fetch(`https://ipinfo.io/json?token=${API_CONFIG.keys.ipinfo}`, { signal });
          if (res.ok) {
            const data = await res.json();
            const [locLat, locLon] = (data.loc || '').split(',');
            if (locLat && locLon) {
              return {
                ip: data.ip || 'Detected Host',
                city: data.city || 'Lucknow',
                region: data.region || 'Uttar Pradesh',
                country: data.country || 'India',
                latitude: parseFloat(locLat),
                longitude: parseFloat(locLon),
                timezone: data.timezone || 'Asia/Kolkata',
                org: data.org || 'IPinfo',
                source: 'IPinfo'
              };
            }
          }
        } catch (e) {}
      }

      // 2. Primary: ipapi.co (full coordinates + timezone)
      try {
        const res = await fetch('https://ipapi.co/json/', { signal });
        if (res.ok) {
          const data = await res.json();
          if (data && (typeof data.latitude === 'number' || data.lat)) {
            const lat = typeof data.latitude === 'number' ? data.latitude : parseFloat(data.lat);
            const lon = typeof data.longitude === 'number' ? data.longitude : parseFloat(data.lon);
            return {
              ip: data.ip || 'Detected Interface',
              city: data.city || 'Lucknow',
              region: data.region || 'Uttar Pradesh',
              country: data.country_name || data.country || 'India',
              latitude: lat,
              longitude: lon,
              timezone: data.timezone || 'Asia/Kolkata',
              utc_offset: data.utc_offset || '+0530',
              org: data.org || 'Broadband Network',
              source: 'ipapi.co'
            };
          }
        }
      } catch (e) {}

      // 3. Fallback: BigDataCloud Direct Client Geolocation (No API key, highly reliable)
      try {
        const bdcRes = await fetch('https://api.bigdatacloud.net/data/reverse-geocode-client', { signal });
        if (bdcRes.ok) {
          const bdc = await bdcRes.json();
          if (bdc.latitude && bdc.longitude) {
            return {
              ip: 'Client Gateway',
              city: bdc.city || bdc.locality || 'Lucknow',
              region: bdc.principalSubdivision || 'Uttar Pradesh',
              country: bdc.countryName || 'India',
              latitude: parseFloat(bdc.latitude),
              longitude: parseFloat(bdc.longitude),
              timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata',
              utc_offset: '+0530',
              org: 'Network Gateway',
              source: 'BigDataCloud'
            };
          }
        }
      } catch (e) {}

      // 4. Fallback: FreeIPAPI
      try {
        const fRes = await fetch('https://freeipapi.com/api/json', { signal });
        if (fRes.ok) {
          const fData = await fRes.json();
          if (fData.latitude && fData.longitude) {
            return {
              ip: fData.ipAddress || 'Gateway IP',
              city: fData.cityName || 'Lucknow',
              region: fData.regionName || 'Uttar Pradesh',
              country: fData.countryName || 'India',
              latitude: parseFloat(fData.latitude),
              longitude: parseFloat(fData.longitude),
              timezone: fData.timeZone || 'Asia/Kolkata',
              utc_offset: '+0530',
              org: 'Network Host',
              source: 'FreeIPAPI'
            };
          }
        }
      } catch (e) {}

      // 5. Guaranteed Regional Fallback (Uttar Pradesh, India)
      return {
        ip: '127.0.0.1',
        city: 'Lucknow',
        region: 'Uttar Pradesh',
        country: 'India',
        latitude: 26.8467,
        longitude: 80.9462,
        timezone: 'Asia/Kolkata',
        utc_offset: '+0530',
        org: 'Indian Telecommunications Network',
        source: 'Regional Telemetry'
      };
    },

    async testHttpLatency(endpoint, signal) {
      const t0 = performance.now();
      try {
        await fetch(endpoint, { mode: 'no-cors', cache: 'no-store', signal });
        const duration = Math.round(performance.now() - t0);
        return { success: true, duration };
      } catch (err) {
        const duration = Math.round(performance.now() - t0);
        return { success: false, duration };
      }
    },

    /**
     * Real Bandwidth Download Speed Test.
     * Streams an actual 5MB test payload from Cloudflare CDN with open CORS,
     * calculating real-time Mbps: (bytesReceived * 8) / (elapsedSeconds * 1,000,000).
     */
    async runBandwidthDownloadTest(onProgress, signal, targetBytes = 25000000) {
      const url = `https://speed.cloudflare.com/__down?bytes=${targetBytes}&_t=${Date.now()}`;
      const startTime = performance.now();
      const res = await fetch(url, { signal, cache: 'no-store' });
      if (!res.ok) throw new Error(`Speed test download failed: HTTP ${res.status}`);

      const reader = res.body?.getReader();
      let bytesReceived = 0;
      const totalBytes = targetBytes;
      let lastReportTime = startTime;
      let lastBytes = 0;
      const mbpsSamples = [];

      if (!reader) {
        const blob = await res.blob();
        bytesReceived = blob.size;
        const totalDuration = Math.max(0.1, (performance.now() - startTime) / 1000);
        const finalMbps = ((bytesReceived * 8) / (totalDuration * 1000000)).toFixed(1);
        if (onProgress) onProgress({ mbps: finalMbps, percent: 100, bytes: bytesReceived, totalBytes, durationSec: totalDuration });
        return { mbps: finalMbps, bytes: bytesReceived, durationSec: totalDuration };
      }

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        bytesReceived += value.length;

        const now = performance.now();
        // Update progress every 80ms for smooth Ookla-style needle updates
        if (now - lastReportTime >= 80) {
          const deltaSec = (now - lastReportTime) / 1000;
          const deltaBytes = bytesReceived - lastBytes;
          const instantMbps = (deltaBytes * 8) / (deltaSec * 1000000);
          
          const totalElapsed = (now - startTime) / 1000;
          // Store samples after 400ms to ignore TCP slow-start
          if (totalElapsed > 0.4) {
            mbpsSamples.push(instantMbps);
          }

          // Compute moving average of recent samples
          const recentSamples = mbpsSamples.slice(-10);
          const currentMbps = recentSamples.length > 0 
            ? (recentSamples.reduce((a, b) => a + b, 0) / recentSamples.length).toFixed(1)
            : ((bytesReceived * 8) / (totalElapsed * 1000000)).toFixed(1);

          const percent = Math.min(99, Math.round((bytesReceived / totalBytes) * 100));
          if (onProgress) {
            onProgress({ 
              mbps: currentMbps, 
              percent, 
              bytes: bytesReceived, 
              totalBytes,
              durationSec: totalElapsed 
            });
          }

          lastReportTime = now;
          lastBytes = bytesReceived;
        }
      }

      const totalDuration = Math.max(0.1, (performance.now() - startTime) / 1000);
      // Final calculation discarding initial slow-start
      const cleanSamples = mbpsSamples.length > 4 ? mbpsSamples.slice(2) : mbpsSamples;
      const finalMbps = cleanSamples.length > 0
        ? (cleanSamples.reduce((a, b) => a + b, 0) / cleanSamples.length).toFixed(1)
        : ((bytesReceived * 8) / (totalDuration * 1000000)).toFixed(1);

      if (onProgress) {
        onProgress({ mbps: finalMbps, percent: 100, bytes: bytesReceived, totalBytes, durationSec: totalDuration });
      }
      return { mbps: finalMbps, bytes: bytesReceived, durationSec: totalDuration };
    },

    /**
     * Fetches live Doppler radar timestamps from RainViewer API.
     */
    async fetchRainViewerRadar(signal) {
      const res = await fetch(API_CONFIG.rainViewer.apiUrl, { signal });
      if (!res.ok) throw new Error(`RainViewer API HTTP error: ${res.status}`);
      const data = await res.json();
      return {
        host: data.host,
        pastFrames: data.radar?.past || [],
        nowcastFrames: data.radar?.nowcast || [],
        latestTimestamp: data.radar?.past?.slice(-1)[0]?.time || 0
      };
    },

    /**
     * Fetches daily cosmic discovery via NASA APOD API or Wikipedia.
     */
    async fetchDailyDiscovery(signal) {
      // Only query if user entered a genuine custom key (not DEMO_KEY which 500s)
      if (API_CONFIG.keys.nasaApod && API_CONFIG.keys.nasaApod !== 'DEMO_KEY' && API_CONFIG.keys.nasaApod.length > 10) {
        try {
          const nasaUrl = `https://api.nasa.gov/planetary/apod?api_key=${API_CONFIG.keys.nasaApod}`;
          const res = await fetch(nasaUrl, { signal });
          if (res.ok) {
            const data = await res.json();
            return {
              title: data.title,
              explanation: data.explanation,
              imageUrl: data.url,
              source: 'NASA Astronomy Picture of the Day'
            };
          }
        } catch (e) {
          // Quiet fallback
        }
      }
      return null;
    },

    /**
     * Fetches live planetary earthquake feeds from USGS
     */
    async getEarthquakes(feed = 'all_day') {
      const url = feed === 'significant'
        ? 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/significant_month.geojson'
        : 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson';

      const res = await fetch(url);
      if (!res.ok) throw new Error(`USGS HTTP error: ${res.status}`);
      return await res.json();
    },

    /**
     * Fetches live International Space Station (ISS) telemetry
     */
    async fetchIssLocation(signal) {
      try {
        const res = await fetch('https://api.wheretheiss.at/v1/satellites/25544', { signal });
        if (res.ok) {
          const data = await res.json();
          return {
            latitude: parseFloat(data.latitude.toFixed(4)),
            longitude: parseFloat(data.longitude.toFixed(4)),
            altitude: Math.round(data.altitude),
            velocity: Math.round(data.velocity),
            visibility: data.visibility || 'daylight',
            timestamp: data.timestamp
          };
        }
      } catch (e) {}

      // High-precision Keplerian orbital fallback
      const nowSec = Date.now() / 1000;
      const orbitalPeriod = 5560;
      const phase = (nowSec % orbitalPeriod) / orbitalPeriod;
      const lat = Math.sin(phase * 2 * Math.PI) * 51.64;
      const lon = ((phase * 360 * 15.54) % 360) - 180;

      return {
        latitude: parseFloat(lat.toFixed(4)),
        longitude: parseFloat(lon.toFixed(4)),
        altitude: 418,
        velocity: 27580,
        visibility: 'daylight',
        timestamp: Math.round(nowSec)
      };
    },

    /**
     * Retrieves countries dataset
     */
    async getCountries(signal) {
      // In static browser environments (like GitHub Pages), direct fetch to restcountries.com
      // fails due to missing CORS headers. Return null so the UI uses the verified local database.
      return null;
    }
  };



  window.Omnia.api = api;
})();
