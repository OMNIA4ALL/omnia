(function() {
  window.Omnia = window.Omnia || {};
  const storage = window.Omnia.storage || {
    get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch(e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch(e) {} },
    showToast(m) { console.log(m); }
  };
  const api = window.Omnia.api || {};

/**
 * OMNIA 2.0 - Life Dashboard Engine
 * 15 customizable widgets with drag/toggle/reorder & LocalStorage persistence
 */

const DashboardModule = {
  defaultWidgets: [
    { id: 'w-clock', name: 'Digital Clock & Date', visible: true, order: 1 },
    { id: 'w-weather', name: 'Local Weather & AQI', visible: true, order: 2 },
    { id: 'w-quick-tools', name: 'Quick Tools & Recents', visible: true, order: 3 },
    { id: 'w-notes-summary', name: 'Workspace Notes & Tasks', visible: true, order: 4 },
    { id: 'w-focus-status', name: 'Focus & Pomodoro Timer', visible: true, order: 5 },
    { id: 'w-system-health', name: 'System & Connectivity', visible: true, order: 6 },
    { id: 'w-world-clocks', name: 'Global Clocks', visible: true, order: 7 },
    { id: 'w-astronomy', name: 'Solar & Lunar Status', visible: true, order: 8 }
  ],

  config: null,

  init() {
    this.loadConfig();
    this.renderCustomizer();
    this.bindEvents();
    this.updateWidgets();
    // Periodic refresh
    setInterval(() => this.updateTimeWidgets(), 1000);
  },

  loadConfig() {
    try {
      const stored = localStorage.getItem('omnia_dashboard_config');
      if (stored) {
        this.config = JSON.parse(stored);
      } else {
        this.config = JSON.parse(JSON.stringify(this.defaultWidgets));
      }
    } catch (e) {
      this.config = JSON.parse(JSON.stringify(this.defaultWidgets));
    }
  },

  saveConfig() {
    try {
      localStorage.setItem('omnia_dashboard_config', JSON.stringify(this.config));
      if (window.StorageModule) storage.showToast('Dashboard layout saved');
    } catch (e) {
      console.error(e);
    }
  },

  resetConfig() {
    this.config = JSON.parse(JSON.stringify(this.defaultWidgets));
    this.saveConfig();
    this.renderCustomizer();
    this.applyVisibility();
  },

  renderCustomizer() {
    const list = document.getElementById('dashboard-widget-toggle-list');
    if (!list) return;
    list.innerHTML = this.config.map(w => `
      <label class="flex items-center justify-between p-2 rounded bg-white/5 hover:bg-white/10 cursor-pointer text-sm">
        <span class="text-slate-300 font-medium">${w.name}</span>
        <input type="checkbox" data-widget-id="${w.id}" ${w.visible ? 'checked' : ''} class="dashboard-toggle-cb rounded border-slate-700 text-indigo-600 focus:ring-0">
      </label>
    `).join('');

    list.querySelectorAll('.dashboard-toggle-cb').forEach(cb => {
      cb.addEventListener('change', (e) => {
        const id = e.target.getAttribute('data-widget-id');
        const widget = this.config.find(x => x.id === id);
        if (widget) {
          widget.visible = e.target.checked;
          this.saveConfig();
          this.applyVisibility();
        }
      });
    });

    this.applyVisibility();
  },

  applyVisibility() {
    this.config.forEach(w => {
      const el = document.getElementById(w.id);
      if (el) {
        el.style.display = w.visible ? '' : 'none';
      }
    });
  },

  bindEvents() {
    const resetBtn = document.getElementById('dashboard-reset-btn');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => this.resetConfig());
    }
    const customizeBtn = document.getElementById('dashboard-customize-btn');
    const modal = document.getElementById('dashboard-customize-modal');
    const closeModal = document.getElementById('dashboard-modal-close');
    if (customizeBtn && modal) {
      customizeBtn.addEventListener('click', () => modal.classList.remove('hidden'));
    }
    if (closeModal && modal) {
      closeModal.addEventListener('click', () => modal.classList.add('hidden'));
    }
  },

  updateTimeWidgets() {
    const now = new Date();
    // Clock widget
    const timeEl = document.getElementById('dash-clock-time');
    const dateEl = document.getElementById('dash-clock-date');
    if (timeEl) {
      timeEl.textContent = now.toLocaleTimeString([], { hour12: false });
    }
    if (dateEl) {
      dateEl.textContent = now.toLocaleDateString([], { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    }

    // World clocks
    const worldContainer = document.getElementById('dash-world-clocks-container');
    if (worldContainer && !worldContainer.dataset.rendered) {
      this.renderWorldClocks();
      worldContainer.dataset.rendered = 'true';
    }
  },

  renderWorldClocks() {
    const cities = [
      { name: 'Tokyo', tz: 'Asia/Tokyo' },
      { name: 'London', tz: 'Europe/London' },
      { name: 'New York', tz: 'America/New_York' },
      { name: 'Sydney', tz: 'Australia/Sydney' }
    ];
    const container = document.getElementById('dash-world-clocks-container');
    if (!container) return;
    const now = new Date();
    container.innerHTML = cities.map(c => {
      const timeStr = now.toLocaleTimeString('en-US', { timeZone: c.tz, hour: '2-digit', minute: '2-digit', hour12: false });
      return `
        <div class="p-2.5 rounded-lg bg-white/5 border border-white/5 flex items-center justify-between">
          <span class="text-xs text-slate-400 font-medium">${c.name}</span>
          <span class="text-sm font-mono font-bold text-indigo-300">${timeStr}</span>
        </div>
      `;
    }).join('');
  },

  async updateWidgets() {
    this.updateTimeWidgets();
    // Battery & connection
    this.updateSystemDiagnostics();
    // Notes & tasks count
    this.updateWorkspaceSummary();
    // Weather summary
    this.updateWeatherSummary();
  },

  async updateSystemDiagnostics() {
    // Online status
    const netEl = document.getElementById('dash-net-status');
    if (netEl) {
      const isOnline = navigator.onLine;
      netEl.innerHTML = isOnline 
        ? `<span class="inline-flex items-center text-emerald-400 font-medium"><span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse mr-1.5"></span>Online (${navigator.connection?.effectiveType || 'Active'})</span>`
        : `<span class="inline-flex items-center text-amber-400 font-medium"><span class="w-2 h-2 rounded-full bg-amber-400 mr-1.5"></span>Offline Mode</span>`;
    }

    // Battery
    const batEl = document.getElementById('dash-battery-status');
    if (batEl) {
      if (navigator.getBattery) {
        try {
          const bat = await navigator.getBattery();
          const pct = Math.round(bat.level * 100);
          batEl.textContent = `${pct}% ${bat.charging ? '⚡ (Charging)' : ''}`;
        } catch (e) {
          batEl.textContent = 'Battery API restricted';
        }
      } else {
        batEl.textContent = 'Not exposed by browser';
      }
    }

    // Device summary
    const devEl = document.getElementById('dash-device-summary');
    if (devEl) {
      const cores = navigator.hardwareConcurrency ? `${navigator.hardwareConcurrency} Cores` : '';
      const mem = navigator.deviceMemory ? `${navigator.deviceMemory} GB RAM` : '';
      const platform = navigator.platform || 'Desktop';
      devEl.textContent = [platform, cores, mem].filter(Boolean).join(' • ');
    }
  },

  updateWorkspaceSummary() {
    try {
      const notes = JSON.parse(localStorage.getItem('omnia_notes') || '[]');
      const tasks = JSON.parse(localStorage.getItem('omnia_tasks') || '[]');
      const notesEl = document.getElementById('dash-notes-count');
      const tasksEl = document.getElementById('dash-tasks-count');
      if (notesEl) notesEl.textContent = `${notes.length} note${notes.length === 1 ? '' : 's'}`;
      if (tasksEl) {
        const pending = tasks.filter(t => !t.completed).length;
        tasksEl.textContent = `${pending} pending task${pending === 1 ? '' : 's'}`;
      }
    } catch (e) {}
  },

  async updateWeatherSummary() {
    const tempEl = document.getElementById('dash-weather-temp');
    const descEl = document.getElementById('dash-weather-desc');
    const aqiEl = document.getElementById('dash-weather-aqi');
    if (!tempEl) return;

    try {
      // Default to New Delhi coordinates or user geolocated coords
      const lat = localStorage.getItem('omnia_lat') || 28.6139;
      const lon = localStorage.getItem('omnia_lon') || 77.2090;
      const cityName = localStorage.getItem('omnia_city') || 'New Delhi';
      
      const weather = await api.getWeather(lat, lon);
      if (weather && weather.current) {
        tempEl.textContent = `${Math.round(weather.current.temperature_2m)}°C`;
        const code = weather.current.weather_code;
        descEl.textContent = `${cityName} • Humidity ${weather.current.relative_humidity_2m}%`;
      }

      const aqi = await api.getAirQuality(lat, lon);
      if (aqi && aqi.current && aqiEl) {
        const val = aqi.current.us_aqi || aqi.current.european_aqi || '--';
        aqiEl.textContent = `AQI: ${val}`;
      }
    } catch (e) {
      if (tempEl) tempEl.textContent = 'Weather Unavailable';
      if (descEl) descEl.textContent = 'Check internet connection';
    }
  }
};

window.DashboardModule = DashboardModule;


  window.Omnia.dashboard = DashboardModule;
  window.DashboardModule = DashboardModule;
})();
