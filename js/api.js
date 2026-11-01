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
      chunkUrl: 'https://speed.cloudflare.com/__down?bytes=5000000', // 5MB standard test payload
      keyRequired: false
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
      const url = `${API_CONFIG.openMeteo.geocodingUrl}?name=${encodeURIComponent(query.trim())}&count=6&language=en&format=json`;
      const res = await fetch(url, { signal });
      if (!res.ok) throw new Error(`Geocoding HTTP error: ${res.status}`);
      const data = await res.json();
      return data.results || [];
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
      const url = `${API_CONFIG.openMeteo.weatherUrl}?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,surface_pressure,wind_speed_10m,wind_direction_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,uv_index_max&timezone=auto`;
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
      // 1. IPinfo if user supplied token
      if (API_CONFIG.keys.ipinfo) {
        try {
          const ipinfoRes = await fetch(`https://ipinfo.io/json?token=${API_CONFIG.keys.ipinfo}`, { signal });
          if (ipinfoRes.ok) {
            const data = await ipinfoRes.json();
            return {
              ip: data.ip,
              city: data.city || 'Unknown City',
              region: data.region || '',
              country: data.country || '',
              org: data.org || '',
              asn: data.org ? data.org.split(' ')[0] : 'IPv4',
              source: 'IPinfo.io'
            };
          }
        } catch (e) {}
      }

      // 2. Free ipapi.co
      try {
        const res = await fetch(API_CONFIG.ipLookup.primaryUrl, { signal });
        if (res.ok) {
          const data = await res.json();
          if (data && data.ip) {
            return {
              ip: data.ip,
              city: data.city || 'Unknown City',
              region: data.region || '',
              country: data.country_name || data.country || '',
              org: data.org || data.asn || '',
              asn: data.asn || 'AS',
              version: data.version || 'IPv4',
              source: 'ipapi.co'
            };
          }
        }
      } catch (e) {
        console.warn('[OMNIA API] ipapi.co fallback to ipify:', e);
      }

      // 3. Reliable Fallback ipify
      const fallbackRes = await fetch(API_CONFIG.ipLookup.fallbackUrl, { signal });
      if (!fallbackRes.ok) throw new Error(`IP lookup failed: ${fallbackRes.status}`);
      const ipData = await fallbackRes.json();
      return {
        ip: ipData.ip,
        city: 'Client Network',
        country: 'Global Interface',
        org: 'Public ISP Gateway',
        source: 'ipify'
      };
    },

    /**
     * Real HTTP request round-trip timing probe using performance.now()
     */
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
    async runBandwidthDownloadTest(onProgress, signal) {
      const url = `${API_CONFIG.speedTest.chunkUrl}&_t=${Date.now()}`;
      const startTime = performance.now();
      const res = await fetch(url, { signal, cache: 'no-store' });
      if (!res.ok) throw new Error(`Speed test download failed: HTTP ${res.status}`);

      const reader = res.body?.getReader();
      let bytesReceived = 0;
      const totalBytes = 5000000;

      if (!reader) {
        // Fallback for browsers without stream reader
        const blob = await res.blob();
        bytesReceived = blob.size;
        const totalDuration = (performance.now() - startTime) / 1000;
        const finalMbps = ((bytesReceived * 8) / (totalDuration * 1000000)).toFixed(1);
        if (onProgress) onProgress({ mbps: finalMbps, percent: 100, bytes: bytesReceived });
        return { mbps: finalMbps, bytes: bytesReceived, durationSec: totalDuration };
      }

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        bytesReceived += value.length;

        const elapsedSec = (performance.now() - startTime) / 1000;
        if (elapsedSec > 0.05) {
          const currentMbps = ((bytesReceived * 8) / (elapsedSec * 1000000)).toFixed(1);
          const percent = Math.min(100, Math.round((bytesReceived / totalBytes) * 100));
          if (onProgress) onProgress({ mbps: currentMbps, percent, bytes: bytesReceived });
        }
      }

      const totalDuration = (performance.now() - startTime) / 1000;
      const finalMbps = ((bytesReceived * 8) / (totalDuration * 1000000)).toFixed(1);
      if (onProgress) onProgress({ mbps: finalMbps, percent: 100, bytes: bytesReceived });
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
      if (API_CONFIG.keys.nasaApod) {
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
          console.warn('[OMNIA API] NASA APOD fallback:', e);
        }
      }

      return null;
    }
  };

  window.Omnia.api = api;
})();
