/**
 * OMNIA 2.0 — Status, Error, Offline Clarity & Accessibility Polish
 * Namespace: omnia_status_
 * Unobtrusive status pill & drawer showing network state, module offline/online capability,
 * and structured live/cached/sample/loading/unavailable states without background polling.
 */
(function() {
  window.Omnia = window.Omnia || {};
  const storage = window.Omnia.storage || {
    get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  };

  const MODULE_CAPABILITY = {
    'home': { mode: 'hybrid', note: 'Homepage & navigation work offline; live widgets require internet.' },
    'tools': { mode: 'offline', note: 'Available offline — runs locally in your browser.' },
    'file-lab': { mode: 'offline', note: 'Available offline — files stay on your device.' },
    'code-playground': { mode: 'offline', note: 'Available offline — HTML/CSS/JS runs locally.' },
    'workspace': { mode: 'offline', note: 'Available offline — saved in local browser storage.' },
    'device': { mode: 'offline', note: 'Available offline — inspects local browser & hardware APIs.' },
    'studio': { mode: 'offline', note: 'Available offline — canvas & design utilities run locally.' },
    'focus': { mode: 'offline', note: 'Available offline — timers & Web Audio ambient sound run locally.' },
    'privacy': { mode: 'offline', note: 'Available offline — local storage & permissions audit.' },
    'simulation-lab': { mode: 'offline', note: 'Available offline — physics & circuit simulations run locally.' },
    'learn': { mode: 'offline', note: 'Available offline — periodic table, formulas, and calculator run locally.' },
    'document-intelligence': { mode: 'hybrid', note: 'Local file inspection works offline; OCR model download may require internet on first use.' },
    'knowledge-studio': { mode: 'offline', note: 'Available offline — flashcards and quizzes stored locally.' },
    'audio-studio': { mode: 'offline', note: 'Available offline — Web Audio processing runs locally.' },
    'mathematics-lab': { mode: 'offline', note: 'Available offline — 2D/3D plotting and math solvers run locally.' },
    'automation-studio': { mode: 'offline', note: 'Available offline — local workflow builder.' },
    'earth': { mode: 'online', note: 'Requires internet for live weather, earthquakes, and map tiles.' },
    'universe': { mode: 'hybrid', note: 'Orbital & lunar math works offline; live ISS/NASA feeds require internet.' },
    'world': { mode: 'online', note: 'Requires internet for live global intelligence feeds.' },
    'network': { mode: 'online', note: 'Requires internet for DNS, IP, and latency checks.' },
    'news': { mode: 'online', note: 'Requires internet to fetch live RSS/Atom feeds.' },
    'api-explorer': { mode: 'online', note: 'Requires internet to reach external APIs (localhost works locally).' },
    'web-inspector': { mode: 'hybrid', note: 'Pasted HTML inspection works offline; URL fetching requires internet.' },
    'assistant': { mode: 'hybrid', note: 'Local /commands work offline; Cloudflare Workers AI responses require internet and a configured Worker URL.' }
  };

  const STATE_STYLES = {
    live: { label: 'Live Data', cls: 'text-emerald-300 bg-emerald-500/15 border-emerald-500/30' },
    cached: { label: 'Cached Data', cls: 'text-cyan-300 bg-cyan-500/15 border-cyan-500/30' },
    sample: { label: 'Sample / Fallback', cls: 'text-amber-300 bg-amber-500/15 border-amber-500/30' },
    loading: { label: 'Loading...', cls: 'text-indigo-300 bg-indigo-500/15 border-indigo-500/30' },
    unavailable: { label: 'Service Unavailable', cls: 'text-rose-300 bg-rose-500/15 border-rose-500/30' },
    offline: { label: 'Offline', cls: 'text-amber-300 bg-amber-500/15 border-amber-500/30' },
    error: { label: 'Error', cls: 'text-rose-300 bg-rose-500/15 border-rose-500/30' }
  };

  const StatusClarityModule = {
    initialized: false,
    moduleStates: {},

    init() {
      if (this.initialized) return;
      this.initialized = true;
      this.enhanceAccessibility();
      this.injectStatusPill();
      this.injectStatusDrawer();
      this.bindEvents();
      this.render();
    },

    /**
     * Non-invasive accessibility polish on existing header icon buttons.
     */
    enhanceAccessibility() {
      const labelMap = {
        'mobile-menu-btn': 'Toggle navigation menu',
        'header-search-btn': 'Open universal search (Command K)',
        'header-favorites-btn': 'View pinned favorites',
        'header-api-settings-btn': 'Open API settings',
        'header-theme-toggle-btn': 'Toggle dark or light theme'
      };
      Object.entries(labelMap).forEach(([id, label]) => {
        const el = document.getElementById(id);
        if (el && !el.getAttribute('aria-label')) {
          el.setAttribute('aria-label', label);
        }
      });

      // Add a shared polite screen-reader announcer
      if (!document.getElementById('omnia-sr-live')) {
        const live = document.createElement('div');
        live.id = 'omnia-sr-live';
        live.className = 'omnia-sr-only';
        live.setAttribute('aria-live', 'polite');
        live.setAttribute('aria-atomic', 'true');
        document.body.appendChild(live);
      }
    },

    announce(message) {
      const live = document.getElementById('omnia-sr-live');
      if (live) live.textContent = message;
    },

    injectStatusPill() {
      if (document.getElementById('omnia-status-pill')) return;
      const clockEl = document.getElementById('header-clock');
      const parent = clockEl?.parentElement || document.getElementById('header-theme-toggle-btn')?.parentElement;
      if (!parent) return;

      const btn = document.createElement('button');
      btn.id = 'omnia-status-pill';
      btn.type = 'button';
      btn.className = 'omnia-upgrade-btn px-2.5 py-1 rounded-xl text-[11px] font-mono border border-white/10 bg-slate-900/60 text-slate-300 flex items-center gap-1.5 hover:border-indigo-500/50 transition';
      btn.setAttribute('aria-expanded', 'false');
      btn.setAttribute('aria-controls', 'omnia-status-drawer');
      btn.setAttribute('aria-label', 'View network and module status');
      btn.innerHTML = `<span id="omnia-status-dot" class="w-2 h-2 rounded-full bg-emerald-400"></span><span id="omnia-status-label" class="hidden sm:inline">Online</span>`;

      if (clockEl) {
        parent.insertBefore(btn, clockEl);
      } else {
        parent.appendChild(btn);
      }
    },

    injectStatusDrawer() {
      if (document.getElementById('omnia-status-drawer')) return;
      const drawer = document.createElement('div');
      drawer.id = 'omnia-status-drawer';
      drawer.className = 'fixed top-16 right-4 z-40 w-80 max-w-[calc(100vw-2rem)] glass-card rounded-2xl border border-white/15 p-4 shadow-2xl space-y-3 hidden';
      drawer.setAttribute('role', 'region');
      drawer.setAttribute('aria-label', 'OMNIA Status & Offline Clarity');

      drawer.innerHTML = `
        <div class="flex items-center justify-between border-b border-white/10 pb-2">
          <span class="text-xs font-bold text-slate-100">System & Data Status</span>
          <button type="button" id="omnia-status-close" class="text-slate-400 hover:text-white text-xs px-1.5 py-0.5 rounded" aria-label="Close status panel">✕</button>
        </div>
        <div class="space-y-2 text-[11px]">
          <div class="flex items-center justify-between">
            <span class="text-slate-400">Connection</span>
            <span id="omnia-status-conn-badge" class="px-2 py-0.5 rounded-full font-mono text-[10px] border"></span>
          </div>
          <div class="p-2.5 rounded-xl bg-slate-900/70 border border-white/5 space-y-1">
            <div class="flex items-center justify-between">
              <span class="text-slate-400">Active Module</span>
              <span id="omnia-status-mod-cap" class="font-semibold text-indigo-300"></span>
            </div>
            <p id="omnia-status-mod-note" class="text-slate-300 leading-snug"></p>
          </div>
          <div id="omnia-status-events-wrap" class="space-y-1.5 hidden">
            <div class="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Recent Data States</div>
            <div id="omnia-status-events-list" class="space-y-1 max-h-36 overflow-y-auto"></div>
          </div>
        </div>
      `;

      document.body.appendChild(drawer);
    },

    getCurrentSection() {
      const hash = (window.location.hash || '#home').replace(/^#/, '') || 'home';
      return MODULE_CAPABILITY[hash] ? hash : 'home';
    },

    /**
     * Public helper for modules or upgrades to report clear data/service status.
     * @param {string} moduleId
     * @param {'live'|'cached'|'sample'|'loading'|'unavailable'|'offline'|'error'} state
     * @param {string} detail - Non-sensitive human-readable note
     */
    report(moduleId, state, detail = '') {
      const safeState = STATE_STYLES[state] ? state : 'unavailable';
      this.moduleStates[moduleId] = {
        state: safeState,
        detail: String(detail || '').slice(0, 140),
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      this.render();
      if (safeState === 'error' || safeState === 'unavailable' || safeState === 'offline') {
        this.announce(`${moduleId}: ${STATE_STYLES[safeState].label}. ${detail}`);
      }
    },

    render() {
      const online = typeof navigator !== 'undefined' ? navigator.onLine !== false : true;
      const sec = this.getCurrentSection();
      const cap = MODULE_CAPABILITY[sec] || MODULE_CAPABILITY.home;

      const dot = document.getElementById('omnia-status-dot');
      const label = document.getElementById('omnia-status-label');
      const connBadge = document.getElementById('omnia-status-conn-badge');
      const modCap = document.getElementById('omnia-status-mod-cap');
      const modNote = document.getElementById('omnia-status-mod-note');

      if (dot) {
        dot.className = online ? 'w-2 h-2 rounded-full bg-emerald-400' : 'w-2 h-2 rounded-full bg-amber-400';
      }
      if (label) {
        label.textContent = online ? 'Online' : 'Offline';
      }
      if (connBadge) {
        connBadge.textContent = online ? 'Online' : 'Offline Mode';
        connBadge.className = online
          ? 'px-2 py-0.5 rounded-full font-mono text-[10px] border text-emerald-300 bg-emerald-500/15 border-emerald-500/30'
          : 'px-2 py-0.5 rounded-full font-mono text-[10px] border text-amber-300 bg-amber-500/15 border-amber-500/30';
      }
      if (modCap) {
        modCap.textContent = cap.mode === 'offline' ? 'Offline Ready' : cap.mode === 'online' ? 'Needs Internet' : 'Hybrid (Partial Offline)';
      }
      if (modNote) {
        if (!online && cap.mode === 'online') {
          modNote.textContent = `You are currently offline. ${cap.note}`;
        } else {
          modNote.textContent = cap.note;
        }
      }

      const entries = Object.entries(this.moduleStates);
      const wrap = document.getElementById('omnia-status-events-wrap');
      const list = document.getElementById('omnia-status-events-list');
      if (wrap && list) {
        if (entries.length === 0) {
          wrap.classList.add('hidden');
        } else {
          wrap.classList.remove('hidden');
          list.innerHTML = '';
          entries.slice(-5).reverse().forEach(([mod, info]) => {
            const meta = STATE_STYLES[info.state] || STATE_STYLES.unavailable;
            const row = document.createElement('div');
            row.className = 'p-2 rounded-lg bg-slate-900/60 border border-white/5 space-y-0.5';
            const top = document.createElement('div');
            top.className = 'flex items-center justify-between gap-2';
            const modSpan = document.createElement('span');
            modSpan.className = 'font-medium text-slate-200';
            modSpan.textContent = mod;
            const stSpan = document.createElement('span');
            stSpan.className = `px-1.5 py-0.5 rounded text-[9px] font-mono border ${meta.cls}`;
            stSpan.textContent = meta.label;
            top.appendChild(modSpan);
            top.appendChild(stSpan);
            row.appendChild(top);
            if (info.detail) {
              const det = document.createElement('div');
              det.className = 'text-[10px] text-slate-400';
              det.textContent = `${info.detail} (${info.time})`;
              row.appendChild(det);
            }
            list.appendChild(row);
          });
        }
      }
    },

    bindEvents() {
      const pill = document.getElementById('omnia-status-pill');
      const drawer = document.getElementById('omnia-status-drawer');
      const closeBtn = document.getElementById('omnia-status-close');

      const toggleDrawer = (forceClose = false) => {
        if (!drawer || !pill) return;
        const willOpen = !forceClose && drawer.classList.contains('hidden');
        drawer.classList.toggle('hidden', !willOpen);
        pill.setAttribute('aria-expanded', willOpen ? 'true' : 'false');
        if (willOpen) this.render();
      };

      pill?.addEventListener('click', () => toggleDrawer(false));
      closeBtn?.addEventListener('click', () => {
        toggleDrawer(true);
        pill?.focus();
      });

      window.addEventListener('online', () => {
        this.render();
        this.announce('Internet connection restored.');
      });
      window.addEventListener('offline', () => {
        this.render();
        this.announce('You are offline. Client-side OMNIA tools remain available.');
      });
      window.addEventListener('hashchange', () => this.render());

      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && drawer && !drawer.classList.contains('hidden')) {
          toggleDrawer(true);
          pill?.focus();
        }
      });
    }
  };

  window.Omnia.status = StatusClarityModule;
})();
