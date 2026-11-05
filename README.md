# OMNIA 2.0 — One Universe. Endless Possibilities.

**OMNIA 2.0** is an expanded, unified client-side digital operating environment bringing together everyday browser utilities, scientific simulations, planetary Earth intelligence, network diagnostics, developer tools, hardware inspection, creative utilities, and private personal productivity into one cohesive interface.

Built strictly with modern Vanilla JavaScript (ES6+), HTML5, and Tailwind CSS. Zero external framework bloat, zero tracking, and 100% compatible with GitHub Pages.

---

## 🚀 Key Modules (16 Complete Divisions)

### 1. Life Dashboard (`#home`)
- **Customizable Widget Grid**: 8 core at-a-glance cards (Digital clock with seconds, live local weather with AQI, workspace notes & tasks count, battery & device connectivity telemetry, global time-zone clocks, quick tool shortcuts).
- **In-Page Customizer**: Toggle widget visibility, reorder, and restore defaults with persistent browser LocalStorage saving.

### 2. Browser Tools (`#tools`)
- **10 Client-Side Utilities**:
  - QR Code Generator with live canvas preview and high-res PNG download.
  - Word & Character Counter with real-time reading time, lines, and paragraph analysis.
  - JSON Validator, Formatter & Minifier with syntax highlighting.
  - Base64 Encoder & Decoder (with URL-safe variant toggle).
  - Physical Unit Converter across length, mass, temperature, speed, and time.
  - Color Code Converter with interactive RGB sliders, HEX, HSL, HSV, and CMYK outputs.
  - Cryptographic Password Generator using browser `crypto.getRandomValues()`.
  - Percentage Calculator with 4 core problem formulations.
  - Exact Age Calculator with years, months, days, weekday of birth, and next milestone.
- **Instant Live Filter Bar**: Real-time keystroke filtering across all utility cards.

### 3. Earth & Global Events (`#earth`)
- **Worldwide City Search**: Open-Meteo Geocoding API integration to search any city, town, or home location.
- **GPS Auto-Detection**: One-click geolocation coordinate acquisition via `navigator.geolocation`.
- **Weather & Solar Ephemeris**: Real-time temperature, apparent temperature, humidity, surface pressure, wind speed/direction, precipitation, UV index, and sunrise/sunset timestamps.
- **USGS Live Seismic Feed**: Real-time planetary earthquake activity reported directly by the United States Geological Survey with magnitude filters, depth, coordinates, and direct USGS event links.
- **Precipitation Radar**: Live RainViewer Doppler radar tile layers with timestamps.

### 4. Universe Explorer (`#universe`)
- **Interactive Heliocentric Solar System**: Animated 2D Canvas orbital simulation of Sun and all 8 planets with pause/resume and 1x/2x/5x/10x orbital speed controls.
- **Planetary Telemetry**: Clickable planet pills with physical metrics (diameters, distances, orbital periods, surface temperatures, gravities, and scientific facts).
- **Lunar Ephemeris**: Real-time lunar age calculation based on the synodic cycle (~29.53 days), illumination percentage, and exact moon phase name.
- **Astronomical Events**: Curated schedule of annual meteor showers (Perseids, Geminids), equinox eclipse windows, and planetary conjunctions.

### 5. Simulation Lab (`#simulation-lab`)
- **14 Interactive Physics Simulations**:
  - Projectile motion with launch angle, initial velocity, gravity, trajectory arc, flight time, and max height.
  - Simple pendulum harmonic oscillator with length, initial angle, and period $T = 2\pi\sqrt{L/g}$.
  - Wave propagation with frequency, amplitude, and wave speed $v = f\lambda$.
  - Ohm's law with circuit schematic, current electron flow, voltage, resistance, and dissipated power $P = VI$.

### 6. Learn & Science (`#learn`)
- **Scientific Calculator**: Safe mathematical expression tokenizer and evaluator without dynamic `eval()`, supporting trigonometric functions ($\sin$, $\cos$, $	an$), parentheses, and exponentiation.
- **118-Element Periodic Table**: Complete IUPAC periodic table with element symbol, atomic number, atomic mass, category tagging, and interactive modal dialog.
- **Scientific Formulas**: Physics and mathematics solvers for quadratic equations, Ohm's law, and kinetic energy.

### 7. File Lab (`#file-lab`)
- **100% Client-Side File Processing**: Zero server uploads.
- **Image Tools**: Canvas-based image compression, resizing (with aspect ratio lock), rotation ($90^\circ$ steps), format conversion (PNG, JPEG, WebP), and Base64 conversion.
- **File Hashing & Metadata**: Browser `crypto.subtle.digest('SHA-256')` checksum generator, file extension inspector, and MIME type validator.
- **Document Viewers**: Plain text, CSV interactive table viewer, and Markdown preview.

### 8. Code Playground (`#code-playground`)
- **Sandboxed Developer IDE**: HTML, CSS, and JavaScript editor with instant live execution inside a restricted `sandbox="allow-scripts"` iframe.
- **Project Export**: One-click download of the complete runnable HTML bundle.
- **Developer Utilities**: Quick UUID v4 generator, Unix epoch timestamp converter, Base64 encoder/decoder, and JSON formatter.

