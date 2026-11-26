/**
 * OMNIA Navigation & Shell Module
 * Manages section routing, theme switching, command palette (⌘K), digital clocks,
 * API settings modal, and daily dynamic discovery.
 */
(function() {
  window.Omnia = window.Omnia || {};
  const storage = window.Omnia.storage;
  const api = window.Omnia.api;

  const sections = ['home', 'tools', 'earth', 'network', 'learn', 'device', 'studio', 'focus', 'file-lab', 'code-playground', 'universe', 'simulation-lab', 'world', 'workspace', 'privacy', 'assistant', 'news', 'document-intelligence', 'api-explorer', 'knowledge-studio', 'audio-studio', 'mathematics-lab', 'automation-studio', 'web-inspector'];
  let currentSection = 'home';
  let activeTool = 'qr';

  let favorites = storage.get('omnia_favs', ['qr', 'json', 'password', 'color']);
  let recents = storage.get('omnia_recents', ['qr', 'json']);
  let theme = storage.get('omnia_theme', 'dark');

  const TOOL_NAMES = {
    qr: 'QR Code Generator',
    word: 'Word Counter',
    char: 'Character Counter',
    json: 'JSON Formatter',
    base64: 'Base64 Encoder',
    unit: 'Unit Converter',
    color: 'Color Converter',
    password: 'Password Checker',
    percentage: 'Percentage Calculator',
    age: 'Age Calculator'
  };

  const COMMAND_ITEMS = [
    { title: 'File Lab (Image & PDF Tools)', cat: 'Utilities', section: 'file-lab', desc: 'In-browser compression, conversion & hashing' },
    { title: 'Code Playground (HTML/CSS/JS Sandbox)', cat: 'Utilities', section: 'code-playground', desc: 'Live execution, download & developer tools' },
    { title: 'Universe Explorer (Solar System & Planets)', cat: 'Science', section: 'universe', desc: 'Planetary orbits, Moon phases & ephemeris' },
    { title: 'Simulation Lab (Physics Experiments)', cat: 'Science', section: 'simulation-lab', desc: '14 interactive physics simulations & formulas' },
    { title: 'World Intelligence (Currencies & Clocks)', cat: 'Reference', section: 'world', desc: 'Frankfurter live rates & REST Countries' },
    { title: 'Workspace (Notes, Tasks & Bookmarks)', cat: 'Productivity', section: 'workspace', desc: 'Private client-side productivity manager' },
    { title: 'Privacy Centre (Browser Diagnostics)', cat: 'Security', section: 'privacy', desc: 'HTTPS status, cookies, permissions audit' },
    { title: 'OMNIA Intelligence (Natural Language)', cat: 'Assistant', section: 'assistant', desc: 'Unified command interface & module router' },
    { title: 'News Intelligence (Global RSS Feeds)', cat: 'News', section: 'news', desc: 'Curated and custom RSS/Atom feed aggregator' },
    { title: 'Document Intelligence (OCR Text Extraction)', cat: 'Documents', section: 'document-intelligence', desc: 'In-browser OCR, image preprocessing & text export' },
    { title: 'API Explorer (Developer HTTP Client)', cat: 'Developer', section: 'api-explorer', desc: 'Test REST APIs, custom headers, params, and JSON viewer' },
    { title: 'Knowledge Studio (Spaced Repetition & Quizzes)', cat: 'Education', section: 'knowledge-studio', desc: 'SM-2 flashcards, 3D flip review & topic mastery' },
    { title: 'Audio Studio (Waveform & Spectrum Analysis)', cat: 'Audio', section: 'audio-studio', desc: 'Web Audio analysis, trimming, WAV export & normalizer' },
    { title: 'Mathematics Lab (2D/3D Graphing & Calculus)', cat: 'Mathematics', section: 'mathematics-lab', desc: 'Safe expression plotting, derivatives, integrals & matrices' },
    { title: 'Automation Studio (Visual Node Workflows)', cat: 'Automation', section: 'automation-studio', desc: 'Visual data-flow builder, node execution & presets' },
    { title: 'Web Inspector (Accessibility & Quality Audit)', cat: 'Web', section: 'web-inspector', desc: 'WCAG compliance auditor, heading structure & remediation' },

    { title: 'Configure API Keys & Credentials', cat: 'Settings', action: 'api_modal', desc: 'Central configuration for OpenWeatherMap, NASA, IPinfo' },
    { title: 'QR Code Generator', cat: 'Tools', section: 'tools', tool: 'qr', desc: 'Generate QR codes and download PNG' },
    { title: 'Word Counter', cat: 'Tools', section: 'tools', tool: 'word', desc: 'Words, reading time & paragraph statistics' },
    { title: 'Character Counter', cat: 'Tools', section: 'tools', tool: 'char', desc: 'Letter, vowel, and consonant breakdown' },
    { title: 'JSON Formatter & Validator', cat: 'Tools', section: 'tools', tool: 'json', desc: 'Prettify, minify, and inspect JSON syntax' },
    { title: 'Base64 Encoder & Decoder', cat: 'Tools', section: 'tools', tool: 'base64', desc: 'Two-way string to Base64 conversion' },
    { title: 'Unit Converter', cat: 'Tools', section: 'tools', tool: 'unit', desc: 'Convert Length, Mass, Temp, Speed, Area, Data' },
    { title: 'Color Converter', cat: 'Tools', section: 'tools', tool: 'color', desc: 'HEX, RGB, HSL, HSV, CMYK conversions' },
    { title: 'Password Strength & Generator', cat: 'Tools', section: 'tools', tool: 'password', desc: 'Entropy analysis and password generator' },
    { title: 'Percentage Calculator', cat: 'Tools', section: 'tools', tool: 'percentage', desc: 'Percentage of, change, and discounts' },
    { title: 'Age Calculator', cat: 'Tools', section: 'tools', tool: 'age', desc: 'Exact chronological age and birthday milestones' },
    { title: 'Earth & Weather Dashboard', cat: 'Earth', section: 'earth', desc: 'Open-Meteo weather and solar ephemeris' },
    { title: 'Planetary Global Clocks', cat: 'Earth', section: 'earth', desc: 'Synchronized worldwide time zones' },
    { title: 'Public IP Telemetry', cat: 'Network', section: 'network', desc: 'Browser public IP and ISP check' },
    { title: 'Internet Speed Test', cat: 'Network', section: 'network', desc: 'Latency and bandwidth measurement' },
    { title: 'DNS Lookup Resolver', cat: 'Network', section: 'network', desc: 'A, AAAA, MX, TXT record resolution' },
    { title: 'Global Ping Latency', cat: 'Network', section: 'network', desc: 'Ping Cloudflare, Google, AWS, Fastly' },
    { title: 'Scientific Calculator', cat: 'Learn', section: 'learn', desc: 'Trigonometry, logarithms, and powers' },
    { title: 'Periodic Table of Elements', cat: 'Learn', section: 'learn', desc: 'Interactive 118 chemical elements grid' },
    { title: 'Physics & Math Solvers', cat: 'Learn', section: 'learn', desc: 'Quadratic equation, Ohm law, kinetic energy' },
    { title: 'Device Inspector & Specs', cat: 'Device', section: 'device', desc: 'Hardware, screen resolution, GPU WebGL' },
    { title: 'Color Palette Studio', cat: 'Studio', section: 'studio', desc: 'Harmonious color palettes and export' },
    { title: 'CSS Gradient Generator', cat: 'Studio', section: 'studio', desc: 'Multi-stop gradient builder with code' },
    { title: 'WCAG Contrast Checker', cat: 'Studio', section: 'studio', desc: 'Accessibility AA and AAA compliance test' },
    { title: 'Glassmorphism Generator', cat: 'Studio', section: 'studio', desc: 'Backdrop blur and glass card CSS' },
    { title: 'Pomodoro Timer', cat: 'Focus', section: 'focus', desc: 'Work and break intervals with sound chimes' },
    { title: 'Web Audio Ambient Synthesizer', cat: 'Focus', section: 'focus', desc: 'Rain, ocean waves, white noise, binaural 432Hz' },
    { title: 'Zen Focus Fullscreen', cat: 'Focus', section: 'focus', desc: 'Minimalist clock with breathing exercise' },
    { title: 'Toggle Dark / Light Theme', cat: 'Action', action: 'theme', desc: 'Switch appearance theme' }
  ];

  const navigation = {
    init() {
      this.applyTheme(theme);
      this.bindEvents();
      this.initHistory();
      this.renderFavorites();
      this.renderRecents();
      this.initClocks();
      this.initDailyDiscovery();
      this.initApiModal();

      // Read initial hash or default to home without creating an extra history step
      const initialHash = window.location.hash.replace(/^#/, '');
      if (initialHash) {
        const parts = initialHash.split('/');
        const targetSec = sections.includes(parts[0]) ? parts[0] : 'home';
        window.history.replaceState({ section: targetSec, tool: parts[1] || null }, '', '#' + initialHash);
        this.navigateTo(targetSec, parts[1] || null, false);
      } else {
        window.history.replaceState({ section: 'home', tool: null }, '', '#home');
        this.navigateTo('home', null, false);
      }
    },

    /**
     * Integrates browser PopState history so tapping Back goes back ONE step
     * (e.g. closing an open modal or returning from a section to the previous page)
     * instead of closing or leaving the whole site.
     */
    initHistory() {
      window.addEventListener('popstate', (event) => {
        // 1. If any modal or overlay is currently open, close it first
        const cmdModal = document.getElementById('cmd-palette-modal');
        const apiModal = document.getElementById('api-settings-modal');
        const elemModal = document.getElementById('element-modal');
        const zenOverlay = document.getElementById('zen-overlay');
        const mobileDrawer = document.getElementById('mobile-drawer');

        let modalClosed = false;
        if (cmdModal && !cmdModal.classList.contains('hidden')) { cmdModal.classList.add('hidden'); modalClosed = true; }
        if (apiModal && !apiModal.classList.contains('hidden')) { apiModal.classList.add('hidden'); modalClosed = true; }
        if (elemModal && !elemModal.classList.contains('hidden')) { elemModal.classList.add('hidden'); modalClosed = true; }
        if (zenOverlay && !zenOverlay.classList.contains('hidden')) { zenOverlay.classList.add('hidden'); modalClosed = true; }
        if (mobileDrawer && !mobileDrawer.classList.contains('hidden')) { mobileDrawer.classList.add('hidden'); modalClosed = true; }

        if (modalClosed) {
          // A modal was dismissed by the back action; do not navigate sections
          return;
        }

        // 2. Otherwise navigate to the previous section in history
        if (event.state && event.state.section) {
          this.navigateTo(event.state.section, event.state.tool || null, false);
        } else {
          const hash = window.location.hash.replace(/^#/, '');
          if (hash) {
            const parts = hash.split('/');
            this.navigateTo(parts[0], parts[1] || null, false);
          } else {
            this.navigateTo('home', null, false);
          }
        }
      });
    },

    navigateTo(secId, toolSub = null, pushHistory = true) {
      if (!sections.includes(secId)) secId = 'home';
      const prevSection = currentSection;
      currentSection = secId;

      // Update Section Visibility
      sections.forEach(s => {
        const el = document.getElementById(`sec-${s}`);
        if (el) el.classList.toggle('hidden', s !== secId);
      });

      // Update Desktop Nav Active States
      document.querySelectorAll('#desktop-nav-list .nav-item').forEach(btn => {
        const matches = btn.getAttribute('data-nav') === secId;
        btn.classList.toggle('active', matches);
        btn.classList.toggle('text-indigo-400', matches);
        btn.classList.toggle('bg-indigo-500/10', matches);
        btn.classList.toggle('text-slate-400', !matches);
      });

      // Update Header Breadcrumb
      const bc = document.getElementById('breadcrumb-current');
      if (bc) {
        const names = {
          home: 'Home', tools: 'Tools', earth: 'Earth', network: 'Network',
          learn: 'Learn', device: 'Device', studio: 'Studio', focus: 'Focus',
          'file-lab': 'File Lab', 'code-playground': 'Code Playground',
          universe: 'Universe', 'simulation-lab': 'Simulation Lab',
          world: 'World', workspace: 'Workspace', privacy: 'Privacy',
          assistant: 'OMNIA Intelligence',
          news: 'News Intelligence',
          'document-intelligence': 'Document Intelligence',
          'api-explorer': 'API Explorer',
          'knowledge-studio': 'Knowledge Studio',
          'audio-studio': 'Audio Studio',
          'mathematics-lab': 'Mathematics Lab',
          'automation-studio': 'Automation Studio',
          'web-inspector': 'Web Inspector'
        };
        bc.textContent = names[secId] || secId;
      }

      // Switch to subtool if specified
      if (secId === 'earth') {
        if (window.Omnia.earth && window.Omnia.earth.onSectionOpened) {
          window.Omnia.earth.onSectionOpened();
        }
      }

      if (secId === 'tools' && toolSub) {
        if (window.Omnia.tools && window.Omnia.tools.switchTool) {
          window.Omnia.tools.switchTool(toolSub);
        }
      }

      // Close mobile drawer
      const drawer = document.getElementById('mobile-drawer');
      if (drawer) drawer.classList.add('hidden');

      // Browser History API (pushState) for single-step Back navigation
      if (pushHistory) {
        const targetHash = '#' + secId + (toolSub ? `/${toolSub}` : '');
        if (window.location.hash !== targetHash) {
          window.history.pushState({ section: secId, tool: toolSub }, '', targetHash);
        }
      }

      window.scrollTo({ top: 0, behavior: 'smooth' });
    },

    applyTheme(t) {
      theme = t;
      storage.set('omnia_theme', t);
      const root = document.documentElement;
      const iconSidebar = document.getElementById('theme-icon-sidebar');
      const iconHeader = document.getElementById('theme-icon-header');

      const sunSvg = '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>';
      const moonSvg = '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>';

      if (t === 'light') {
        root.classList.remove('dark');
        root.classList.add('light');
        if (iconSidebar) iconSidebar.innerHTML = sunSvg;
        if (iconHeader) iconHeader.innerHTML = sunSvg;
      } else {
        root.classList.remove('light');
        root.classList.add('dark');
        if (iconSidebar) iconSidebar.innerHTML = moonSvg;
        if (iconHeader) iconHeader.innerHTML = moonSvg;
      }
    },

    toggleTheme() {
      const nextTheme = theme === 'dark' ? 'light' : 'dark';
      this.applyTheme(nextTheme);
      storage.showToast(`Switched to ${nextTheme} theme`);
    },

    toggleFavorite(toolId) {
      if (favorites.includes(toolId)) {
        favorites = favorites.filter(id => id !== toolId);
        storage.showToast('Removed from favorites');
      } else {
        favorites.push(toolId);
        storage.showToast('Added to favorites', 'success');
      }
      storage.set('omnia_favs', favorites);
      this.renderFavorites();
      this.updateToolFavButton();
    },

    recordRecent(toolId) {
      recents = [toolId, ...recents.filter(x => x !== toolId)].slice(0, 6);
      storage.set('omnia_recents', recents);
      this.renderRecents();
    },

    renderFavorites() {
      const shelf = document.getElementById('favorites-shelf-list');
      const badge = document.getElementById('favorites-badge');
      const headerCount = document.getElementById('header-fav-count');
      if (!shelf) return;

      if (headerCount) headerCount.textContent = favorites.length;
      if (badge) badge.textContent = `${favorites.length} saved`;

      if (favorites.length === 0) {
        shelf.innerHTML = '<p class="text-xs text-slate-400 italic py-2">No tools favorited yet. Star any utility to pin it here.</p>';
        return;
      }

      shelf.innerHTML = '';
      favorites.forEach(id => {
        const item = document.createElement('div');
        item.className = 'flex items-center justify-between p-2 rounded-xl bg-slate-900/60 border border-white/5 hover:border-indigo-500/30 transition cursor-pointer';
        item.innerHTML = `
          <div class="flex items-center gap-2.5">
            <span class="w-2 h-2 rounded-full bg-amber-400"></span>
            <span class="text-xs font-medium text-slate-200">${TOOL_NAMES[id] || id}</span>
          </div>
          <button class="text-slate-400 hover:text-white text-xs px-2 py-0.5 rounded bg-slate-800">Launch →</button>
        `;
        item.addEventListener('click', () => {
          this.navigateTo('tools', id);
        });
        shelf.appendChild(item);
      });
    },

    renderRecents() {
      const shelf = document.getElementById('recents-shelf-list');
      if (!shelf) return;

      if (recents.length === 0) {
        shelf.innerHTML = '<p class="text-xs text-slate-400 italic py-2">Your recently opened utilities will be recorded here.</p>';
        return;
      }

      shelf.innerHTML = '';
      recents.forEach(id => {
        const item = document.createElement('div');
        item.className = 'flex items-center justify-between p-2 rounded-xl bg-slate-900/60 border border-white/5 hover:border-indigo-500/30 transition cursor-pointer';
        item.innerHTML = `
          <div class="flex items-center gap-2.5">
            <span class="w-2 h-2 rounded-full bg-indigo-400"></span>
            <span class="text-xs font-medium text-slate-200">${TOOL_NAMES[id] || id}</span>
          </div>
          <span class="text-[10px] text-slate-500 font-mono">Recent</span>
        `;
        item.addEventListener('click', () => {
          this.navigateTo('tools', id);
        });
        shelf.appendChild(item);
      });
    },

    updateToolFavButton() {
      const btn = document.getElementById('toggle-active-tool-favorite-btn');
      const star = document.getElementById('tool-fav-star-icon');
      const label = document.getElementById('tool-fav-label');
      if (!btn || !star || !label) return;

      const isFav = favorites.includes(activeTool);
      if (isFav) {
        star.classList.add('fill-amber-400', 'text-amber-400');
        star.classList.remove('text-slate-400');
        label.textContent = 'Favorited';
      } else {
        star.classList.remove('fill-amber-400', 'text-amber-400');
        star.classList.add('text-slate-400');
        label.textContent = 'Favorite';
      }
    },

    setActiveTool(toolId) {
      activeTool = toolId;
      this.updateToolFavButton();
      this.recordRecent(toolId);
    },

    getActiveTool() {
      return activeTool;
    },

    initClocks() {
      const update = () => {
        const now = new Date();
        const timeStr = now.toTimeString().split(' ')[0];
        const hClock = document.getElementById('header-clock');
        const zClock = document.getElementById('zen-clock');
        if (hClock) hClock.textContent = timeStr;
        if (zClock) zClock.textContent = timeStr;
      };
      update();
      setInterval(update, 1000);
    },

    initDailyDiscovery() {
      const discCard = document.querySelector('#sec-home .glass-card:last-of-type');
      if (!discCard) return;

      // 1. Calculate Day of Year to rotate through verified scientific elements
      const now = new Date();
      const start = new Date(now.getFullYear(), 0, 0);
      const dayOfYear = Math.floor((now.getTime() - start.getTime()) / 86400000);

      const titleEl = discCard.querySelector('h3');
      const descEl = discCard.querySelector('p');
      const badgeEl = discCard.querySelector('.text-indigo-400');

      // Check if NASA APOD is available
      api.fetchDailyDiscovery()
        .then(nasa => {
          if (nasa && nasa.title) {
            if (badgeEl) badgeEl.textContent = 'NASA Daily Cosmic Discovery';
            if (titleEl) titleEl.textContent = nasa.title;
            if (descEl) descEl.textContent = nasa.explanation ? `${nasa.explanation.slice(0, 180)}...` : '';
          }
        })
        .catch(() => {});
    },

    // ==========================================
    // API CONFIGURATION MODAL
    // ==========================================
    initApiModal() {
      const modal = document.getElementById('api-settings-modal');
      const openHeaderBtn = document.getElementById('header-api-settings-btn');
      const openSidebarBtn = document.getElementById('sidebar-api-settings-btn');
      const closeBtn1 = document.getElementById('close-api-modal-btn');
      const closeBtn2 = document.getElementById('close-api-modal-btn-2');
      const saveBtn = document.getElementById('save-api-keys-btn');
      const resetBtn = document.getElementById('reset-api-keys-btn');

      const openModal = () => {
        if (!modal) return;
        const keys = api.config.keys;
        const owIn = document.getElementById('key-openweathermap');
        const nasaIn = document.getElementById('key-nasa');
        const ipIn = document.getElementById('key-ipinfo');

        if (owIn) owIn.value = keys.openWeatherMap || '';
        if (nasaIn) nasaIn.value = keys.nasaApod || 'DEMO_KEY';
        if (ipIn) ipIn.value = keys.ipinfo || '';

        modal.classList.remove('hidden');
        window.history.pushState({ modal: 'api-settings', section: currentSection, tool: activeTool }, '', window.location.hash);
      };

      const closeModal = () => {
        if (modal) modal.classList.add('hidden');
      };

      openHeaderBtn?.addEventListener('click', openModal);
      openSidebarBtn?.addEventListener('click', openModal);
      closeBtn1?.addEventListener('click', closeModal);
      closeBtn2?.addEventListener('click', closeModal);

      saveBtn?.addEventListener('click', () => {
        const owIn = document.getElementById('key-openweathermap');
        const nasaIn = document.getElementById('key-nasa');
        const ipIn = document.getElementById('key-ipinfo');

        const newKeys = {
          openWeatherMap: owIn ? owIn.value.trim() : '',
          nasaApod: nasaIn ? (nasaIn.value.trim() || 'DEMO_KEY') : 'DEMO_KEY',
          ipinfo: ipIn ? ipIn.value.trim() : ''
        };

        api.saveKeys(newKeys);
        closeModal();
        storage.showToast('API Credentials saved successfully', 'success');

        // Immediately refresh earth and network with new credentials if applicable
        if (window.Omnia.network) window.Omnia.network.loadPublicIp();
        if (window.Omnia.earth) window.Omnia.earth.updateCity(window.Omnia.earth.currentCityKey || 'london');
      });

      resetBtn?.addEventListener('click', () => {
        api.resetKeys();
        const owIn = document.getElementById('key-openweathermap');
        const nasaIn = document.getElementById('key-nasa');
        const ipIn = document.getElementById('key-ipinfo');
        if (owIn) owIn.value = '';
        if (nasaIn) nasaIn.value = 'DEMO_KEY';
        if (ipIn) ipIn.value = '';
        storage.showToast('Reset to default free public endpoints', 'info');
      });

      modal?.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
      });

      this.openApiModal = openModal;
    },

    openCommandPalette() {
      const modal = document.getElementById('cmd-palette-modal');
      const input = document.getElementById('cmd-palette-input');
      if (!modal || !input) return;
      modal.classList.remove('hidden');
      window.history.pushState({ modal: 'cmd-palette', section: currentSection, tool: activeTool }, '', window.location.hash);
      input.value = '';
      input.focus();
      this.renderCommandResults('');
    },

    closeCommandPalette() {
      const modal = document.getElementById('cmd-palette-modal');
      if (modal) modal.classList.add('hidden');
    },

    renderCommandResults(query) {
      const resultsEl = document.getElementById('cmd-palette-results');
      if (!resultsEl) return;
      const q = query.toLowerCase().trim();

      const filtered = COMMAND_ITEMS.filter(it => 
        it.title.toLowerCase().includes(q) ||
        it.cat.toLowerCase().includes(q) ||
        it.desc.toLowerCase().includes(q)
      );

      resultsEl.innerHTML = '';
      if (filtered.length === 0) {
        resultsEl.innerHTML = '<div class="p-6 text-center text-xs text-slate-500">No matching commands or utilities found.</div>';
        return;
      }

      filtered.forEach((it, idx) => {
        const card = document.createElement('div');
        card.className = `p-3 rounded-xl flex items-center justify-between cursor-pointer transition ${idx === 0 ? 'bg-indigo-600/20 text-white border border-indigo-500/30' : 'hover:bg-slate-800/60 text-slate-300'}`;
        card.innerHTML = `
          <div>
            <div class="text-xs font-semibold">${it.title}</div>
            <div class="text-[11px] text-slate-400 mt-0.5">${it.desc}</div>
          </div>
          <span class="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-indigo-300 font-mono">${it.cat}</span>
        `;
        card.addEventListener('click', () => {
          this.closeCommandPalette();
          if (it.action === 'theme') {
            this.toggleTheme();
          } else if (it.action === 'api_modal') {
            if (this.openApiModal) this.openApiModal();
          } else if (it.section) {
            this.navigateTo(it.section, it.tool);
          }
        });
        resultsEl.appendChild(card);
      });
    },

    bindEvents() {
      document.querySelectorAll('[data-nav]').forEach(el => {
        el.addEventListener('click', () => {
          this.navigateTo(el.getAttribute('data-nav'));
        });
      });

      document.getElementById('nav-brand-home')?.addEventListener('click', () => this.navigateTo('home'));

      document.getElementById('sidebar-theme-toggle-btn')?.addEventListener('click', () => this.toggleTheme());
      document.getElementById('header-theme-toggle-btn')?.addEventListener('click', () => this.toggleTheme());

      const mobileBtn = document.getElementById('mobile-menu-btn');
      const mobileDrawer = document.getElementById('mobile-drawer');
      const closeMobileBtn = document.getElementById('close-mobile-drawer-btn');
      if (mobileBtn && mobileDrawer) {
        mobileBtn.addEventListener('click', () => { mobileDrawer.classList.remove('hidden'); try { window.history.pushState({ modal: 'mobile-drawer' }, '', window.location.hash); } catch(err){} });
        closeMobileBtn?.addEventListener('click', () => mobileDrawer.classList.add('hidden'));
      }

      document.getElementById('sidebar-search-btn')?.addEventListener('click', () => this.openCommandPalette());
      document.getElementById('header-search-btn')?.addEventListener('click', () => this.openCommandPalette());
      document.getElementById('trigger-cmd-card')?.addEventListener('click', () => this.openCommandPalette());

      const heroInput = document.getElementById('hero-search-input');
      const heroBtn = document.getElementById('hero-search-launch-btn');
      heroBtn?.addEventListener('click', () => {
        const val = heroInput ? heroInput.value : '';
        this.openCommandPalette();
        const cmdIn = document.getElementById('cmd-palette-input');
        if (cmdIn) {
          cmdIn.value = val;
          this.renderCommandResults(val);
        }
      });

      const cmdInput = document.getElementById('cmd-palette-input');
      cmdInput?.addEventListener('input', (e) => {
        this.renderCommandResults(e.target.value);
      });

      document.querySelectorAll('.quick-pill').forEach(pill => {
        pill.addEventListener('click', () => {
          const target = pill.getAttribute('data-target');
          if (['qr', 'json'].includes(target)) {
            this.navigateTo('tools', target);
          } else {
            this.navigateTo(target);
          }
        });
      });

      document.getElementById('toggle-active-tool-favorite-btn')?.addEventListener('click', () => {
        this.toggleFavorite(activeTool);
      });

      document.getElementById('daily-discovery-jump-btn')?.addEventListener('click', () => {
        this.navigateTo('learn');
        const tab = document.querySelector('[data-learntab="periodic"]');
        if (tab) tab.click();
      });

      window.addEventListener('keydown', (e) => {
        if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
          e.preventDefault();
          const modal = document.getElementById('cmd-palette-modal');
          if (modal && modal.classList.contains('hidden')) {
            this.openCommandPalette();
          } else {
            this.closeCommandPalette();
          }
        }
        if (e.key === 'Escape') {
          this.closeCommandPalette();
          document.getElementById('element-modal')?.classList.add('hidden');
          document.getElementById('zen-overlay')?.classList.add('hidden');
          document.getElementById('api-settings-modal')?.classList.add('hidden');
        }
      });

      const cmdModal = document.getElementById('cmd-palette-modal');
      cmdModal?.addEventListener('click', (e) => {
        if (e.target === cmdModal) this.closeCommandPalette();
      });
    }
  };

  window.Omnia.navigation = navigation;
})();
