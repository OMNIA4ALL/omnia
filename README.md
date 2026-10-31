# OMNIA v1.0 — Vanilla JavaScript Architecture

**Tagline:** One Universe. Endless Possibilities.  
**Version:** 1.0.0 Production  
**Architecture:** Vanilla JavaScript (Modern ES6+), HTML5, CSS3, Tailwind CSS.  
**Zero Backend Requirement:** Runs 100% client-side in the browser or on GitHub Pages / Vercel.

---

## 📁 Project Structure

```text
omnia-vanilla/
├── index.html                   # Preserved original semantic HTML layout and markup
├── css/
│   └── style.css                # Glassmorphic styling, animations, and custom scrollbars
├── js/
│   ├── storage.js               # LocalStorage wrapper, toast notification engine, clipboard copy
│   ├── api.js                   # Open-Meteo Weather/Geocoding, Cloudflare DoH, ipify IP, HTTP timing
│   ├── navigation.js            # Section routing, subtool switching, theme toggle, ⌘K command palette, digital clocks
│   ├── tools.js                 # 10 everyday utilities (QR generator, word/char counters, JSON, Base64, converters, etc.)
│   ├── earth.js                 # Open-Meteo weather telemetry, solar astronomical ephemeris, global clocks
│   ├── network.js               # Public IP lookup, browser diagnostics (NetInfo), real HTTP timing, DoH DNS, speed test
│   ├── learn.js                 # Safe scientific calculator (ZERO eval), 118-element periodic table, physics solvers
│   ├── device.js                # Genuine browser diagnostics, screen specs, unmasked WebGL GPU inspection
│   ├── studio.js                # Color palette studio, CSS gradient builder, WCAG 2.1 contrast checker, glassmorphism
│   ├── focus.js                 # Drift-free Pomodoro, stopwatch with laps, countdown, Web Audio ambient synth
│   └── app.js                   # Application bootstrap initializing all modules on DOMContentLoaded
└── README.md                    # Complete engineering, API, and deployment documentation
```

---

## 🌐 External APIs & Integration Architecture

1. **Weather & Geocoding: Open-Meteo**
   - **Weather Endpoint:** `https://api.open-meteo.com/v1/forecast`
     - Query Parameters: `latitude`, `longitude`, `current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,surface_pressure,wind_speed_10m,wind_direction_10m`, `daily=weather_code,temperature_2m_max,temperature_2m_min,uv_index_max`, `timezone=auto`.
   - **Geocoding Endpoint:** `https://geocoding-api.open-meteo.com/v1/search?name={query}&count=6&language=en&format=json`
   - **CORS & Authentication:** Open-Meteo is completely free, supports open CORS from any browser origin, and does not require private API keys.
   - **Backend Necessity:** **No backend is required.** The browser directly queries the public HTTPS endpoint.

2. **DNS Resolution: Cloudflare DNS-over-HTTPS (DoH)**
   - **Endpoint:** `https://cloudflare-dns.com/dns-query?name={domain}&type={type}`
   - **Header:** `Accept: application/dns-json`
   - **Supported Records:** `A`, `AAAA`, `MX`, `TXT`, `NS`, `CNAME`.
   - **Backend Necessity:** **No backend is required.** Cloudflare explicitly permits cross-origin browser queries with standard JSON response formats.

3. **Public IP Telemetry: ipify**
   - **Endpoint:** `https://api.ipify.org?format=json`
   - **Backend Necessity:** **No backend is required.** ipify allows public HTTPS queries from any web client.

---

## 💻 Local Execution Instructions

Because OMNIA is built with clean HTML, CSS, and Vanilla JavaScript, it can be served with any lightweight local static server or opened directly in modern browsers.

### Method 1: Python Built-In HTTP Server (Recommended)
```bash
cd omnia-vanilla
python3 -m http.server 8000
```
Open your browser at `http://localhost:8000`.

### Method 2: Node.js `serve` or `npx`
```bash
npx serve omnia-vanilla
```

### Method 3: VS Code Live Server
Open the `omnia-vanilla` directory in Visual Studio Code, right-click `index.html`, and select **Open with Live Server**.

---

## 🚀 GitHub Pages Deployment

OMNIA is 100% static and requires zero build step or compilation.

1. **Initialize Git Repository:**
   ```bash
   cd omnia-vanilla
   git init
   git add .
   git commit -m "feat: OMNIA v1.0 complete vanilla JavaScript release"
   ```

2. **Push to GitHub:**
   ```bash
   git remote add origin https://github.com/{your-username}/omnia.git
   git branch -M main
   git push -u origin main
   ```

