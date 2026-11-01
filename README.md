# OMNIA v1.0 — Real API Integrations & Central Configuration

**Tagline:** One Universe. Endless Possibilities.  
**Version:** 1.0.0 Production  
**Architecture:** Vanilla JavaScript (Modern ES6+), HTML5, CSS3, Tailwind CSS  
**Zero Mandatory Backend:** Runs 100% client-side in the browser or on GitHub Pages / Vercel.

---

## 🔑 API Keys Summary & How to Obtain Credentials

OMNIA is engineered so that **95% of features function out-of-the-box with zero keys or registration required**. Optional provider keys can be added either directly in `js/api.js` under `API_CONFIG.keys` or via the in-app **API Configuration & Credentials Modal** (`⌘K -> Configure API Keys` or the gear icon in the header/sidebar).

### 1. Free, Out-of-the-Box Integrations (No Key Needed)
- **Open-Meteo Weather & Geocoding:** Live temperature, apparent temperature, relative humidity, wind speed/direction, surface pressure, condition codes, UV index, and global city search. No key required.
- **Open-Meteo Air Quality:** European AQI, US AQI, $PM_{2.5}$, $PM_{10}$, $NO_2$, $O_3$, $SO_2$, and $CO$. No key required.
- **Cloudflare DNS-over-HTTPS (DoH):** Direct queries to `https://cloudflare-dns.com/dns-query` resolving `A`, `AAAA`, `MX`, `TXT`, `NS`, and `CNAME` records. No key required.
- **ipapi.co / ipify IP Telemetry:** Real public IP, ISP/Organization, ASN, city, and country lookup with open CORS. No key required.
- **Cloudflare CDN Real Bandwidth Speed Test:** Streams a genuine 5MB binary payload from `https://speed.cloudflare.com/__down?bytes=5000000`, measuring actual byte transfer duration and real-time Mbps. No key required.
- **RainViewer Doppler Weather Radar:** Live global Doppler radar timestamps and tile streaming via `https://api.rainviewer.com/public/weather-maps.json`. No key required.
- **Real HTTP Latency Timing Probes:** Actual round-trip timing measurements to Cloudflare (1.1.1.1), Google Anycast, AWS, and Fastly edge nodes via `performance.now()`. No key required.

### 2. Optional Provider Keys
If you want to plug in external commercial providers, obtain these free-tier credentials:
1. **OpenWeatherMap API Key (Optional):**
   - **Provider:** OpenWeatherMap (`https://home.openweathermap.org/users/sign_up`)
   - **Free Quota:** 1,000 API calls/day free.
   - **Purpose:** Alternative live weather and custom radar precipitation tile overlay.
2. **NASA APOD API Key (Optional):**
   - **Provider:** NASA Open APIs (`https://api.nasa.gov`)
   - **Free Quota:** Instant free key (or uses default `DEMO_KEY` with 30 requests/hour).
   - **Purpose:** Daily cosmic discovery astronomy photo and astrophysics briefing.
3. **IPinfo.io Token (Optional):**
   - **Provider:** IPinfo (`https://ipinfo.io/signup`)
   - **Free Quota:** 50,000 geolocation requests/month free.
   - **Purpose:** High-capacity corporate IP intelligence fallback.

---

## 🛠️ Central Configuration in `js/api.js`

All endpoints and credentials are consolidated in `js/api.js`:

```javascript
const API_CONFIG = {
  // Free public endpoints (pre-wired, no keys needed)
  openMeteo: { ... },
  cloudflareDns: { ... },
  ipLookup: { ... },
  speedTest: { ... },
  rainViewer: { ... },

  // User credentials (override via UI or enter here)
  keys: {
    openWeatherMap: '',   // Paste your OpenWeatherMap key here (optional)
    nasaApod: 'DEMO_KEY', // Paste your NASA key here (optional)
    ipinfo: '',           // Paste your IPinfo token here (optional)
    exchangeRate: ''      // Paste your ExchangeRate-API key here (optional)
  }
};
```

---

## 📁 Project Structure

```text
omnia-vanilla/
├── index.html                   # Preserved original HTML structure with API settings modal
├── css/
│   └── style.css                # Glassmorphic styling, animations, and custom scrollbars
├── js/
│   ├── storage.js               # LocalStorage wrapper, toast notification engine, clipboard copy
│   ├── api.js                   # Central API configuration, key management, and fetch methods
│   ├── navigation.js            # Section routing, API modal wiring, theme switching, ⌘K command menu
│   ├── tools.js                 # 10 everyday utilities (QR generator, word/char counters, JSON, Base64, converters)
│   ├── earth.js                 # Open-Meteo live weather, RainViewer radar API, solar ephemeris, global clocks
│   ├── network.js               # Public IP lookup, browser diagnostics, real HTTP timing, DoH DNS, real speed test
│   ├── learn.js                 # Safe scientific calculator (ZERO eval), 118-element periodic table, physics solvers
│   ├── device.js                # Genuine browser telemetry, screen resolution, unmasked WebGL GPU inspection
│   ├── studio.js                # Color palette studio, CSS gradient builder, WCAG contrast checker, glassmorphism
│   ├── focus.js                 # Drift-free Pomodoro, stopwatch with laps, countdown, Web Audio ambient synth
│   └── app.js                   # Application bootstrap initializing all modules on DOMContentLoaded
└── README.md                    # Complete engineering, API, and deployment documentation
```

---

## 💻 Running Locally

```bash
# Unzip and serve with Python 3:
unzip omnia-vanilla.zip -d omnia-vanilla
cd omnia-vanilla
python3 -m http.server 8000
```
Open your browser at `http://localhost:8000`.
