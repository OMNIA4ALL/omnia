(function() {
  window.Omnia = window.Omnia || {};
  const storage = window.Omnia.storage || {
    get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch(e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch(e) {} },
    showToast(m) { console.log(m); }
  };
  const api = window.Omnia.api || {};

/**
 * OMNIA 2.0 - Privacy Centre Module
 * Browser privacy diagnostics, permission inspection, and educational privacy guides
 */

const PrivacyModule = {
  init() {
    this.runDiagnostics();
    this.bindEvents();
  },

  async runDiagnostics() {
    // HTTPS Status
    const httpsEl = document.getElementById('priv-https-status');
    if (httpsEl) {
      const isHttps = location.protocol === 'https:' || location.hostname === 'localhost';
      httpsEl.innerHTML = isHttps
        ? '<span class="text-emerald-400 font-bold">✓ Secure (HTTPS Active)</span>'
        : '<span class="text-amber-400 font-bold">⚠ Insecure (HTTP Protocol)</span>';
    }

    // Secure Context
    const secEl = document.getElementById('priv-secure-context');
    if (secEl) {
      secEl.textContent = window.isSecureContext ? 'Yes (Cryptographic APIs Permitted)' : 'No';
    }

    // Cookies
    const cookieEl = document.getElementById('priv-cookies-status');
    if (cookieEl) {
      cookieEl.textContent = navigator.cookieEnabled ? 'Enabled' : 'Blocked / Disabled';
    }

    // Do Not Track
    const dntEl = document.getElementById('priv-dnt-status');
    if (dntEl) {
      const dnt = navigator.doNotTrack || window.doNotTrack;
      dntEl.textContent = dnt === '1' ? 'Enabled (Tracking Opt-Out Active)' : 'Not Enabled';
    }

    // Storage estimation
    const storageEl = document.getElementById('priv-storage-status');
    if (storageEl && navigator.storage && navigator.storage.estimate) {
      try {
        const est = await navigator.storage.estimate();
        const usedMb = (est.usage / (1024 * 1024)).toFixed(1);
        const quotaMb = (est.quota / (1024 * 1024)).toFixed(0);
        storageEl.textContent = `${usedMb} MB used of ${quotaMb} MB available`;
      } catch (e) {
        storageEl.textContent = 'Storage quota query blocked';
      }
    }

    // Permissions check
    this.checkPermissions();
  },

  async checkPermissions() {
    const list = document.getElementById('priv-permissions-list');
    if (!list) return;

    const perms = ['camera', 'microphone', 'geolocation', 'notifications'];
    const results = [];

    for (const p of perms) {
      try {
        if (navigator.permissions && navigator.permissions.query) {
          const res = await navigator.permissions.query({ name: p });
          results.push({ name: p, state: res.state });
        } else {
          results.push({ name: p, state: 'unsupported' });
        }
      } catch (e) {
        results.push({ name: p, state: 'not allowed to query' });
      }
    }

    list.innerHTML = results.map(r => {
      const color = r.state === 'granted' ? 'text-amber-400' : r.state === 'denied' ? 'text-rose-400' : 'text-slate-300';
      return `
        <div class="flex items-center justify-between p-2 rounded bg-white/5 text-xs">
          <span class="capitalize text-slate-300 font-medium">${r.name}</span>
          <span class="font-mono ${color}">${r.state}</span>
        </div>
      `;
    }).join('');
  },

  bindEvents() {
    const refreshBtn = document.getElementById('priv-refresh-btn');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => {
        this.runDiagnostics();
        storage.showToast('Privacy audit refreshed');
      });
    }
  }
};

window.PrivacyModule = PrivacyModule;


  window.Omnia.privacy = PrivacyModule;
  window.PrivacyModule = PrivacyModule;
})();
