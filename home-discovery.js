/**
 * OMNIA 2.0 — Homepage Module Discovery & Safe Customization
 * Namespace: omnia_home_customization_
 * Strictly additive: preserves global search, command palette, pinned favorites, and default layout.
 */
(function() {
  window.Omnia = window.Omnia || {};
  const storage = window.Omnia.storage || {
    get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
    showToast(m) { console.log(m); }
  };

  const PREFS_KEY = 'omnia_home_customization_v1';

  const CATEGORY_MAP = {
    'tools': 'Productivity & Tools',
    'file-lab': 'Productivity & Tools',
    'workspace': 'Productivity & Tools',
    'focus': 'Productivity & Tools',
    'privacy': 'Productivity & Tools',
    'earth': 'Science & Space',
    'universe': 'Science & Space',
    'simulation-lab': 'Science & Space',
    'learn': 'Science & Space',
    'mathematics-lab': 'Science & Space',
    'code-playground': 'Developer & Web',
    'network': 'Developer & Web',
    'device': 'Developer & Web',
    'api-explorer': 'Developer & Web',
    'web-inspector': 'Developer & Web',
    'world': 'Data & Knowledge',
    'news': 'Data & Knowledge',
    'document-intelligence': 'Data & Knowledge',
    'knowledge-studio': 'Data & Knowledge',
    'studio': 'Media & Design',
    'audio-studio': 'Media & Design',
    'assistant': 'AI & Automation',
    'automation-studio': 'AI & Automation'
  };

  const CATEGORIES = [
    'All',
    'Productivity & Tools',
    'Science & Space',
    'Developer & Web',
    'Data & Knowledge',
    'Media & Design',
    'AI & Automation'
  ];

  const escapeHtml = (str) => {
    if (typeof str !== 'string') return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  };

  const HomeDiscoveryModule = {
    initialized: false,
    gridEl: null,
    defaultOrder: [],
    activeCategory: 'All',
    filterText: '',
    prefs: {
      compact: false,
      hidden: [],
      order: []
    },

    init() {
      if (this.initialized) return;
      const homeSec = document.getElementById('sec-home');
      if (!homeSec) return;

      const firstCard = homeSec.querySelector('.cat-card[data-nav]');
      if (!firstCard || !firstCard.parentElement) return;
      this.gridEl = firstCard.parentElement;

      const cards = Array.from(this.gridEl.querySelectorAll(':scope > .cat-card[data-nav]'));
      if (cards.length === 0) return;

      this.initialized = true;
      this.defaultOrder = cards.map(c => c.getAttribute('data-nav'));

      // Make module cards keyboard-accessible without changing existing click behavior
      cards.forEach(card => {
        const nav = card.getAttribute('data-nav');
        const title = card.querySelector('h3')?.textContent?.trim() || nav;
        if (!card.hasAttribute('tabindex')) card.setAttribute('tabindex', '0');
        if (!card.hasAttribute('role')) card.setAttribute('role', 'button');
        if (!card.hasAttribute('aria-label')) card.setAttribute('aria-label', `Open ${title}`);
        card.dataset.omniaCategory = CATEGORY_MAP[nav] || 'Productivity & Tools';
        card.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            card.click();
          }
        });
      });

      this.loadPrefs();
      this.injectToolbar();
      this.applyAll();
    },

    loadPrefs() {
      const saved = storage.get(PREFS_KEY, null);
      if (saved && typeof saved === 'object') {
        this.prefs.compact = !!saved.compact;
        this.prefs.hidden = Array.isArray(saved.hidden) ? saved.hidden : [];
        this.prefs.order = Array.isArray(saved.order) ? saved.order : [];
      }
    },

    savePrefs() {
      storage.set(PREFS_KEY, this.prefs);
    },

    injectToolbar() {
      if (document.getElementById('omnia-discovery-toolbar') || !this.gridEl) return;

      const toolbar = document.createElement('div');
      toolbar.id = 'omnia-discovery-toolbar';
      toolbar.className = 'omnia-discovery-bar rounded-2xl p-3 space-y-3';

      const pillsHtml = CATEGORIES.map(cat => {
        const active = cat === 'All';
        return `<button type="button" class="omnia-filter-pill px-2.5 py-1 rounded-xl text-[11px] font-medium border border-white/10 text-slate-300 hover:text-white hover:border-indigo-500/40" data-cat="${escapeHtml(cat)}" aria-pressed="${active ? 'true' : 'false'}">${escapeHtml(cat)}</button>`;
      }).join('');

      toolbar.innerHTML = `
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-2.5">
          <div class="flex flex-wrap items-center gap-1.5" role="group" aria-label="Filter modules by category">
            ${pillsHtml}
          </div>
          <div class="flex flex-wrap items-center gap-2 shrink-0">
            <label for="omnia-home-filter-input" class="omnia-sr-only">Filter homepage modules</label>
            <input id="omnia-home-filter-input" type="search" placeholder="Filter cards..." class="px-3 py-1.5 rounded-xl bg-slate-900/80 border border-white/10 text-xs text-slate-100 placeholder-slate-400 focus:outline-none focus:border-indigo-500 w-36 sm:w-44">
            <button type="button" id="omnia-home-compact-btn" class="omnia-upgrade-btn px-2.5 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-[11px] font-medium border border-white/10" aria-pressed="false" title="Toggle compact card view">Compact</button>
            <button type="button" id="omnia-home-customize-btn" class="omnia-upgrade-btn px-2.5 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-[11px] font-medium border border-white/10" aria-expanded="false" aria-controls="omnia-home-customize-panel">Customize</button>
          </div>
        </div>

        <div id="omnia-home-customize-panel" class="hidden pt-3 border-t border-white/10 space-y-3">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <p class="text-[11px] text-slate-400">Show/hide modules on the homepage or reorder them with accessible Move Up / Move Down buttons. Hidden modules remain accessible via navigation and global search.</p>
            <button type="button" id="omnia-home-reset-btn" class="px-3 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-[11px] font-semibold">Reset to Default</button>
          </div>
          <div id="omnia-home-customize-list" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-64 overflow-y-auto pr-1"></div>
        </div>

        <div id="omnia-home-filter-status" class="text-[11px] text-slate-400 hidden" aria-live="polite"></div>
      `;

      this.gridEl.parentElement.insertBefore(toolbar, this.gridEl);
      this.bindToolbarEvents();
    },

    bindToolbarEvents() {
      const toolbar = document.getElementById('omnia-discovery-toolbar');
      if (!toolbar) return;

      toolbar.querySelectorAll('.omnia-filter-pill').forEach(pill => {
        pill.addEventListener('click', () => {
          this.activeCategory = pill.getAttribute('data-cat') || 'All';
          toolbar.querySelectorAll('.omnia-filter-pill').forEach(p => {
            p.setAttribute('aria-pressed', p === pill ? 'true' : 'false');
          });
          this.applyFilters();
        });
      });

      const filterInput = document.getElementById('omnia-home-filter-input');
      filterInput?.addEventListener('input', () => {
        this.filterText = (filterInput.value || '').trim().toLowerCase();
        this.applyFilters();
      });

      const compactBtn = document.getElementById('omnia-home-compact-btn');
      compactBtn?.addEventListener('click', () => {
        this.prefs.compact = !this.prefs.compact;
        this.savePrefs();
        this.applyCompact();
      });

      const customizeBtn = document.getElementById('omnia-home-customize-btn');
      const customizePanel = document.getElementById('omnia-home-customize-panel');
      customizeBtn?.addEventListener('click', () => {
        const isHidden = customizePanel?.classList.contains('hidden');
        if (isHidden) {
          customizePanel.classList.remove('hidden');
          customizeBtn.setAttribute('aria-expanded', 'true');
          this.renderCustomizeList();
        } else {
          customizePanel?.classList.add('hidden');
          customizeBtn.setAttribute('aria-expanded', 'false');
        }
      });

      document.getElementById('omnia-home-reset-btn')?.addEventListener('click', () => {
        this.prefs = { compact: false, hidden: [], order: [] };
        this.activeCategory = 'All';
        this.filterText = '';
        if (filterInput) filterInput.value = '';
        toolbar.querySelectorAll('.omnia-filter-pill').forEach(p => {
          p.setAttribute('aria-pressed', p.getAttribute('data-cat') === 'All' ? 'true' : 'false');
        });
        this.savePrefs();
        this.applyAll();
        this.renderCustomizeList();
        storage.showToast('Homepage layout reset to default.', 'info');
      });
    },

    getEffectiveOrder() {
      const base = this.prefs.order.length > 0
        ? this.prefs.order.filter(id => this.defaultOrder.includes(id))
        : [];
      const missing = this.defaultOrder.filter(id => !base.includes(id));
      return [...base, ...missing];
    },

    applyOrder() {
      if (!this.gridEl) return;
      const order = this.getEffectiveOrder();
      const map = new Map();
      Array.from(this.gridEl.querySelectorAll(':scope > .cat-card[data-nav]')).forEach(el => {
        map.set(el.getAttribute('data-nav'), el);
      });
      order.forEach(nav => {
        const el = map.get(nav);
        if (el) this.gridEl.appendChild(el);
      });
    },

    applyCompact() {
      if (!this.gridEl) return;
      this.gridEl.classList.toggle('omnia-cards-compact', !!this.prefs.compact);
      const btn = document.getElementById('omnia-home-compact-btn');
      if (btn) {
        btn.setAttribute('aria-pressed', this.prefs.compact ? 'true' : 'false');
        btn.classList.toggle('bg-indigo-600', !!this.prefs.compact);
        btn.classList.toggle('text-white', !!this.prefs.compact);
      }
    },

    applyFilters() {
      if (!this.gridEl) return;
      const cards = Array.from(this.gridEl.querySelectorAll(':scope > .cat-card[data-nav]'));
      let visibleCount = 0;

      cards.forEach(card => {
        const nav = card.getAttribute('data-nav');
        const isHiddenByUser = this.prefs.hidden.includes(nav);
        card.classList.toggle('omnia-card-hidden-by-user', isHiddenByUser);

        const cat = card.dataset.omniaCategory || '';
        const text = (card.textContent || '').toLowerCase();
        const catMatch = this.activeCategory === 'All' || cat === this.activeCategory;
        const textMatch = !this.filterText || text.includes(this.filterText) || nav.includes(this.filterText);
        const hiddenByFilter = !(catMatch && textMatch);
        card.classList.toggle('omnia-card-hidden-by-filter', hiddenByFilter);

        if (!isHiddenByUser && !hiddenByFilter) visibleCount++;
      });

      const statusEl = document.getElementById('omnia-home-filter-status');
      if (statusEl) {
        const isFiltered = this.activeCategory !== 'All' || this.filterText.length > 0 || this.prefs.hidden.length > 0;
        if (isFiltered) {
          statusEl.textContent = `Showing ${visibleCount} of ${cards.length} ecosystem modules${this.prefs.hidden.length > 0 ? ` (${this.prefs.hidden.length} hidden in Customize)` : ''}.`;
          statusEl.classList.remove('hidden');
        } else {
          statusEl.textContent = '';
          statusEl.classList.add('hidden');
        }
      }
    },

    applyAll() {
      this.applyOrder();
      this.applyCompact();
      this.applyFilters();
    },

    renderCustomizeList() {
      const listEl = document.getElementById('omnia-home-customize-list');
      if (!listEl || !this.gridEl) return;

      const order = this.getEffectiveOrder();
      const titleMap = new Map();
      this.gridEl.querySelectorAll(':scope > .cat-card[data-nav]').forEach(c => {
        const nav = c.getAttribute('data-nav');
        titleMap.set(nav, c.querySelector('h3')?.textContent?.trim() || nav);
      });

      listEl.innerHTML = order.map((nav, idx) => {
        const title = titleMap.get(nav) || nav;
        const visible = !this.prefs.hidden.includes(nav);
        return `
          <div class="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-xl bg-slate-900/70 border border-white/5 text-xs">
            <label class="flex items-center gap-2 cursor-pointer truncate flex-1">
              <input type="checkbox" class="omnia-cust-vis rounded border-slate-700 text-indigo-600 focus:ring-0" data-nav="${escapeHtml(nav)}" ${visible ? 'checked' : ''}>
              <span class="text-slate-200 truncate">${escapeHtml(title)}</span>
            </label>
            <div class="flex items-center gap-1 shrink-0">
              <button type="button" class="omnia-cust-up px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px]" data-nav="${escapeHtml(nav)}" ${idx === 0 ? 'disabled opacity-40' : ''} aria-label="Move ${escapeHtml(title)} up">↑</button>
              <button type="button" class="omnia-cust-down px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px]" data-nav="${escapeHtml(nav)}" ${idx === order.length - 1 ? 'disabled opacity-40' : ''} aria-label="Move ${escapeHtml(title)} down">↓</button>
            </div>
          </div>
        `;
      }).join('');

      listEl.querySelectorAll('.omnia-cust-vis').forEach(cb => {
        cb.addEventListener('change', () => {
          const nav = cb.getAttribute('data-nav');
          if (cb.checked) {
            this.prefs.hidden = this.prefs.hidden.filter(h => h !== nav);
          } else if (!this.prefs.hidden.includes(nav)) {
            this.prefs.hidden.push(nav);
          }
          this.savePrefs();
          this.applyFilters();
        });
      });

      listEl.querySelectorAll('.omnia-cust-up').forEach(btn => {
        btn.addEventListener('click', () => this.moveCard(btn.getAttribute('data-nav'), -1));
      });

      listEl.querySelectorAll('.omnia-cust-down').forEach(btn => {
        btn.addEventListener('click', () => this.moveCard(btn.getAttribute('data-nav'), 1));
      });
    },

    moveCard(nav, delta) {
      const order = this.getEffectiveOrder();
      const idx = order.indexOf(nav);
      const target = idx + delta;
      if (idx === -1 || target < 0 || target >= order.length) return;
      [order[idx], order[target]] = [order[target], order[idx]];
      this.prefs.order = order;
      this.savePrefs();
      this.applyOrder();
      this.renderCustomizeList();
    }
  };

  window.Omnia.homeDiscovery = HomeDiscoveryModule;
})();