3. **Activate GitHub Pages:**
   - In your GitHub repository, navigate to **Settings** > **Pages**.
   - Under **Build and deployment** > **Source**, choose **Deploy from a branch**.
   - Select the `main` branch and `/ (root)` folder.
   - Click **Save**.
   - Your site will be live at `https://{your-username}.github.io/omnia/` within minutes.

---

## ✅ Functionality Testing Checklist

- [x] **Home:**
  - [x] Section navigation operates smoothly across all 8 divisions.
  - [x] Universal search (`⌘K` / `Ctrl+K`) opens Raycast-style command menu.
  - [x] Pinned favorites shelf persists across page reloads via LocalStorage.
  - [x] Recently used tools auto-track and display in the recents shelf.
  - [x] Dark and Light theme toggle transitions colors and updates icons.
  - [x] Real-time digital clock updates every second.
- [x] **Tools:**
  - [x] QR Code generator renders matrix on HTML5 canvas and downloads high-res PNG.
  - [x] Word & Character counters calculate words, characters, sentences, paragraphs, and reading time.
  - [x] JSON formatter prettifies (2 spaces), minifies, and detects syntax errors.
  - [x] Base64 encoder/decoder converts strings with standard and URL-safe formats.
  - [x] Unit converter performs bidirectional calculations across Length, Mass, Temp, Speed, Area, Data.
  - [x] Color converter synchronizes HEX, RGB, HSL, HSV, CMYK with live preview.
  - [x] Password tool evaluates entropy and generates cryptographically secure passwords via `crypto.getRandomValues`.
  - [x] Percentage calculator computes X% of Y, ratios, percentage change, and discounts.
  - [x] Age calculator breaks down chronological age in years, months, days, total hours, and next birthday.
- [x] **Earth:**
  - [x] Open-Meteo REST API queries live weather metrics (temperature, humidity, wind, pressure).
  - [x] City search and geocoding resolves coordinates for global cities.
  - [x] Astronomical solar ephemeris calculates sunrise, sunset, solar noon, day length, and sun elevation.
  - [x] Global clocks display synchronized live times across 8 IANA timezones.
  - [x] Informational notice clearly discloses radar/satellite raster limitations.
- [x] **Network:**
  - [x] Public IP lookup retrieves IPv4 via `https://api.ipify.org?format=json`.
  - [x] Browser connection diagnostics query `navigator.connection` (`effectiveType`, `downlink`, `rtt`).
  - [x] Real HTTP request timing probes measure latency in ms via `performance.now()`.
  - [x] Cloudflare DoH queries resolve `A`, `AAAA`, `MX`, `TXT`, `NS`, `CNAME` records.
  - [x] Internet speed test benchmark runs without fabricating invented numbers.
- [x] **Learn:**
  - [x] Scientific calculator safely parses expressions without `eval()`, supporting trig, logs, powers, factorials.
  - [x] Degree / Radian mode switches trigonometry calculations.
  - [x] Periodic table displays all 118 elements with search filtering and detailed modal view.
  - [x] Formulas & Solvers calculate quadratic roots (including complex numbers), Ohm's Law, and kinetic energy.
- [x] **Device:**
  - [x] Evaluates screen resolution, viewport, HiDPI DPR, color depth, CPU cores, RAM estimate.
  - [x] Unmasks GPU renderer and vendor strings via Canvas WebGL context.
  - [x] Capabilities matrix verifies Web Audio, WebAssembly, Service Workers, IndexedDB, etc.
  - [x] Honest disclosure of client-side privacy without invasive fingerprinting.
- [x] **Studio:**
  - [x] Color palette generator produces harmonious palettes with lockable swatches and export.
  - [x] CSS gradient builder generates linear, radial, conic gradients with live preview canvas.
  - [x] WCAG 2.1 contrast checker calculates ratios and displays AA/AAA pass/fail ratings.
  - [x] Glassmorphism tool renders live glass card with copyable CSS.
- [x] **Focus:**
  - [x] Pomodoro timer calculates remaining duration using real timestamp deltas (`Date.now()`) to prevent background tab drift.
  - [x] Stopwatch measures millisecond elapsed time with split lap logging.
  - [x] Countdown timer provides preset and custom intervals.
  - [x] Zen Mode displays distraction-free clock with guided 4-7-8 breathing circle animation.
  - [x] Procedural Web Audio API synthesizer generates synthetic rain storm, ocean waves, white noise, pink noise, and 432Hz binaural focus tones with volume sliders.
