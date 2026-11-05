/**
 * OMNIA 2.0 - Division 19: API Explorer & Developer Console
 * Lightweight in-browser HTTP client with query builder, headers, body, timing, and collections.
 */
(function() {
  window.Omnia = window.Omnia || {};
  const storage = window.Omnia.storage || {
    get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch(e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch(e) {} },
    showToast(m, t) { console.log(m, t); }
  };

  const PRESET_APIS = [
    {
      name: 'Open-Meteo Weather API',
      method: 'GET',
      url: 'https://api.open-meteo.com/v1/forecast?latitude=28.6139&longitude=77.2090&current=temperature_2m,relative_humidity_2m',
      headers: [],
      body: ''
    },
    {
      name: 'JSONPlaceholder Users',
      method: 'GET',
      url: 'https://jsonplaceholder.typicode.com/users',
      headers: [],
      body: ''
    },
    {
      name: 'JSONPlaceholder Create Post',
      method: 'POST',
      url: 'https://jsonplaceholder.typicode.com/posts',
      headers: [{ key: 'Content-Type', value: 'application/json' }],
      body: JSON.stringify({ title: 'OMNIA API Test', body: 'Testing developer console', userId: 1 }, null, 2)
    },
    {
      name: 'IPify IPv4 Public Endpoint',
      method: 'GET',
      url: 'https://api.ipify.org?format=json',
      headers: [],
      body: ''
    },
    {
      name: 'USGS Real-time Earthquakes',
      method: 'GET',
      url: 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_hour.geojson',
      headers: [],
      body: ''
    }
  ];

  const ApiExplorerModule = {
    history: [],
    savedCollections: [],
    activeTab: 'params', // 'params' | 'headers' | 'body'
    responseMode: 'json', // 'json' | 'raw' | 'headers'

    init() {
      this.loadStorage();
      this.bindEvents();
      this.renderPresets();
      this.renderHistory();
      this.renderCollections();
      this.initDefaultRow('api-params-tbody');
      this.initDefaultRow('api-headers-tbody');
    },

    loadStorage() {
      this.history = storage.get('omnia_api_explorer_history', []);
      this.savedCollections = storage.get('omnia_api_explorer_collections', []);
    },

    bindEvents() {
      // Send Request
      document.getElementById('api-send-btn')?.addEventListener('click', () => {
        this.executeRequest();
      });

      // Clear / Reset
      document.getElementById('api-clear-btn')?.addEventListener('click', () => {
        this.resetRequest();
      });

      // Save Request
      document.getElementById('api-save-btn')?.addEventListener('click', () => {
        this.saveCurrentRequest();
      });

      // Prettify Body JSON
      document.getElementById('api-prettify-body-btn')?.addEventListener('click', () => {
        const bodyInput = document.getElementById('api-body-textarea');
        if (bodyInput && bodyInput.value.trim()) {
          try {
            const parsed = JSON.parse(bodyInput.value);
            bodyInput.value = JSON.stringify(parsed, null, 2);
            storage.showToast('JSON body formatted', 'info');
          } catch (e) {
            storage.showToast('Invalid JSON in request body', 'warning');
          }
        }
      });

      // Add Row buttons
      document.getElementById('api-add-param-btn')?.addEventListener('click', () => {
        this.addRow('api-params-tbody', '', '');
      });
      document.getElementById('api-add-header-btn')?.addEventListener('click', () => {
        this.addRow('api-headers-tbody', '', '');
      });

      // Sub-tabs: Params, Headers, Body
      const tabs = ['params', 'headers', 'body'];
      tabs.forEach(t => {
        document.getElementById(`api-subtab-${t}`)?.addEventListener('click', () => {
          this.switchSubtab(t);
        });
      });

      // Response View Tabs: JSON, Raw, Headers
      const resTabs = ['json', 'raw', 'headers'];
      resTabs.forEach(rt => {
        document.getElementById(`api-res-tab-${rt}`)?.addEventListener('click', () => {
          this.switchResponseTab(rt);
        });
      });

      // Method change auto-adjusts body tab
      document.getElementById('api-method-select')?.addEventListener('change', (e) => {
        const method = e.target.value;
        const bodyTabBtn = document.getElementById('api-subtab-body');
        if (method === 'GET' || method === 'DELETE') {
          bodyTabBtn?.classList.add('opacity-50');
        } else {
          bodyTabBtn?.classList.remove('opacity-50');
        }
      });
    },

    switchSubtab(tab) {
      this.activeTab = tab;
      ['params', 'headers', 'body'].forEach(t => {
        const btn = document.getElementById(`api-subtab-${t}`);
        const panel = document.getElementById(`api-panel-${t}`);
        if (btn) {
          if (t === tab) {
            btn.className = 'px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 text-white transition';
          } else {
            btn.className = 'px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 text-slate-400 hover:text-white transition';
          }
        }
        if (panel) {
          panel.classList.toggle('hidden', t !== tab);
        }
      });
    },

    switchResponseTab(mode) {
      this.responseMode = mode;
      ['json', 'raw', 'headers'].forEach(m => {
        const btn = document.getElementById(`api-res-tab-${m}`);
        const view = document.getElementById(`api-view-${m}`);
        if (btn) {
          if (m === mode) {
            btn.className = 'px-3 py-1 rounded-md text-xs font-semibold bg-slate-700 text-white transition';
          } else {
            btn.className = 'px-3 py-1 rounded-md text-xs font-semibold text-slate-400 hover:text-white transition';
          }
        }
        if (view) {
          view.classList.toggle('hidden', m !== mode);
        }
      });
    },

    addRow(tbodyId, key = '', value = '') {
      const tbody = document.getElementById(tbodyId);
      if (!tbody) return;

      const tr = document.createElement('tr');
      tr.className = 'border-b border-white/5';
      tr.innerHTML = `
        <td class="p-1.5"><input type="text" placeholder="Key" value="${this.escapeHtml(key)}" class="row-key w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-white/10 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"></td>
        <td class="p-1.5"><input type="text" placeholder="Value" value="${this.escapeHtml(value)}" class="row-val w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-white/10 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"></td>
        <td class="p-1.5 text-center w-10">
          <button type="button" class="row-del-btn text-rose-400 hover:text-rose-300 text-xs font-bold px-2 py-1">✕</button>
        </td>
      `;

      tr.querySelector('.row-del-btn')?.addEventListener('click', () => tr.remove());
      tbody.appendChild(tr);
    },

    initDefaultRow(tbodyId) {
      const tbody = document.getElementById(tbodyId);
      if (tbody && tbody.children.length === 0) {
        this.addRow(tbodyId, '', '');
      }
    },

    getTablePairs(tbodyId) {
      const tbody = document.getElementById(tbodyId);
      if (!tbody) return {};
      const pairs = {};
      tbody.querySelectorAll('tr').forEach(tr => {
        const k = tr.querySelector('.row-key')?.value.trim();
        const v = tr.querySelector('.row-val')?.value.trim();
        if (k) pairs[k] = v;
      });
      return pairs;
    },

    async executeRequest() {
      const urlInput = document.getElementById('api-url-input');
      const methodSelect = document.getElementById('api-method-select');
      const sendBtn = document.getElementById('api-send-btn');
      const statusBadge = document.getElementById('api-status-badge');
      const timeBadge = document.getElementById('api-time-badge');
      const sizeBadge = document.getElementById('api-size-badge');

      let rawUrl = (urlInput?.value || '').trim();
      const method = methodSelect?.value || 'GET';

      if (!rawUrl) {
        storage.showToast('Please enter a request URL', 'warning');
        return;
      }

      if (!rawUrl.startsWith('http://') && !rawUrl.startsWith('https://')) {
        rawUrl = 'https://' + rawUrl;
        if (urlInput) urlInput.value = rawUrl;
      }

      // Append query parameters
      const params = this.getTablePairs('api-params-tbody');
      const urlObj = new URL(rawUrl);
      Object.entries(params).forEach(([pk, pv]) => {
        if (pk) urlObj.searchParams.set(pk, pv);
      });
      const targetUrl = urlObj.toString();

      // Collect headers
      const customHeaders = this.getTablePairs('api-headers-tbody');

      // Collect body
      const bodyInput = document.getElementById('api-body-textarea');
      let bodyData = null;
      if (method !== 'GET' && method !== 'HEAD' && bodyInput && bodyInput.value.trim()) {
        bodyData = bodyInput.value.trim();
        if (!customHeaders['Content-Type']) {
          customHeaders['Content-Type'] = 'application/json';
        }
      }

      // UI state loading
      if (sendBtn) {
        sendBtn.disabled = true;
        sendBtn.innerHTML = '<span class="w-3 h-3 rounded-full border-2 border-white border-t-transparent animate-spin inline-block"></span> Sending...';
      }

      const startTime = performance.now();
      try {
        const fetchOptions = {
          method,
          headers: customHeaders
        };
        if (bodyData) fetchOptions.body = bodyData;

        const response = await fetch(targetUrl, fetchOptions);
        const duration = Math.round(performance.now() - startTime);

        // Telemetry
        const status = response.status;
        const statusText = response.statusText || (status >= 200 && status < 300 ? 'OK' : 'Response');

        if (statusBadge) {
          statusBadge.textContent = `${status} ${statusText}`;
          statusBadge.className = `px-2.5 py-1 rounded-md text-xs font-mono font-bold ${status >= 200 && status < 300 ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'}`;
        }
        if (timeBadge) timeBadge.textContent = `${duration} ms`;

        // Response headers
        const resHeadersObj = {};
        response.headers.forEach((v, k) => { resHeadersObj[k] = v; });
        this.renderResponseHeaders(resHeadersObj);

        // Body text & size
        const rawText = await response.text();
        const sizeBytes = new Blob([rawText]).size;
        if (sizeBadge) sizeBadge.textContent = `${(sizeBytes / 1024).toFixed(2)} KB`;

        // Render response content
        this.renderResponseContent(rawText);

        // Log to history
        this.addToHistory({
          method,
          url: targetUrl,
          status,
          duration,
          timestamp: new Date().toISOString()
        });

      } catch (err) {
        const duration = Math.round(performance.now() - startTime);
        if (statusBadge) {
          statusBadge.textContent = 'Failed (CORS / Network)';
          statusBadge.className = 'px-2.5 py-1 rounded-md text-xs font-mono font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30';
        }
        if (timeBadge) timeBadge.textContent = `${duration} ms`;
        if (sizeBadge) sizeBadge.textContent = '0 KB';

        const jsonView = document.getElementById('api-view-json');
        const rawView = document.getElementById('api-view-raw');

        const errMsg = `[OMNIA API EXPLORER - NETWORK / CORS EXCEPTION]
Request URL: ${targetUrl}
HTTP Method: ${method}
Error: ${err.message || 'Network request failed'}

[IMPORTANT CORS EXPLANATION]
Browsers enforce Cross-Origin Resource Sharing (CORS). If the target server does not send the 'Access-Control-Allow-Origin' header, your browser will reject the response for security reasons.

To test APIs directly from client-side browsers, ensure the target server supports CORS (e.g. Open-Meteo, JSONPlaceholder, GitHub, IPify, or local development servers with CORS enabled).`;

        if (jsonView) jsonView.innerHTML = `<pre class="text-rose-300 font-mono text-xs leading-relaxed">${this.escapeHtml(errMsg)}</pre>`;
        if (rawView) rawView.textContent = errMsg;

      } finally {
        if (sendBtn) {
          sendBtn.disabled = false;
          sendBtn.innerHTML = '<span>⚡ Send Request</span>';
        }
      }
    },

    renderResponseContent(rawText) {
      const jsonView = document.getElementById('api-view-json');
      const rawView = document.getElementById('api-view-raw');

      if (rawView) rawView.textContent = rawText;

      if (jsonView) {
        try {
          const parsed = JSON.parse(rawText);
          jsonView.innerHTML = this.syntaxHighlightJson(parsed);
        } catch (e) {
          jsonView.innerHTML = `<pre class="text-slate-300 font-mono text-xs whitespace-pre-wrap">${this.escapeHtml(rawText)}</pre>`;
        }
      }
    },

    renderResponseHeaders(headersObj) {
      const tbody = document.getElementById('api-res-headers-tbody');
      if (!tbody) return;
      const entries = Object.entries(headersObj);
      if (entries.length === 0) {
        tbody.innerHTML = '<tr><td colspan="2" class="p-4 text-center text-xs text-slate-500">No response headers exposed by server</td></tr>';
        return;
      }
      tbody.innerHTML = entries.map(([k, v]) => `
        <tr class="border-b border-white/5 font-mono text-xs">
          <td class="p-2 text-indigo-300 font-semibold">${this.escapeHtml(k)}</td>
          <td class="p-2 text-slate-300 break-all">${this.escapeHtml(v)}</td>
        </tr>
      `).join('');
    },

    syntaxHighlightJson(json) {
      let str = JSON.stringify(json, null, 2);
      str = this.escapeHtml(str);
      return '<pre class="font-mono text-xs leading-relaxed">' + str.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, (match) => {
        let cls = 'text-amber-300'; // number
        if (/^"/.test(match)) {
          if (/:$/.test(match)) {
            cls = 'text-indigo-400 font-bold'; // key
          } else {
            cls = 'text-emerald-300'; // string
          }
        } else if (/true|false/.test(match)) {
          cls = 'text-rose-400 font-bold'; // boolean
        } else if (/null/.test(match)) {
          cls = 'text-slate-500 italic'; // null
        }
        return `<span class="${cls}">${match}</span>`;
      }) + '</pre>';
    },

    addToHistory(item) {
      this.history.unshift(item);
      if (this.history.length > 25) this.history.pop();
      storage.set('omnia_api_explorer_history', this.history);
      this.renderHistory();
    },

    renderHistory() {
      const container = document.getElementById('api-history-list');
      if (!container) return;

      if (this.history.length === 0) {
        container.innerHTML = '<div class="p-4 text-center text-xs text-slate-500">No recent requests</div>';
        return;
      }

      container.innerHTML = this.history.slice(0, 15).map((item, idx) => `
        <button type="button" class="api-history-item w-full p-2 rounded-xl text-left hover:bg-slate-800 transition flex items-center justify-between text-xs group" data-idx="${idx}">
          <div class="flex items-center gap-2 overflow-hidden">
            <span class="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${this.getMethodBadgeClass(item.method)}">${item.method}</span>
            <span class="text-slate-300 truncate font-mono text-[11px]">${this.escapeHtml(item.url)}</span>
          </div>
          <span class="text-[10px] font-mono text-slate-500 shrink-0">${item.status || ''}</span>
        </button>
      `).join('');

      container.querySelectorAll('.api-history-item').forEach(btn => {
        btn.addEventListener('click', () => {
          const idx = parseInt(btn.getAttribute('data-idx'), 10);
          const req = this.history[idx];
          if (req) this.loadRequest(req);
        });
      });
    },

    renderPresets() {
      const container = document.getElementById('api-presets-container');
      if (!container) return;
      container.innerHTML = PRESET_APIS.map((p, idx) => `
        <button type="button" class="api-preset-chip px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 border border-white/5 transition flex items-center gap-1.5" data-preset-idx="${idx}">
          <span class="text-[10px] font-mono font-bold text-indigo-400">${p.method}</span>
          <span>${this.escapeHtml(p.name)}</span>
        </button>
      `).join('');

      container.querySelectorAll('.api-preset-chip').forEach(btn => {
        btn.addEventListener('click', () => {
          const idx = parseInt(btn.getAttribute('data-preset-idx'), 10);
          const preset = PRESET_APIS[idx];
          if (preset) {
            this.loadRequest(preset);
            storage.showToast(`Loaded preset: ${preset.name}`, 'info');
          }
        });
      });
    },

    loadRequest(req) {
      const urlInput = document.getElementById('api-url-input');
      const methodSelect = document.getElementById('api-method-select');
      const bodyInput = document.getElementById('api-body-textarea');

      if (urlInput) urlInput.value = req.url || '';
      if (methodSelect) methodSelect.value = req.method || 'GET';
      if (bodyInput) bodyInput.value = req.body || '';

      // Populate headers if present
      const hTbody = document.getElementById('api-headers-tbody');
      if (hTbody) {
        hTbody.innerHTML = '';
        if (req.headers && Array.isArray(req.headers) && req.headers.length > 0) {
          req.headers.forEach(h => this.addRow('api-headers-tbody', h.key, h.value));
        } else {
          this.initDefaultRow('api-headers-tbody');
        }
      }
    },

    saveCurrentRequest() {
      const url = document.getElementById('api-url-input')?.value.trim();
      const method = document.getElementById('api-method-select')?.value || 'GET';
      const body = document.getElementById('api-body-textarea')?.value || '';

      if (!url) {
        storage.showToast('Please enter a URL before saving', 'warning');
        return;
      }

      let name = `${method} ${new URL(url).pathname || 'Request'}`;

      const newReq = {
        id: 'req-' + Date.now(),
        name,
        method,
        url,
        body
      };

      this.savedCollections.unshift(newReq);
      storage.set('omnia_api_explorer_collections', this.savedCollections);
      this.renderCollections();
      storage.showToast('Request saved to collection', 'success');
    },

    renderCollections() {
      const container = document.getElementById('api-collections-list');
      if (!container) return;

      if (this.savedCollections.length === 0) {
        container.innerHTML = '<div class="p-4 text-center text-xs text-slate-500">No saved requests</div>';
        return;
      }

      container.innerHTML = this.savedCollections.map(req => `
        <div class="p-2.5 rounded-xl bg-slate-900 border border-white/5 flex items-center justify-between text-xs">
          <div class="flex items-center gap-2 overflow-hidden">
            <span class="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${this.getMethodBadgeClass(req.method)}">${req.method}</span>
            <span class="font-medium text-slate-200 truncate">${this.escapeHtml(req.name)}</span>
          </div>
          <div class="flex items-center gap-1.5 shrink-0">
            <button type="button" class="api-load-saved-btn px-2 py-1 rounded bg-indigo-600/20 text-indigo-300 hover:bg-indigo-600 hover:text-white text-[11px]" data-id="${req.id}">Load</button>
            <button type="button" class="api-del-saved-btn text-slate-500 hover:text-rose-400 p-1" data-id="${req.id}">✕</button>
          </div>
        </div>
      `).join('');

      container.querySelectorAll('.api-load-saved-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const id = btn.getAttribute('data-id');
          const item = this.savedCollections.find(c => c.id === id);
          if (item) this.loadRequest(item);
        });
      });

      container.querySelectorAll('.api-del-saved-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const id = btn.getAttribute('data-id');
          this.savedCollections = this.savedCollections.filter(c => c.id !== id);
          storage.set('omnia_api_explorer_collections', this.savedCollections);
          this.renderCollections();
          storage.showToast('Removed saved request', 'info');
        });
      });
    },

    resetRequest() {
      const urlInput = document.getElementById('api-url-input');
      const methodSelect = document.getElementById('api-method-select');
      const bodyInput = document.getElementById('api-body-textarea');

      if (urlInput) urlInput.value = '';
      if (methodSelect) methodSelect.value = 'GET';
      if (bodyInput) bodyInput.value = '';

      const pTbody = document.getElementById('api-params-tbody');
      const hTbody = document.getElementById('api-headers-tbody');
      if (pTbody) pTbody.innerHTML = '';
      if (hTbody) hTbody.innerHTML = '';
      this.initDefaultRow('api-params-tbody');
      this.initDefaultRow('api-headers-tbody');

      const jsonView = document.getElementById('api-view-json');
      const rawView = document.getElementById('api-view-raw');
      if (jsonView) jsonView.innerHTML = '<div class="p-8 text-center text-xs text-slate-500">Response output will appear here</div>';
      if (rawView) rawView.textContent = '';

      storage.showToast('Request reset to default', 'info');
    },

    getMethodBadgeClass(m) {
      switch (m) {
        case 'GET': return 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30';
        case 'POST': return 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30';
        case 'PUT': return 'bg-amber-500/20 text-amber-300 border border-amber-500/30';
        case 'PATCH': return 'bg-purple-500/20 text-purple-300 border border-purple-500/30';
        case 'DELETE': return 'bg-rose-500/20 text-rose-300 border border-rose-500/30';
        default: return 'bg-slate-700 text-slate-300';
      }
    },

    escapeHtml(str) {
      if (!str) return '';
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    }
  };

  window.Omnia.apiExplorer = ApiExplorerModule;
})();
