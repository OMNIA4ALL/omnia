/**
 * OMNIA External API Integration Module
 * Manages Open-Meteo weather and geocoding, Cloudflare DoH DNS queries, and IP lookup.
 */
(function() {
  window.Omnia = window.Omnia || {};

  const api = {
    /**
     * Searches cities worldwide via Open-Meteo Geocoding API.
     */
    async searchCities(query, signal) {
      if (!query || query.trim().length < 2) return [];
      const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query.trim())}&count=6&language=en&format=json`;
      const res = await fetch(url, { signal });
      if (!res.ok) throw new Error(`Geocoding HTTP error: ${res.status}`);
      const data = await res.json();
      return data.results || [];
    },

    /**
     * Fetches current weather and daily/hourly forecast from Open-Meteo REST API.
     */
    async fetchWeather(lat, lon, signal) {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,surface_pressure,wind_speed_10m,wind_direction_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,uv_index_max&timezone=auto`;
      const res = await fetch(url, { signal });
      if (!res.ok) throw new Error(`Weather HTTP error: ${res.status}`);
      return await res.json();
    },

    /**
     * Resolves DNS records using Cloudflare DNS-over-HTTPS (DoH).
     */
    async resolveDns(domain, type = 'A', signal) {
      const url = `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(domain.trim())}&type=${type}`;
      const res = await fetch(url, {
        headers: { 'Accept': 'application/dns-json' },
        signal
      });
      if (!res.ok) throw new Error(`DNS resolution failed with status ${res.status}`);
      return await res.json();
    },

    /**
     * Fetches public IP from reliable public endpoint (ipify).
     */
    async fetchPublicIp(signal) {
      const res = await fetch('https://api.ipify.org?format=json', { signal });
      if (!res.ok) throw new Error(`IP lookup failed: ${res.status}`);
      return await res.json();
    },

    /**
     * Real HTTP request round-trip timing probe using Performance.now()
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
    }
  };

  window.Omnia.api = api;
})();
