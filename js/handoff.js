/**
 * OMNIA 2.0 — Optional Module-to-Module Data Handoff Service
 * Namespace: omnia_handoff_
 * Strictly isolated & optional: reads/writes compatible DOM fields only upon explicit user action.
 * Never alters existing module logic, never sends user data to external services, and asks before overwriting.
 */
(function() {
  window.Omnia = window.Omnia || {};
  const storage = window.Omnia.storage || {
    get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
    showToast(m) { console.log(m); }
  };

  const HISTORY_KEY = 'omnia_handoff_history';
  const LARGE_PREVIEW_THRESHOLD = 1500;
  const SENSITIVE_PATTERN = /(AIza[0-9A-Za-z\-_]{20,}|sk-[a-zA-Z0-9]{20,}|Bearer\s+[A-Za-z0-9._\-]{10,}|-----BEGIN\s+(?:RSA\s+)?PRIVATE\s+KEY-----|password\s*[:=]\s*\S+)/i;

  const escapeHtml = (str) => {
    if (typeof str !== 'string') return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  };

  const SOURCES = [
    {
      id: 'doc-ocr',
      label: 'Document Intelligence (OCR Output)',
      section: 'document-intelligence',
      mime: 'text/plain',
      read() {
        const el = document.getElementById('doc-extracted-textarea');
        return el ? (el.value || '').trim() : '';
      }
    },
    {
      id: 'json-formatter',
      label: 'Browser Tools (JSON Formatter)',
      section: 'tools',
      mime: 'application/json',
      read() {
        const el = document.getElementById('json-textarea');
        return el ? (el.value || '').trim() : '';
      }
    },
    {
      id: 'api-response',
      label: 'API Explorer (Response Body)',
      section: 'api-explorer',
      mime: 'application/json',
      read() {
        const el = document.getElementById('api-view-json');
        return el ? (el.textContent || '').trim() : '';
      }
    },
    {
      id: 'math-results',
      label: 'Mathematics Lab (Computed Results)',
      section: 'mathematics-lab',
      mime: 'text/plain',
      read() {
        const ids = [
          ['Derivative', 'math-deriv-result'],
          ['Integral', 'math-int-result'],
          ['Root Finder', 'math-root-result'],
          ['Complex Calc', 'math-complex-result'],
          ['Vector Calc', 'math-vector-result'],
          ['Matrix Calc', 'math-matrix-result']
        ];
        const lines = [];
        ids.forEach(([label, id]) => {
          const el = document.getElementById(id);
          const val = el ? (el.textContent || '').trim() : '';
          if (val && val !== '—' && val !== '-' && !val.toLowerCase().includes('result will appear')) {
            lines.push(`${label}: ${val}`);
          }
        });
        return lines.join('\n');
      }
    },
    {
      id: 'knowledge-active',
      label: 'Knowledge Studio (Active Card / Deck)',
      section: 'knowledge-studio',
      mime: 'text/markdown',
      read() {
        const title = document.getElementById('know-active-deck-title')?.textContent?.trim() || '';
        const front = document.getElementById('know-card-front')?.textContent?.trim() || '';
        const back = document.getElementById('know-card-back')?.textContent?.trim() || '';
        const parts = [];
        if (title) parts.push(`# ${title}`);
        if (front) parts.push(`**Prompt:** ${front}`);
        if (back) parts.push(`**Answer:** ${back}`);
        return parts.join('\n\n');
      }
    },
    {
      id: 'web-inspector',
      label: 'Web Inspector (Audit Report)',
      section: 'web-inspector',
      mime: 'text/plain',
      read() {
        const el = document.getElementById('web-results-container');
        if (!el) return '';
        const text = (el.innerText || el.textContent || '').trim();
        if (text.toLowerCase().includes('enter a url or paste html')) return '';
        return text;
      }
    },
    {
      id: 'word-counter',
      label: 'Browser Tools (Word Counter Text)',
      section: 'tools',
      mime: 'text/plain',
      read() {
        const el = document.getElementById('word-textarea');
        return el ? (el.value || '').trim() : '';
      }
    }
  ];

  const DESTINATIONS = [
    {
      id: 'dest-api-body',
      label: 'API Explorer → Request Body',
      section: 'api-explorer',
      hasExisting() {
        const el = document.getElementById('api-body-textarea');
        return !!(el && el.value.trim().length > 0);
      },
      write(data) {
        window.Omnia.navigation?.navigateTo('api-explorer');
        document.getElementById('api-subtab-body')?.click();
        const el = document.getElementById('api-body-textarea');
        if (!el) return false;
        el.value = data;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        return true;
      }
    },
    {
      id: 'dest-json-formatter',
      label: 'Browser Tools → JSON Formatter',
      section: 'tools',
      hasExisting() {
        const el = document.getElementById('json-textarea');
        return !!(el && el.value.trim().length > 0);
      },
      write(data) {
        window.Omnia.navigation?.navigateTo('tools');
        const tabBtn = document.querySelector('[data-tool="json"]');
        tabBtn?.click();
        const el = document.getElementById('json-textarea');
        if (!el) return false;
        el.value = data;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        return true;
      }
    },
    {
      id: 'dest-word-counter',
      label: 'Browser Tools → Word & Text Analyzer',
      section: 'tools',
      hasExisting() {
        const el = document.getElementById('word-textarea');
        return !!(el && el.value.trim().length > 0);
      },
      write(data) {
        window.Omnia.navigation?.navigateTo('tools');
        const tabBtn = document.querySelector('[data-tool="word"]');
        tabBtn?.click();
        const el = document.getElementById('word-textarea');
        if (!el) return false;
        el.value = data;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        return true;
      }
    },
    {
      id: 'dest-file-lab-b64',
      label: 'File Lab → Text / Base64 Encoder',
      section: 'file-lab',
      hasExisting() {
        const el = document.getElementById('fl-b64-input');
        return !!(el && el.value.trim().length > 0);
      },
      write(data) {
        window.Omnia.navigation?.navigateTo('file-lab');
        const el = document.getElementById('fl-b64-input');
        if (!el) return false;
        el.value = data;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        return true;
      }
    },
    {
      id: 'dest-knowledge-deck',
      label: 'Knowledge Studio → New Deck Description',
      section: 'knowledge-studio',
      hasExisting() {
        const el = document.getElementById('know-new-deck-desc');
        return !!(el && el.value.trim().length > 0);
      },
      write(data) {
        window.Omnia.navigation?.navigateTo('knowledge-studio');
        document.getElementById('know-create-deck-btn')?.click();
        const descEl = document.getElementById('know-new-deck-desc');
        const titleEl = document.getElementById('know-new-deck-title');
        if (!descEl) return false;
        if (titleEl && !titleEl.value.trim()) {
          titleEl.value = 'Imported Handoff Notes';
        }
        descEl.value = data.slice(0, 4000);
        descEl.dispatchEvent(new Event('input', { bubbles: true }));
        return true;
      }
    },
    {
      id: 'dest-web-inspector-html',
      label: 'Web Inspector → HTML Input',
      section: 'web-inspector',
      hasExisting() {
        const el = document.getElementById('web-html-input');
        return !!(el && el.value.trim().length > 0);
      },
      write(data) {
        window.Omnia.navigation?.navigateTo('web-inspector');
        const el = document.getElementById('web-html-input');
        if (!el) return false;
        el.value = data;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        return true;
      }
    }
  ];

  const HandoffModule = {
    initialized: false,
    lastFocusedEl: null,
    pendingOverwrite: false,

    init() {
      if (this.initialized) return;
      this.initialized = true;
      this.injectHeaderButton();
      this.injectModal();
      this.bindEvents();
    },

    injectHeaderButton() {
      if (document.getElementById('omnia-handoff-trigger')) return;
      const searchBtn = document.getElementById('header-search-btn');
      if (!searchBtn || !searchBtn.parentElement) return;

      const btn = document.createElement('button');
      btn.id = 'omnia-handoff-trigger';
      btn.type = 'button';
      btn.className = 'omnia-upgrade-btn px-2.5 py-1.5 rounded-xl bg-slate-900/60 dark:bg-slate-900/60 bg-slate-100 border border-white/5 dark:border-white/5 border-slate-300 text-xs text-cyan-400 flex items-center gap-1.5 hover:border-cyan-500/50 hover:text-cyan-300 transition';
      btn.title = 'OMNIA Data Handoff — Pass data between modules';
      btn.setAttribute('aria-label', 'Open OMNIA Data Handoff');
      btn.innerHTML = `<span aria-hidden="true">⇄</span><span class="hidden lg:inline text-slate-200 dark:text-slate-200 text-slate-700">Handoff</span>`;

      searchBtn.parentElement.insertBefore(btn, searchBtn);
    },

    injectModal() {
      if (document.getElementById('omnia-handoff-modal')) return;
      const modal = document.createElement('div');
      modal.id = 'omnia-handoff-modal';
      modal.className = 'fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 hidden';
      modal.setAttribute('role', 'dialog');
      modal.setAttribute('aria-modal', 'true');
      modal.setAttribute('aria-labelledby', 'omnia-handoff-title');

      const sourceOpts = SOURCES.map(s => `<option value="${s.id}">${escapeHtml(s.label)}</option>`).join('');
      const destOpts = DESTINATIONS.map(d => `<option value="${d.id}">${escapeHtml(d.label)}</option>`).join('');

      modal.innerHTML = `
        <div class="glass-card w-full max-w-xl rounded-2xl border border-white/15 p-5 md:p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
          <div class="flex items-center justify-between border-b border-white/10 pb-3">
            <div class="flex items-center gap-2">
              <span class="text-cyan-400 text-base font-bold" aria-hidden="true">⇄</span>
              <h3 id="omnia-handoff-title" class="text-sm font-bold text-slate-100">OMNIA Data Handoff</h3>
            </div>
            <button type="button" id="omnia-handoff-close" class="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 text-sm" aria-label="Close Data Handoff">✕</button>
          </div>

          <p class="text-[11px] text-slate-400 leading-relaxed">
            Transfer data locally between compatible OMNIA modules. Transfers happen only on your device when you click <strong>Transfer Data</strong> — nothing is sent to external servers.
          </p>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div class="space-y-1">
              <label for="omnia-handoff-source" class="text-[11px] font-semibold text-slate-300">Source Module</label>
              <select id="omnia-handoff-source" class="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-xs text-white focus:outline-none focus:border-indigo-500">
                ${sourceOpts}
              </select>
            </div>
            <div class="space-y-1">
              <label for="omnia-handoff-dest" class="text-[11px] font-semibold text-slate-300">Destination Module</label>
              <select id="omnia-handoff-dest" class="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-xs text-white focus:outline-none focus:border-indigo-500">
                ${destOpts}
              </select>
            </div>
          </div>

          <!-- Route Summary -->
          <div id="omnia-handoff-route-badge" class="px-3 py-2 rounded-xl bg-slate-900/70 border border-white/5 text-[11px] text-cyan-300 flex items-center justify-between gap-2">
            <span id="omnia-handoff-route-text">Source → Destination</span>
            <span id="omnia-handoff-size-text" class="font-mono text-slate-400">0 chars</span>
          </div>

          <!-- Warnings (Large / Sensitive / Overwrite) -->
          <div id="omnia-handoff-warning" class="hidden p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-[11px] text-amber-200 leading-snug" role="alert"></div>

          <!-- Preview Box -->
          <div class="space-y-1">
            <div class="flex items-center justify-between">
              <label for="omnia-handoff-preview" class="text-[11px] font-semibold text-slate-300">Data Preview (Read-Only)</label>
              <button type="button" id="omnia-handoff-refresh" class="text-[11px] text-indigo-400 hover:text-indigo-300">↻ Refresh from Source</button>
            </div>
            <textarea id="omnia-handoff-preview" rows="6" readonly placeholder="No data detected in the selected source module yet. Run or enter content in the source module first." class="w-full px-3 py-2 rounded-xl bg-slate-950/90 border border-white/10 text-xs text-slate-200 font-mono focus:outline-none"></textarea>
          </div>

          <!-- Overwrite Confirmation Box -->
          <div id="omnia-handoff-overwrite-box" class="hidden p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 space-y-2">
            <p class="text-xs text-rose-200 font-medium">Destination already contains data. Replace existing content?</p>
            <div class="flex items-center gap-2">
              <button type="button" id="omnia-handoff-confirm-overwrite" class="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold">Yes, Replace Content</button>
              <button type="button" id="omnia-handoff-cancel-overwrite" class="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs">Cancel</button>
            </div>
          </div>

          <!-- Action Buttons -->
          <div class="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-white/10">
            <div class="flex items-center gap-2">
              <button type="button" id="omnia-handoff-copy" class="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium">📋 Copy Fallback</button>
              <button type="button" id="omnia-handoff-export" class="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium">⬇ Export File</button>
            </div>
            <button type="button" id="omnia-handoff-transfer" class="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md">⇄ Transfer Data</button>
          </div>
        </div>
      `;

      document.body.appendChild(modal);
    },

    getSelectedSource() {
      const id = document.getElementById('omnia-handoff-source')?.value;
      return SOURCES.find(s => s.id === id) || SOURCES[0];
    },

    getSelectedDest() {
      const id = document.getElementById('omnia-handoff-dest')?.value;
      return DESTINATIONS.find(d => d.id === id) || DESTINATIONS[0];
    },

    refreshPreview() {
      const src = this.getSelectedSource();
      const dst = this.getSelectedDest();
      const data = src.read();

      const previewEl = document.getElementById('omnia-handoff-preview');
      const routeEl = document.getElementById('omnia-handoff-route-text');
      const sizeEl = document.getElementById('omnia-handoff-size-text');
      const warnEl = document.getElementById('omnia-handoff-warning');
      const overwriteBox = document.getElementById('omnia-handoff-overwrite-box');

      if (overwriteBox) overwriteBox.classList.add('hidden');
      this.pendingOverwrite = false;

      if (routeEl) routeEl.textContent = `${src.label} → ${dst.label}`;
      if (sizeEl) sizeEl.textContent = `${data.length.toLocaleString()} chars`;
      if (previewEl) previewEl.value = data;

      const warnings = [];
      if (data.length > LARGE_PREVIEW_THRESHOLD) {
        warnings.push(`Large payload (${data.length.toLocaleString()} characters). Review preview before transferring.`);
      }
      if (SENSITIVE_PATTERN.test(data)) {
        warnings.push('Potential sensitive token or credential pattern detected. Transfers remain strictly local on your device.');
      }

      if (warnEl) {
        if (warnings.length > 0) {
          warnEl.textContent = '⚠️ ' + warnings.join(' ');
          warnEl.classList.remove('hidden');
        } else {
          warnEl.textContent = '';
          warnEl.classList.add('hidden');
        }
      }
    },

    open(defaultSourceId) {
      this.lastFocusedEl = document.activeElement;
      const modal = document.getElementById('omnia-handoff-modal');
      if (!modal) return;

      const srcSelect = document.getElementById('omnia-handoff-source');
      if (srcSelect) {
        if (defaultSourceId && SOURCES.some(s => s.id === defaultSourceId)) {
          srcSelect.value = defaultSourceId;
        } else {
          // Auto-select source matching current hash if available
          const currentSec = (window.location.hash || '').replace(/^#/, '');
          const match = SOURCES.find(s => s.section === currentSec && s.read().length > 0) ||
                        SOURCES.find(s => s.section === currentSec);
          if (match) srcSelect.value = match.id;
        }
      }

      this.refreshPreview();
      modal.classList.remove('hidden');
      document.getElementById('omnia-handoff-source')?.focus();
    },

    close() {
      const modal = document.getElementById('omnia-handoff-modal');
      if (modal) modal.classList.add('hidden');
      const overwriteBox = document.getElementById('omnia-handoff-overwrite-box');
      if (overwriteBox) overwriteBox.classList.add('hidden');
      this.pendingOverwrite = false;
      if (this.lastFocusedEl && typeof this.lastFocusedEl.focus === 'function') {
        this.lastFocusedEl.focus();
      }
    },

    executeTransfer(forceOverwrite = false) {
      const src = this.getSelectedSource();
      const dst = this.getSelectedDest();
      const data = src.read();

      if (!data) {
        storage.showToast('No data available in the selected source module.', 'warning');
        return;
      }

      if (!forceOverwrite && dst.hasExisting()) {
        this.pendingOverwrite = true;
        const box = document.getElementById('omnia-handoff-overwrite-box');
        if (box) {
          box.classList.remove('hidden');
          document.getElementById('omnia-handoff-confirm-overwrite')?.focus();
        }
        return;
      }

      const ok = dst.write(data);
      if (ok) {
        const hist = storage.get(HISTORY_KEY, []);
        hist.unshift({ from: src.id, to: dst.id, chars: data.length, ts: Date.now() });
        storage.set(HISTORY_KEY, hist.slice(0, 20));
        storage.showToast(`Transferred ${data.length.toLocaleString()} chars to ${dst.label}`, 'success');
        this.close();
      } else {
        storage.showToast('Destination input unavailable. Use Copy or Export fallback.', 'warning');
      }
    },

    bindEvents() {
      document.getElementById('omnia-handoff-trigger')?.addEventListener('click', () => this.open());
      document.getElementById('omnia-handoff-close')?.addEventListener('click', () => this.close());
      document.getElementById('omnia-handoff-source')?.addEventListener('change', () => this.refreshPreview());
      document.getElementById('omnia-handoff-dest')?.addEventListener('change', () => this.refreshPreview());
      document.getElementById('omnia-handoff-refresh')?.addEventListener('click', () => this.refreshPreview());

      document.getElementById('omnia-handoff-transfer')?.addEventListener('click', () => this.executeTransfer(false));
      document.getElementById('omnia-handoff-confirm-overwrite')?.addEventListener('click', () => this.executeTransfer(true));
      document.getElementById('omnia-handoff-cancel-overwrite')?.addEventListener('click', () => {
        document.getElementById('omnia-handoff-overwrite-box')?.classList.add('hidden');
        this.pendingOverwrite = false;
      });

      document.getElementById('omnia-handoff-copy')?.addEventListener('click', async () => {
        const data = document.getElementById('omnia-handoff-preview')?.value || '';
        if (!data) {
          storage.showToast('Nothing to copy from selected source.', 'warning');
          return;
        }
        try {
          await navigator.clipboard.writeText(data);
          storage.showToast('Copied handoff data to clipboard.', 'success');
        } catch (e) {
          storage.showToast('Clipboard blocked by browser; select text in preview box.', 'warning');
        }
      });

      document.getElementById('omnia-handoff-export')?.addEventListener('click', () => {
        const src = this.getSelectedSource();
        const data = document.getElementById('omnia-handoff-preview')?.value || '';
        if (!data) {
          storage.showToast('Nothing to export from selected source.', 'warning');
          return;
        }
        const ext = src.mime === 'application/json' ? 'json' : src.mime === 'text/markdown' ? 'md' : 'txt';
        const blob = new Blob([data], { type: src.mime });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `omnia-handoff-${src.id}.${ext}`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        storage.showToast(`Exported ${a.download}`, 'success');
      });

      // Close on backdrop click or Escape
      const modal = document.getElementById('omnia-handoff-modal');
      modal?.addEventListener('click', (e) => {
        if (e.target === modal) this.close();
      });
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal && !modal.classList.contains('hidden')) {
          this.close();
        }
      });
    }
  };

  window.Omnia.handoff = HandoffModule;
})();