### 9. World Intelligence (`#world`)
- **ECB Currency Converter**: Live exchange rates powered by the European Central Bank via the Frankfurter API with base currency selection and reverse swapping.
- **Financial Centres World Clock**: Live multi-timezone digital clocks with IANA timezone strings, UTC offsets, and daylight saving detection.
- **REST Countries Explorer**: Searchable database of 250+ sovereign nations with SVG flags, capital cities, populations, geographic areas, languages, and regional classifications.
- **13-Dimension Unit Converter**: Comprehensive conversion matrix for length, mass, speed, time, data storage, pressure, and energy.

### 10. Personal Workspace (`#workspace`)
- **Local Notes**: Create, edit, delete, and search personal notes with character and word counters.
- **Task Tracker**: Priority flags (High, Medium, Low), completion checkboxes, and active filters.
- **Bookmark Vault**: Quick-access link organizer with title and URL fields.
- **Data Privacy**: Complete JSON export and import backup tools. Zero server storage.

### 11. Network Suite (`#network`)
- **Public IP Telemetry**: Genuine IP lookup and ISP provider detection via ipapi.co and ipify.
- **Cloudflare DNS-over-HTTPS**: Direct DNS queries to Cloudflare `1.1.1.1` resolver for A, AAAA, MX, and TXT records.
- **Genuine Speed Benchmarking**: Real HTTP download measurement using Cloudflare CDN payloads. Zero fabricated statistics.

### 12. Device Inspector (`#device`)
- **Hardware Telemetry**: Screen resolution, viewport dimensions, device pixel ratio, color depth, logical CPU cores, and device memory.
- **WebGL Hardware Renderer**: Unmasked GPU vendor and graphics driver detection using `WEBGL_debug_renderer_info`.

### 13. Design Studio (`#studio`)
- **Harmonic Color Studio**: Real-time palette generation with lockable color swatches and copyable HEX/RGB values.
- **WCAG 2.1 Contrast Checker**: Foreground vs background contrast ratio calculation with AA/AAA compliance badges.

### 14. Focus & Ambient Suite (`#focus`)
- **Drift-Free Pomodoro**: 25-minute focus intervals and 5-minute break timers.
- **Web Audio Ambient Synthesizer**: Procedural sound generation (Rain storm, ocean surf, white noise, pink noise, and 432Hz binaural drone) using Web Audio API oscillators and gain nodes. No audio files required.

### 15. Privacy Centre (`#privacy`)
- **Browser Security Audit**: Non-invasive inspection of HTTPS encryption, secure context availability, cookie permissions, Do Not Track signals, and storage quota estimation.
- **Permissions State Monitor**: Query browser permission states for camera, microphone, geolocation, and notifications.

### 16. OMNIA Intelligence (`#assistant`)
- **Natural Language Command Interface**: Offline rule-based natural language parser that routes user commands directly to corresponding modules (e.g., weather queries, currency conversion, focus timers, notes).
- **Optional API Settings**: Local storage for custom LLM endpoint and key configuration without client-side hardcoding.

---

## 🌐 Genuine Zero-Auth Public APIs

| Provider | Endpoint | Purpose | Authentication |
| :--- | :--- | :--- | :--- |
| **Open-Meteo** | `api.open-meteo.com` | Weather Forecast & Air Quality | 100% Free, No Key |
| **Open-Meteo Geo** | `geocoding-api.open-meteo.com` | Worldwide City Geocoding | 100% Free, No Key |
| **USGS** | `earthquake.usgs.gov` | Live Planetary Earthquakes | 100% Free, No Key |
| **Frankfurter** | `api.frankfurter.dev` | European Central Bank Exchange Rates | 100% Free, No Key |
| **REST Countries** | `restcountries.com` | Sovereign Countries Intelligence | 100% Free, No Key |
| **Cloudflare DoH** | `cloudflare-dns.com` | DNS-over-HTTPS Resolver | 100% Free, No Key |
| **RainViewer** | `api.rainviewer.com` | Doppler Precipitation Radar | 100% Free, No Key |
| **ipapi / ipify** | `ipapi.co` / `api.ipify.org` | Public IP Telemetry | 100% Free, No Key |

---

## 📦 Deployment Instructions (GitHub Pages)

### Option 1: Single-File Deploy (Simplest & Recommended)
1. In your GitHub repository (`omnia4all/omnia`), replace `index.html` with the bundled `index.html` (or `omnia.html`).
2. Because all CSS and JavaScript are self-contained with CDN assets, this completely prevents 404 path errors on GitHub Pages subpaths.

### Option 2: Modular Multi-File Deploy
1. Upload the entire project directory:
   - `index.html`
   - `css/style.css`
   - `js/*.js` (all 20 modules)
   - `manifest.json`, `service-worker.js`, `offline.html`
2. Push to your `main` branch. GitHub Pages will deploy automatically.

---

## 📱 Progressive Web App (PWA) Support

OMNIA 2.0 includes a fully configured `manifest.json` and `service-worker.js`:
- Relative paths (`./`) ensure proper loading under the `/omnia/` base path.
- Cache-first strategy for local application assets; network-first for live APIs.
- Fully installable on Android, iOS, tablets, and desktop browsers.
