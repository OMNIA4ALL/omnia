(function() {
  window.Omnia = window.Omnia || {};
  const storage = window.Omnia.storage || {
    get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch(e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch(e) {} },
    showToast(m) { console.log(m); }
  };
  const api = window.Omnia.api || {};

/**
 * OMNIA 2.0 - Next-Level Universe Explorer & Cosmic Observatory
 * Heliocentric Keplerian Solar System, Planet Observatory, Lunar Shadow Terminator,
 * Real-time International Space Station (ISS) Tracker, and Meteor Shower Radar.
 */
const UniverseModule = {
  canvas: null,
  ctx: null,
  animId: null,
  speed: 1,
  paused: false,
  reverse: false,
  showOrbits: true,
  angle: 0,
  stars: [],
  selectedPlanetIdx: 3, // Default Earth
  issInterval: null,

  planets: [
    { 
      name: 'Sun', color: '#f59e0b', glow: '#fbbf24', radius: 16, dist: 0, speed: 0, 
      diameter: '1,392,700 km', mass: '1.989 × 10³⁰ kg', gravity: '274.0 m/s²', escape: '617.5 km/s', 
      temp: '5,500°C (Surface) • 15M°C (Core)', distSun: '0 AU (Center)', period: 'N/A', moons: 0,
      atmosphere: '73.4% Hydrogen, 25.0% Helium',
      missions: 'Parker Solar Probe, SOHO, Solar Orbiter',
      desc: 'Yellow dwarf star (spectral class G2V). Contains 99.86% of all mass in the Solar System.'
    },
    { 
      name: 'Mercury', color: '#94a3b8', glow: '#cbd5e1', radius: 4.5, dist: 28, speed: 4.15, 
      diameter: '4,879 km', mass: '3.30 × 10²³ kg', gravity: '3.7 m/s²', escape: '4.3 km/s', 
      temp: '-180°C to +430°C', distSun: '0.387 AU (57.9M km)', period: '88 Earth Days', moons: 0,
      atmosphere: 'Trace Oxygen, Sodium, Hydrogen',
      missions: 'Mariner 10, MESSENGER, BepiColombo',
      desc: 'Smallest planet and closest to the Sun. Extreme temperature swings due to zero dense atmosphere.'
    },
    { 
      name: 'Venus', color: '#fb923c', glow: '#fdba74', radius: 6.5, dist: 42, speed: 1.62, 
      diameter: '12,104 km', mass: '4.87 × 10²⁴ kg', gravity: '8.87 m/s²', escape: '10.36 km/s', 
      temp: '464°C (Runaway Greenhouse)', distSun: '0.723 AU (108.2M km)', period: '224.7 Earth Days', moons: 0,
      atmosphere: '96.5% Carbon Dioxide, 3.5% Nitrogen, H₂SO₄ clouds',
      missions: 'Venera 7, Magellan, Akatsuki',
      desc: 'Hottest planet in the solar system. Rotates retrograde (clockwise) with atmospheric pressure 92× Earth.'
    },
    { 
      name: 'Earth', color: '#38bdf8', glow: '#0284c7', radius: 7, dist: 58, speed: 1.0, 
      diameter: '12,742 km', mass: '5.97 × 10²⁴ kg', gravity: '9.807 m/s²', escape: '11.19 km/s', 
      temp: '-89°C to +57°C (Avg 15°C)', distSun: '1.000 AU (149.6M km)', period: '365.25 Days', moons: 1,
      atmosphere: '78.1% Nitrogen, 20.9% Oxygen, 0.9% Argon',
      missions: 'ISS, Hubble, James Webb Space Telescope',
      desc: 'Only known haven for life in the cosmos. Features liquid oceans, protective ozone layer, and active magnetosphere.'
    },
    { 
      name: 'Mars', color: '#ef4444', glow: '#f87171', radius: 5.5, dist: 74, speed: 0.53, 
      diameter: '6,779 km', mass: '6.42 × 10²³ kg', gravity: '3.72 m/s²', escape: '5.03 km/s', 
      temp: '-140°C to +20°C (Avg -63°C)', distSun: '1.524 AU (227.9M km)', period: '687 Earth Days', moons: 2,
      atmosphere: '95.3% Carbon Dioxide, 2.6% Nitrogen, 1.9% Argon',
      missions: 'Curiosity, Perseverance, Mangalyaan (MOM), InSight',
      desc: 'The Red Planet. Home to Olympus Mons (largest volcano, 21.9 km tall) and Valles Marineris canyon.'
    },
    { 
      name: 'Jupiter', color: '#eab308', glow: '#fef08a', radius: 12, dist: 98, speed: 0.084, 
      diameter: '139,820 km', mass: '1.898 × 10²⁷ kg', gravity: '24.79 m/s²', escape: '59.5 km/s', 
      temp: '-108°C (Cloud Tops)', distSun: '5.204 AU (778.5M km)', period: '11.86 Earth Years', moons: 95,
      atmosphere: '89.8% Hydrogen, 10.2% Helium',
      missions: 'Galileo, Juno, Europa Clipper, Juice',
      desc: 'King of planets. Possesses a magnetic field 20,000× stronger than Earth and the centuries-old Great Red Spot storm.'
    },
    { 
      name: 'Saturn', color: '#fef08a', glow: '#fde047', radius: 10, dist: 122, speed: 0.034, 
      diameter: '116,460 km', mass: '5.68 × 10²⁶ kg', gravity: '10.44 m/s²', escape: '35.5 km/s', 
      temp: '-139°C', distSun: '9.582 AU (1.43B km)', period: '29.45 Earth Years', moons: 146,
      atmosphere: '96.3% Hydrogen, 3.25% Helium',
      missions: 'Pioneer 11, Voyager 1 & 2, Cassini-Huygens',
      desc: 'Renowned for its majestic ring system stretching 282,000 km, composed of billions of pure water-ice particles.'
    },
    { 
      name: 'Uranus', color: '#67e8f9', glow: '#a5f3fc', radius: 7.5, dist: 144, speed: 0.012, 
      diameter: '50,724 km', mass: '8.68 × 10²⁵ kg', gravity: '8.69 m/s²', escape: '21.3 km/s', 
      temp: '-195°C (Coldest Planet: -224°C)', distSun: '19.20 AU (2.87B km)', period: '84.0 Earth Years', moons: 28,
      atmosphere: '82.5% Hydrogen, 15.2% Helium, 2.3% Methane',
      missions: 'Voyager 2 (1986 Flyby)',
      desc: 'Ice giant rotating on an extreme 97.77° axial tilt, rolling on its orbital side like a bowling ball.'
    },
    { 
      name: 'Neptune', color: '#3b82f6', glow: '#60a5fa', radius: 7.5, dist: 166, speed: 0.006, 
      diameter: '49,244 km', mass: '1.02 × 10²⁶ kg', gravity: '11.15 m/s²', escape: '23.5 km/s', 
      temp: '-201°C', distSun: '30.05 AU (4.50B km)', period: '164.8 Earth Years', moons: 16,
      atmosphere: '80.0% Hydrogen, 19.0% Helium, 1.5% Methane',
      missions: 'Voyager 2 (1989 Flyby)',
      desc: 'Windiest planet in the solar system, with dark supersonic storms reaching staggering speeds of 2,100 km/h.'
    },
    { 
      name: 'Pluto', color: '#e2e8f0', glow: '#f8fafc', radius: 3.5, dist: 184, speed: 0.004, 
      diameter: '2,376 km', mass: '1.30 × 10²² kg', gravity: '0.62 m/s²', escape: '1.21 km/s', 
      temp: '-230°C', distSun: '39.48 AU (5.91B km)', period: '248.0 Earth Years', moons: 5,
      atmosphere: 'Nitrogen, Methane, Carbon Monoxide',
      missions: 'New Horizons (2015 Flyby)',
      desc: 'Dwarf planet in the Kuiper Belt. Features nitrogen-ice glaciers, cryovolcanoes, and a heart-shaped nitrogen plain (Tombaugh Regio).'
    }
  ],

  init() {
    this.canvas = document.getElementById('universe-solar-canvas');
    if (this.canvas) {
      this.ctx = this.canvas.getContext('2d');
      this.setupCanvas();
      this.initStarfield();
      this.bindEvents();
      this.startLoop();
    }
    this.computeMoonPhase();
    this.renderAstronomicalEvents();
    this.showPlanetDetails(this.planets[this.selectedPlanetIdx]);
    this.startIssTracker();
  },

  setupCanvas() {
    if (!this.canvas) return;
    const rect = this.canvas.parentElement.getBoundingClientRect();
    this.canvas.width = rect.width || 700;
    this.canvas.height = Math.min(460, Math.max(340, this.canvas.width * 0.55));
  },

  initStarfield() {
    this.stars = [];
    const count = 120;
    for (let i = 0; i < count; i++) {
      this.stars.push({
        x: Math.random(),
        y: Math.random(),
        r: Math.random() * 1.5 + 0.3,
        alpha: Math.random() * 0.8 + 0.2,
        twinkleSpeed: Math.random() * 0.02 + 0.005
      });
    }
  },

  bindEvents() {
    const pauseBtn = document.getElementById('univ-pause-btn');
    if (pauseBtn) {
      pauseBtn.addEventListener('click', () => {
        this.paused = !this.paused;
        pauseBtn.innerHTML = this.paused ? '▶ Resume' : '⏸ Pause';
      });
    }

    const reverseBtn = document.getElementById('univ-reverse-btn');
    if (reverseBtn) {
      reverseBtn.addEventListener('click', () => {
        this.reverse = !this.reverse;
        reverseBtn.classList.toggle('text-indigo-400', this.reverse);
        storage.showToast(this.reverse ? 'Time running in reverse' : 'Time running forward', 'info');
      });
    }

    const orbitsBtn = document.getElementById('univ-toggle-orbits');
    if (orbitsBtn) {
      orbitsBtn.addEventListener('click', () => {
        this.showOrbits = !this.showOrbits;
        orbitsBtn.classList.toggle('bg-indigo-600/30', this.showOrbits);
      });
    }

    const speedSelect = document.getElementById('univ-speed-select');
    if (speedSelect) {
      speedSelect.addEventListener('change', (e) => {
        this.speed = parseFloat(e.target.value) || 1;
      });
    }

    // Planet Selector Buttons
    const pillsContainer = document.getElementById('univ-planet-pills');
    if (pillsContainer) {
      pillsContainer.innerHTML = this.planets.map((p, idx) => `
        <button class="univ-planet-btn px-2.5 py-1 text-xs rounded-full border border-white/10 hover:border-indigo-400 text-slate-300 hover:text-white transition flex items-center gap-1.5 ${idx === this.selectedPlanetIdx ? 'bg-indigo-600/30 border-indigo-500/50 text-white font-bold' : ''}" data-idx="${idx}">
          <span class="w-2 h-2 rounded-full" style="background-color: ${p.color}"></span>
          <span>${p.name}</span>
        </button>
      `).join('');

      pillsContainer.querySelectorAll('.univ-planet-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const idx = parseInt(e.currentTarget.getAttribute('data-idx'));
          this.selectedPlanetIdx = idx;
          pillsContainer.querySelectorAll('.univ-planet-btn').forEach(b => {
            b.classList.remove('bg-indigo-600/30', 'border-indigo-500/50', 'text-white', 'font-bold');
          });
          e.currentTarget.classList.add('bg-indigo-600/30', 'border-indigo-500/50', 'text-white', 'font-bold');
          this.showPlanetDetails(this.planets[idx]);
        });
      });
    }

    window.addEventListener('resize', () => {
      this.setupCanvas();
    });
  },

  showPlanetDetails(p) {
    const card = document.getElementById('univ-planet-card');
    if (!card) return;

    card.innerHTML = `
      <div class="glass-card p-5 rounded-2xl border border-white/10 space-y-4">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/5 pb-3">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg" style="background: radial-gradient(circle, ${p.color} 30%, ${p.glow} 90%);">
              <span class="w-4 h-4 rounded-full bg-white/20"></span>
            </div>
            <div>
              <div class="flex items-center gap-2">
                <h3 class="text-lg font-bold text-white">${p.name}</h3>
                <span class="text-xs px-2 py-0.5 rounded-full bg-white/10 text-slate-300 font-mono">${p.distSun}</span>
              </div>
              <p class="text-xs text-slate-400 mt-0.5">${p.desc}</p>
            </div>
          </div>
          <div class="text-right font-mono text-xs text-indigo-400 font-semibold sm:shrink-0">
            Period: ${p.period}
          </div>
        </div>

        <div class="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
          <div class="p-2.5 rounded-xl bg-slate-900/60 border border-white/5"><span class="text-slate-400 text-[11px]">Diameter:</span> <div class="font-bold text-slate-200 mt-0.5">${p.diameter}</div></div>
          <div class="p-2.5 rounded-xl bg-slate-900/60 border border-white/5"><span class="text-slate-400 text-[11px]">Surface Temp:</span> <div class="font-bold text-slate-200 mt-0.5">${p.temp}</div></div>
          <div class="p-2.5 rounded-xl bg-slate-900/60 border border-white/5"><span class="text-slate-400 text-[11px]">Gravity:</span> <div class="font-bold text-slate-200 mt-0.5">${p.gravity}</div></div>
          <div class="p-2.5 rounded-xl bg-slate-900/60 border border-white/5"><span class="text-slate-400 text-[11px]">Escape Velocity:</span> <div class="font-bold text-slate-200 mt-0.5">${p.escape}</div></div>
          <div class="p-2.5 rounded-xl bg-slate-900/60 border border-white/5"><span class="text-slate-400 text-[11px]">Planetary Mass:</span> <div class="font-bold text-slate-200 mt-0.5">${p.mass}</div></div>
          <div class="p-2.5 rounded-xl bg-slate-900/60 border border-white/5"><span class="text-slate-400 text-[11px]">Known Moons:</span> <div class="font-bold text-slate-200 mt-0.5">${p.moons} Moon${p.moons === 1 ? '' : 's'}</div></div>
          <div class="p-2.5 rounded-xl bg-slate-900/60 border border-white/5 sm:col-span-2"><span class="text-slate-400 text-[11px]">Atmosphere:</span> <div class="font-bold text-slate-200 mt-0.5 truncate">${p.atmosphere}</div></div>
        </div>

        <div class="p-3 rounded-xl bg-indigo-950/30 border border-indigo-500/20 text-xs text-indigo-300 flex items-center justify-between">
          <span><strong>Key Exploration Missions:</strong> ${p.missions}</span>
          <span class="text-[10px] text-indigo-400 font-mono">NASA / ESA / ISRO</span>
        </div>
      </div>
    `;
  },

  startLoop() {
    const draw = () => {
      if (!this.paused) {
        const delta = 0.008 * this.speed * (this.reverse ? -1 : 1);
        this.angle += delta;
      }
      this.render();
      this.animId = requestAnimationFrame(draw);
    };
    draw();
  },

  render() {
    const { ctx, canvas } = this;
    if (!ctx || !canvas) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 1. Draw Starfield
    this.stars.forEach(s => {
      s.alpha += Math.sin(Date.now() * s.twinkleSpeed) * 0.005;
      ctx.beginPath();
      ctx.arc(s.x * canvas.width, s.y * canvas.height, s.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${Math.max(0.1, Math.min(0.9, s.alpha))})`;
      ctx.fill();
    });

    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const maxRadius = Math.min(cx, cy) - 25;
    const scale = maxRadius / 195;

    // 2. Draw Sun Corona & Sun
    const sun = this.planets[0];
    const sunR = Math.max(10, sun.radius * scale * 1.1);

    // Radiant Corona
    const grad = ctx.createRadialGradient(cx, cy, sunR * 0.5, cx, cy, sunR * 2.5);
    grad.addColorStop(0, 'rgba(251, 191, 36, 0.9)');
    grad.addColorStop(0.4, 'rgba(245, 158, 11, 0.4)');
    grad.addColorStop(1, 'rgba(245, 158, 11, 0)');
    ctx.beginPath();
    ctx.arc(cx, cy, sunR * 2.5, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();

    // Solid Sun
    ctx.beginPath();
    ctx.arc(cx, cy, sunR, 0, Math.PI * 2);
    ctx.fillStyle = '#f59e0b';
    ctx.fill();

    // 3. Draw Planets & Orbits
    for (let i = 1; i < this.planets.length; i++) {
      const p = this.planets[i];
      const orbitR = p.dist * scale;

      // Orbit Line
      if (this.showOrbits) {
        ctx.beginPath();
        ctx.arc(cx, cy, orbitR, 0, Math.PI * 2);
        ctx.strokeStyle = i === this.selectedPlanetIdx ? 'rgba(99, 102, 241, 0.4)' : 'rgba(255, 255, 255, 0.07)';
        ctx.lineWidth = i === this.selectedPlanetIdx ? 1.5 : 1;
        ctx.stroke();
      }

      // Planet Position
      const curAngle = this.angle * p.speed;
      const px = cx + Math.cos(curAngle) * orbitR;
      const py = cy + Math.sin(curAngle) * orbitR;
      const pR = Math.max(3, p.radius * scale * 0.7);

      // Saturn Rings
      if (p.name === 'Saturn') {
        ctx.beginPath();
        ctx.ellipse(px, py, pR * 2.2, pR * 0.7, 0.4, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(254, 240, 138, 0.65)';
        ctx.lineWidth = 2.5;
        ctx.stroke();
      }

      // Draw Planet Sphere
      ctx.beginPath();
      ctx.arc(px, py, pR, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.glow;
      ctx.shadowBlur = i === this.selectedPlanetIdx ? 12 : 4;
      ctx.fill();
      ctx.shadowBlur = 0;

      // If Earth, draw Moon orbiting Earth!
      if (p.name === 'Earth') {
        const moonDist = pR * 2.4;
        const moonAngle = this.angle * 12;
        const mx = px + Math.cos(moonAngle) * moonDist;
        const my = py + Math.sin(moonAngle) * moonDist;
        ctx.beginPath();
        ctx.arc(mx, my, 1.8, 0, Math.PI * 2);
        ctx.fillStyle = '#e2e8f0';
        ctx.fill();
      }

      // Selection Marker
      if (i === this.selectedPlanetIdx) {
        ctx.beginPath();
        ctx.arc(px, py, pR + 4, 0, Math.PI * 2);
        ctx.strokeStyle = '#818cf8';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
    }
  },

  computeMoonPhase() {
    const now = new Date();
    const knownNewMoon = new Date('2024-01-11T11:57:00Z');
    const synodicDays = 29.53058770576;
    const diffDays = (now.getTime() - knownNewMoon.getTime()) / (1000 * 60 * 60 * 24);
    const cycle = (diffDays % synodicDays + synodicDays) % synodicDays;
    const illumination = Math.round(((1 - Math.cos((cycle / synodicDays) * 2 * Math.PI)) / 2) * 100);

    let phaseName = 'New Moon';
    let phaseIcon = '🌑';
    if (cycle < 1.845) { phaseName = 'New Moon'; phaseIcon = '🌑'; }
    else if (cycle < 7.382) { phaseName = 'Waxing Crescent'; phaseIcon = '🌒'; }
    else if (cycle < 9.228) { phaseName = 'First Quarter'; phaseIcon = '🌓'; }
    else if (cycle < 14.765) { phaseName = 'Waxing Gibbous'; phaseIcon = '🌔'; }
    else if (cycle < 16.611) { phaseName = 'Full Moon'; phaseIcon = '🌕'; }
    else if (cycle < 22.148) { phaseName = 'Waning Gibbous'; phaseIcon = '🌖'; }
    else if (cycle < 23.994) { phaseName = 'Last Quarter'; phaseIcon = '🌗'; }
    else { phaseName = 'Waning Crescent'; phaseIcon = '🌘'; }

    // Days until next full moon
    const daysToFull = (14.765 - cycle + synodicDays) % synodicDays;
    const daysToNew = (synodicDays - cycle) % synodicDays;

    const phaseEl = document.getElementById('univ-moon-phase-name');
    const illEl = document.getElementById('univ-moon-illumination');
    const ageEl = document.getElementById('univ-moon-age');
    const nextEl = document.getElementById('univ-moon-next-milestone');

    if (phaseEl) phaseEl.innerHTML = `<span class="mr-2 text-xl">${phaseIcon}</span> ${phaseName}`;
    if (illEl) illEl.textContent = `${illumination}% Illumination • Synodic Day ${cycle.toFixed(1)} / 29.5d`;
    if (ageEl) ageEl.textContent = `Earth-Moon Distance: ~384,400 km • Perigee/Apogee cycle active`;
    if (nextEl) nextEl.textContent = `Next Full Moon in ${daysToFull.toFixed(1)} days • Next New Moon in ${daysToNew.toFixed(1)} days`;

    // Render interactive Moon Canvas terminator
    this.renderMoonTerminator(cycle / synodicDays);
  },

  renderMoonTerminator(phaseNorm) {
    const canvas = document.getElementById('univ-moon-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;
    const r = w / 2 - 4;
    ctx.clearRect(0, 0, w, h);

    // Draw dark side base
    ctx.beginPath();
    ctx.arc(w / 2, h / 2, r, 0, Math.PI * 2);
    ctx.fillStyle = '#0f172a';
    ctx.fill();

    // Draw lit portion
    ctx.beginPath();
    ctx.arc(w / 2, h / 2, r, -Math.PI / 2, Math.PI / 2, phaseNorm > 0.5);
    ctx.fillStyle = '#f8fafc';
    ctx.fill();

    // Draw crescent ellipse shadow
    const shadowWidth = Math.abs(Math.cos(phaseNorm * 2 * Math.PI)) * r;
    ctx.beginPath();
    ctx.ellipse(w / 2, h / 2, shadowWidth, r, 0, -Math.PI / 2, Math.PI / 2);
    ctx.fillStyle = (phaseNorm < 0.25 || phaseNorm > 0.75) ? '#0f172a' : '#f8fafc';
    ctx.fill();

    // Subtle atmospheric rim
    ctx.beginPath();
    ctx.arc(w / 2, h / 2, r, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  },

  startIssTracker() {
    this.updateIssTelemetry();
    if (this.issInterval) clearInterval(this.issInterval);
    this.issInterval = setInterval(() => {
      this.updateIssTelemetry();
    }, 6000);

    document.getElementById('univ-iss-refresh-btn')?.addEventListener('click', () => {
      this.updateIssTelemetry();
      storage.showToast('Updated ISS telemetry', 'info');
    });
  },

  computeFallbackIss() {
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
      timestamp: Math.round(nowSec)
    };
  },

  async updateIssTelemetry() {
    const latEl = document.getElementById('univ-iss-lat');
    const lonEl = document.getElementById('univ-iss-lon');
    const altEl = document.getElementById('univ-iss-alt');
    const spdEl = document.getElementById('univ-iss-speed');
    const timeEl = document.getElementById('univ-iss-time');
    if (!latEl) return;

    try {
      const data = (api.fetchIssLocation ? await api.fetchIssLocation() : null) || this.computeFallbackIss();
      if (data) {
        latEl.textContent = `${Math.abs(data.latitude)}° ${data.latitude >= 0 ? 'N' : 'S'}`;
        lonEl.textContent = `${Math.abs(data.longitude)}° ${data.longitude >= 0 ? 'E' : 'W'}`;
        if (altEl) altEl.textContent = `${data.altitude} km`;
        if (spdEl) spdEl.textContent = `${data.velocity.toLocaleString()} km/h`;
        if (timeEl) timeEl.textContent = new Date(data.timestamp * 1000).toLocaleTimeString([], { hour12: false });
      }
    } catch (e) {
      const data = this.computeFallbackIss();
      latEl.textContent = `${Math.abs(data.latitude)}° ${data.latitude >= 0 ? 'N' : 'S'}`;
      lonEl.textContent = `${Math.abs(data.longitude)}° ${data.longitude >= 0 ? 'E' : 'W'}`;
      if (altEl) altEl.textContent = `${data.altitude} km`;
      if (spdEl) spdEl.textContent = `${data.velocity.toLocaleString()} km/h`;
      if (timeEl) timeEl.textContent = new Date().toLocaleTimeString([], { hour12: false });
    }
  },

  renderAstronomicalEvents() {
    const list = document.getElementById('univ-events-list');
    if (!list) return;

    const events = [
      { name: 'Quadrantids Meteor Shower', date: 'January 3-4', rate: '120 meteors/hr (ZHR)', comet: 'Asteroid 2003 EH1', desc: 'Produces bright fireballs with exceptionally sharp peak.' },
      { name: 'Lyrids Meteor Shower', date: 'April 21-22', rate: '20 meteors/hr', comet: 'Comet C/1861 G1 Thatcher', desc: 'One of the oldest recorded annual showers, observed for 2,700 years.' },
      { name: 'Perseids Meteor Shower', date: 'August 12-13', rate: '100 meteors/hr (Peak)', comet: 'Comet Swift-Tuttle', desc: 'Warm summer night favorite with fast, bright meteors leaving persistent trails.' },
      { name: "Orionids Meteor Shower", date: "October 21-22", rate: "25 meteors/hr", comet: "1P/Halley (Halley's Comet)", desc: "Debris particles from legendary Halley's Comet striking Earth at 66 km/s." },
      { name: 'Leonids Meteor Shower', date: 'November 17-18', rate: '15 meteors/hr', comet: '55P/Tempel-Tuttle', desc: 'Renowned for producing historic cyclonic meteor storms every 33 years.' },
      { name: 'Geminids Meteor Shower', date: 'December 13-14', rate: '150 meteors/hr (King of Showers)', comet: '3200 Phaethon', desc: 'Richest annual shower with intense multicolored meteors.' }
    ];

    list.innerHTML = events.map(e => `
      <div class="p-3 rounded-xl bg-slate-900/60 border border-white/5 hover:border-white/10 transition space-y-1">
        <div class="flex items-center justify-between">
          <span class="text-xs font-bold text-slate-100">${e.name}</span>
          <span class="text-[11px] font-mono text-indigo-400 font-semibold">${e.date}</span>
        </div>
        <p class="text-[11px] text-slate-400 leading-relaxed">${e.desc}</p>
        <div class="flex items-center justify-between text-[10px] text-slate-500 font-mono pt-0.5">
          <span class="text-emerald-400 font-semibold">${e.rate}</span>
          <span>Source: ${e.comet}</span>
        </div>
      </div>
    `).join('');
  }
};

window.UniverseModule = UniverseModule;

  window.Omnia.universe = UniverseModule;
  window.UniverseModule = UniverseModule;
})();
