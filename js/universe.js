(function() {
  window.Omnia = window.Omnia || {};
  const storage = window.Omnia.storage || {
    get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch(e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch(e) {} },
    showToast(m) { console.log(m); }
  };
  const api = window.Omnia.api || {};

/**
 * OMNIA 2.0 - Universe Explorer Module
 * Interactive Solar System visualization, Moon phase ephemeris, and Astronomical Events
 */

const UniverseModule = {
  canvas: null,
  ctx: null,
  animId: null,
  speed: 1,
  paused: false,
  angle: 0,

  planets: [
    { name: 'Sun', color: '#fbbf24', radius: 14, dist: 0, speed: 0, desc: 'G-type main-sequence star containing 99.86% of the solar system mass.', diameter: '1,392,700 km', temp: '5,500°C (Surface)', gravity: '274 m/s²' },
    { name: 'Mercury', color: '#94a3b8', radius: 4, dist: 28, speed: 4.1, desc: 'Smallest planet with extreme temperature variations from -180°C to 430°C.', diameter: '4,879 km', temp: '167°C avg', gravity: '3.7 m/s²' },
    { name: 'Venus', color: '#f59e0b', radius: 6, dist: 42, speed: 1.6, desc: 'Hottest planet shrouded in reflective sulphuric acid clouds.', diameter: '12,104 km', temp: '464°C avg', gravity: '8.87 m/s²' },
    { name: 'Earth', color: '#38bdf8', radius: 7, dist: 58, speed: 1.0, desc: 'Only known astronomical object known to harbor life.', diameter: '12,742 km', temp: '15°C avg', gravity: '9.807 m/s²' },
    { name: 'Mars', color: '#ef4444', radius: 5, dist: 74, speed: 0.53, desc: 'The Red Planet, home to Olympus Mons, the largest volcano in the solar system.', diameter: '6,779 km', temp: '-63°C avg', gravity: '3.72 m/s²' },
    { name: 'Jupiter', color: '#fb923c', radius: 11, dist: 96, speed: 0.084, desc: 'Gas giant with a Great Red Spot storm larger than Earth.', diameter: '139,820 km', temp: '-108°C', gravity: '24.79 m/s²' },
    { name: 'Saturn', color: '#fef08a', radius: 9, dist: 120, speed: 0.034, desc: 'Renowned for its majestic planetary ring system composed of water ice.', diameter: '116,460 km', temp: '-139°C', gravity: '10.44 m/s²' },
    { name: 'Uranus', color: '#67e8f9', radius: 7, dist: 142, speed: 0.012, desc: 'Ice giant rotating on an extreme 97.77-degree axial tilt.', diameter: '50,724 km', temp: '-195°C', gravity: '8.69 m/s²' },
    { name: 'Neptune', color: '#3b82f6', radius: 7, dist: 165, speed: 0.006, desc: 'Distant ice giant with supersonic winds reaching 2,100 km/h.', diameter: '49,244 km', temp: '-201°C', gravity: '11.15 m/s²' }
  ],

  init() {
    this.canvas = document.getElementById('universe-solar-canvas');
    if (this.canvas) {
      this.ctx = this.canvas.getContext('2d');
      this.setupCanvas();
      this.bindEvents();
      this.startLoop();
    }
    this.computeMoonPhase();
    this.renderAstronomicalEvents();
  },

  setupCanvas() {
    const rect = this.canvas.parentElement.getBoundingClientRect();
    this.canvas.width = rect.width || 600;
    this.canvas.height = Math.min(420, this.canvas.width * 0.7);
  },

  bindEvents() {
    const pauseBtn = document.getElementById('univ-pause-btn');
    if (pauseBtn) {
      pauseBtn.addEventListener('click', () => {
        this.paused = !this.paused;
        pauseBtn.textContent = this.paused ? '▶ Resume' : '⏸ Pause';
      });
    }

    const speedSelect = document.getElementById('univ-speed-select');
    if (speedSelect) {
      speedSelect.addEventListener('change', (e) => {
        this.speed = parseFloat(e.target.value) || 1;
      });
    }

    // Planet selector buttons
    const selectorContainer = document.getElementById('univ-planet-pills');
    if (selectorContainer) {
      selectorContainer.innerHTML = this.planets.map((p, idx) => `
        <button class="px-2.5 py-1 text-xs rounded-full border border-white/10 hover:border-indigo-400 text-slate-300 hover:text-white transition" data-idx="${idx}">
          ${p.name}
        </button>
      `).join('');

      selectorContainer.querySelectorAll('button').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const idx = parseInt(e.currentTarget.getAttribute('data-idx'));
          this.showPlanetDetails(this.planets[idx]);
        });
      });
    }

    window.addEventListener('resize', () => {
      if (this.canvas) this.setupCanvas();
    });
  },

  showPlanetDetails(planet) {
    const card = document.getElementById('univ-planet-card');
    if (!card) return;
    card.innerHTML = `
      <div class="p-4 rounded-xl bg-white/5 border border-white/10">
        <div class="flex items-center justify-between mb-2">
          <h3 class="text-lg font-bold text-white flex items-center gap-2">
            <span class="w-3.5 h-3.5 rounded-full inline-block" style="background-color: ${planet.color}"></span>
            ${planet.name}
          </h3>
          <span class="text-xs text-indigo-400 font-mono">${planet.diameter}</span>
        </div>
        <p class="text-xs text-slate-300 mb-3">${planet.desc}</p>
        <div class="grid grid-cols-2 gap-2 text-xs">
          <div class="bg-black/30 p-2 rounded"><span class="text-slate-400">Surface Temp:</span> <strong class="text-slate-200">${planet.temp}</strong></div>
          <div class="bg-black/30 p-2 rounded"><span class="text-slate-400">Gravity:</span> <strong class="text-slate-200">${planet.gravity}</strong></div>
        </div>
      </div>
    `;
  },

  startLoop() {
    const draw = () => {
      if (!this.paused) {
        this.angle += 0.01 * this.speed;
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

    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const maxRadius = Math.min(cx, cy) - 20;
    const scale = maxRadius / 175;

    // Draw Orbits & Planets
    this.planets.forEach((p) => {
      if (p.dist === 0) {
        // Sun
        ctx.beginPath();
        ctx.arc(cx, cy, p.radius * scale * 0.9, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 15;
        ctx.fill();
        ctx.shadowBlur = 0;
      } else {
        const orbitR = p.dist * scale;
        // Orbit line
        ctx.beginPath();
        ctx.arc(cx, cy, orbitR, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.07)';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Planet position
        const currentAngle = this.angle * p.speed;
        const px = cx + Math.cos(currentAngle) * orbitR;
        const py = cy + Math.sin(currentAngle) * orbitR;

        // Draw Saturn Rings
        if (p.name === 'Saturn') {
          ctx.beginPath();
          ctx.ellipse(px, py, p.radius * scale * 1.8, p.radius * scale * 0.6, 0.4, 0, Math.PI * 2);
          ctx.strokeStyle = 'rgba(254, 240, 138, 0.6)';
          ctx.lineWidth = 2;
          ctx.stroke();
        }

        ctx.beginPath();
        ctx.arc(px, py, Math.max(3, p.radius * scale * 0.6), 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.fill();
      }
    });
  },

  computeMoonPhase() {
    // Current synodic month cycle approximation
    const now = new Date();
    const knownNewMoon = new Date('2024-01-11T11:57:00Z');
    const synodicDays = 29.53058770576;
    const diffDays = (now - knownNewMoon) / (1000 * 60 * 60 * 24);
    const cycle = (diffDays % synodicDays + synodicDays) % synodicDays;
    const illumination = Math.round(((1 - Math.cos((cycle / synodicDays) * 2 * Math.PI)) / 2) * 100);

    let phaseName = 'New Moon';
    if (cycle < 1.845) phaseName = 'New Moon';
    else if (cycle < 7.382) phaseName = 'Waxing Crescent';
    else if (cycle < 9.228) phaseName = 'First Quarter';
    else if (cycle < 14.765) phaseName = 'Waxing Gibbous';
    else if (cycle < 16.611) phaseName = 'Full Moon';
    else if (cycle < 22.148) phaseName = 'Waning Gibbous';
    else if (cycle < 23.994) phaseName = 'Last Quarter';
    else phaseName = 'Waning Crescent';

    const phaseEl = document.getElementById('univ-moon-phase-name');
    const illEl = document.getElementById('univ-moon-illumination');
    const ageEl = document.getElementById('univ-moon-age');

    if (phaseEl) phaseEl.textContent = phaseName;
    if (illEl) illEl.textContent = `${illumination}% Illumination`;
    if (ageEl) ageEl.textContent = `Day ${cycle.toFixed(1)} of 29.5d Cycle`;
  },

  renderAstronomicalEvents() {
    const list = document.getElementById('univ-events-list');
    if (!list) return;
    const events = [
      { name: 'Perseids Meteor Shower', date: 'August 12-13', rate: 'Up to 100 meteors/hr', desc: 'Debris from Comet Swift-Tuttle creates one of the brightest annual showers.' },
      { name: 'Geminids Meteor Shower', date: 'December 13-14', rate: 'Up to 120 meteors/hr', desc: 'Caused by asteroid 3200 Phaethon with multicolored fireballs.' },
      { name: 'Solar Eclipse Window', date: 'Spring / Autumn Equinox Cycles', rate: 'Planetary alignment', desc: 'Predictable syzygy configurations between Sun, Moon and Earth orbital nodes.' },
      { name: 'Jupiter Opposition', date: 'Annual Peak Visibility', rate: 'Magnitude -2.9', desc: 'Jupiter makes its closest approach to Earth, appearing exceptionally bright all night.' }
    ];

    list.innerHTML = events.map(e => `
      <div class="p-3 rounded-lg bg-white/5 border border-white/5 hover:border-white/10 transition">
        <div class="flex items-center justify-between mb-1">
          <span class="text-sm font-semibold text-slate-200">${e.name}</span>
          <span class="text-xs font-mono text-indigo-400">${e.date}</span>
        </div>
        <p class="text-xs text-slate-400">${e.desc}</p>
        <span class="inline-block mt-1 text-[11px] text-emerald-400 font-mono">${e.rate}</span>
      </div>
    `).join('');
  }
};

window.UniverseModule = UniverseModule;


  window.Omnia.universe = UniverseModule;
  window.UniverseModule = UniverseModule;
})();
