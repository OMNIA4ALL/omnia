/**
 * OMNIA 2.0 — Simplified 4-Step Guided Setup & Server-Verified Personal Worker Auth
 * Namespace: omnia_ai_auth_ / omnia_ai_quota_
 *
 * Designed for everyday, non-technical users:
 * - Breaks personal Cloudflare Workers AI connection into 4 calm, plain-English steps with Back/Next & progress bar.
 * - Never exposes Cloudflare API tokens in frontend code or browser storage.
 * - Verifies Worker health (/health) and session identity (/auth/signin & /auth/verify) server-side.
 * - Keeps all 23 other OMNIA modules completely open without sign-in or AI setup.
 */
(function() {
  window.Omnia = window.Omnia || {};
  const storage = window.Omnia.storage || {
    get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
    showToast(m) { console.log(m); }
  };

  const WORKER_URL_KEY = 'omnia_cf_worker_url';
  const MODEL_KEY = 'omnia_cf_model';
  const SESSION_TOKEN_KEY = 'omnia_ai_session_token_v1';
  const QUOTA_MIRROR_KEY = 'omnia_ai_quota_mirror_v1';
  const DEFAULT_TEXT_MODEL = '@cf/meta/llama-3.1-8b-instruct-fast';

  const TOTAL_STEPS = 4;

  const escapeHtml = (str) => {
    if (typeof str !== 'string') return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  };

  const AssistantAuthModule = {
    initialized: false,
    authenticated: false,
    userId: '',
    workerHealth: null,
    quota: null,
    turnstileToken: '',
    currentStep: 1,
    connectionVerified: false,
    onAuthChangeCallbacks: [],

    init() {
      if (this.initialized) return;
      this.initialized = true;
      this.cleanupLegacyTokens();
      this.bindSetupModal();
      this.verifyExistingSessionOnLoad();
    },

    cleanupLegacyTokens() {
      try {
        localStorage.removeItem('omnia_cf_api_token');
        localStorage.removeItem('omnia_cf_account_id');
        sessionStorage.removeItem('omnia_cf_api_token');
        sessionStorage.removeItem('omnia_cf_account_id');
      } catch (e) {}
    },

    onAuthChange(cb) {
      if (typeof cb === 'function') this.onAuthChangeCallbacks.push(cb);
    },

    notifyAuthChange() {
      this.onAuthChangeCallbacks.forEach(cb => {
        try { cb(this.getState()); } catch (e) {}
      });
    },

    isValidWorkerUrl(url) {
      if (!url || typeof url !== 'string') return false;
      try {
        const u = new URL(url.trim());
        return u.protocol === 'https:' || (u.protocol === 'http:' && (u.hostname === 'localhost' || u.hostname === '127.0.0.1'));
      } catch {
        return false;
      }
    },

    getWorkerUrl() {
      try {
        return (localStorage.getItem(WORKER_URL_KEY) || '').trim().replace(/\/+$/, '');
      } catch {
        return '';
      }
    },

    setWorkerUrl(url) {
      const clean = (url || '').trim().replace(/\/+$/, '');
      try {
        if (clean) localStorage.setItem(WORKER_URL_KEY, clean);
        else localStorage.removeItem(WORKER_URL_KEY);
      } catch (e) {}
    },

    getSessionToken() {
      try {
        return (sessionStorage.getItem(SESSION_TOKEN_KEY) || '').trim();
      } catch {
        return '';
      }
    },

    setSessionToken(token) {
      try {
        if (token) sessionStorage.setItem(SESSION_TOKEN_KEY, token);
        else sessionStorage.removeItem(SESSION_TOKEN_KEY);
      } catch (e) {}
    },

    getUtcDateKey() {
      return new Date().toISOString().slice(0, 10);
    },

    saveQuotaMirror(quotaObj) {
      if (!quotaObj || typeof quotaObj !== 'object') return;
      this.quota = quotaObj;
      const workerUrl = this.getWorkerUrl();
      if (!workerUrl) return;
      try {
        const all = storage.get(QUOTA_MIRROR_KEY, {});
        all[workerUrl] = {
          ...quotaObj,
          date: quotaObj.date || this.getUtcDateKey(),
          updatedAt: Date.now()
        };
        storage.set(QUOTA_MIRROR_KEY, all);
      } catch (e) {}
      this.notifyAuthChange();
    },

    getLocalQuotaMirror() {
      const workerUrl = this.getWorkerUrl();
      if (!workerUrl) return null;
      const all = storage.get(QUOTA_MIRROR_KEY, {});
      const entry = all[workerUrl];
      if (!entry || entry.date !== this.getUtcDateKey()) return null;
      return entry;
    },

    isQuotaExhaustedLocally() {
      const q = this.quota || this.getLocalQuotaMirror();
      return !!(q && q.enforced && q.exhausted && q.date === this.getUtcDateKey());
    },

    getState() {
      return {
        authenticated: this.authenticated,
        userId: this.userId,
        workerUrl: this.getWorkerUrl(),
        workerHealth: this.workerHealth,
        quota: this.quota || this.getLocalQuotaMirror()
      };
    },

    isAuthenticated() {
      return this.authenticated && !!this.getSessionToken() && this.isValidWorkerUrl(this.getWorkerUrl());
    },

    async checkWorkerHealth(workerUrl) {
      const clean = (workerUrl || '').trim().replace(/\/+$/, '');
      if (!this.isValidWorkerUrl(clean)) {
        throw new Error('That does not look like a valid link yet. It should start with https:// (for example: https://omnia-ai-worker.yourname.workers.dev).');
      }

      let res;
      try {
        res = await fetch(`${clean}/health`, { method: 'GET' });
      } catch {
        throw new Error('Could not reach that link. Double-check the spelling, make sure your Worker is deployed, and verify you are online.');
      }

      if (res.status === 404 || res.status === 405) {
        throw new Error('That link answered, but it is not running the OMNIA AI Worker yet (HTTP ' + res.status + '). In Cloudflare Build Settings, make sure Root Directory is set to "cloudflare-worker" and redeploy.');
      }

      let data = {};
      try { data = await res.json(); } catch {}
      if (!res.ok || !data.ok) {
        throw new Error(data.error || `Connection check failed (HTTP ${res.status}). Make sure you deployed the cloudflare-worker folder.`);
      }
      if (!data.aiBindingReady) {
        throw new Error('Your Worker is online, but Cloudflare Workers AI is not turned on yet. In Cloudflare Settings → Bindings, add a Workers AI binding named "AI" and redeploy.');
      }

      this.workerHealth = data;
      this.connectionVerified = true;
      return data;
    },

    async verifyExistingSessionOnLoad() {
      const workerUrl = this.getWorkerUrl();
      const token = this.getSessionToken();
      if (!this.isValidWorkerUrl(workerUrl) || !token) {
        this.authenticated = false;
        this.notifyAuthChange();
        return false;
      }

      try {
        const res = await fetch(`${workerUrl}/auth/verify`, {
          method: 'GET',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) {
          this.authenticated = false;
          this.setSessionToken('');
          this.notifyAuthChange();
          return false;
        }
        const data = await res.json();
        if (data.authenticated) {
          this.authenticated = true;
          this.userId = data.userId || 'owner';
          if (data.quota) this.saveQuotaMirror(data.quota);
          this.notifyAuthChange();
          return true;
        }
      } catch {
        this.authenticated = false;
      }
      this.notifyAuthChange();
      return false;
    },

    async signIn(workerUrl, passcode, label = 'owner') {
      const clean = (workerUrl || '').trim().replace(/\/+$/, '');
      if (!this.isValidWorkerUrl(clean)) {
        throw new Error('Please go back to Step 3 and enter a valid Worker link first.');
      }
      if (!passcode || !passcode.trim()) {
        throw new Error('Please enter the personal passcode you created for your Worker.');
      }

      const res = await fetch(`${clean}/auth/signin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          passcode: passcode.trim(),
          label: (label || 'owner').trim(),
          turnstileToken: this.turnstileToken || ''
        })
      });

      let data = {};
      try { data = await res.json(); } catch {}
      if (!res.ok || !data.authenticated || !data.sessionToken) {
        throw new Error(data.error || `Sign-in did not succeed (HTTP ${res.status}). Check your passcode and try again.`);
      }

      this.setWorkerUrl(clean);
      this.setSessionToken(data.sessionToken);
      this.authenticated = true;
      this.userId = data.userId || 'owner';
      if (data.quota) this.saveQuotaMirror(data.quota);
      this.notifyAuthChange();
      return data;
    },

    async signOut() {
      const workerUrl = this.getWorkerUrl();
      const token = this.getSessionToken();
      if (workerUrl && token) {
        try {
          await fetch(`${workerUrl}/auth/signout`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
          });
        } catch {}
      }
      this.authenticated = false;
      this.userId = '';
      this.setSessionToken('');
      this.notifyAuthChange();
      storage.showToast('Signed out of OMNIA Intelligence.', 'info');
    },

    async disconnectWorker() {
      await this.signOut();
      this.setWorkerUrl('');
      this.workerHealth = null;
      this.quota = null;
      this.connectionVerified = false;
      this.notifyAuthChange();
      storage.showToast('Disconnected your personal Cloudflare Worker.', 'info');
    },

    goToStep(step) {
      const clamped = Math.max(1, Math.min(TOTAL_STEPS, step));
      this.currentStep = clamped;

      for (let i = 1; i <= TOTAL_STEPS; i++) {
        const panel = document.getElementById(`cf-wizard-step-${i}`);
        if (panel) panel.classList.toggle('hidden', i !== clamped);
      }

      const progressBar = document.getElementById('cf-wizard-bar');
      if (progressBar) progressBar.style.width = `${(clamped / TOTAL_STEPS) * 100}%`;

      const titles = {
        1: 'Step 1 of 4 — Welcome to OMNIA Intelligence',
        2: 'Step 2 of 4 — Create Your Free Cloudflare Helper',
        3: 'Step 3 of 4 — Paste Your Link & Test Connection',
        4: 'Step 4 of 4 — Sign In & Choose Your AI Model'
      };
      const stepLabel = document.getElementById('cf-wizard-progress');
      if (stepLabel) stepLabel.textContent = titles[clamped] || titles[1];

      const backBtn = document.getElementById('cf-wizard-back-btn');
      const nextBtn = document.getElementById('cf-wizard-next-btn');
      const finishBtn = document.getElementById('gemini-key-save-btn');

      if (backBtn) backBtn.classList.toggle('hidden', clamped === 1);
      if (nextBtn) {
        nextBtn.classList.toggle('hidden', clamped === TOTAL_STEPS);
        nextBtn.textContent = clamped === 1 ? 'Get Started →' : clamped === 2 ? 'I Have My Link →' : 'Continue to Sign In →';
      }
      if (finishBtn) finishBtn.classList.toggle('hidden', clamped !== TOTAL_STEPS);
    },

    openModal() {
      const modal = document.getElementById('gemini-key-modal');
      if (!modal) return;

      const urlInput = document.getElementById('cf-worker-url-input');
      const modelSelect = document.getElementById('cf-model-select');
      const passInput = document.getElementById('cf-worker-passcode-input');
      const statusBox = document.getElementById('cf-test-status');
      const signInStatus = document.getElementById('cf-signin-status');

      const savedUrl = this.getWorkerUrl();
      if (urlInput) urlInput.value = savedUrl;
      if (modelSelect) {
        try { modelSelect.value = localStorage.getItem(MODEL_KEY) || DEFAULT_TEXT_MODEL; } catch {}
      }
      if (passInput) passInput.value = '';
      if (statusBox) statusBox.textContent = '';
      if (signInStatus) signInStatus.textContent = '';

      // Jump straight to Step 4 if already signed in, Step 3 if URL is already saved, else Step 1
      const initialStep = this.isAuthenticated() ? 4 : (savedUrl ? 3 : 1);
      this.goToStep(initialStep);
      modal.classList.remove('hidden');
    },

    closeModal() {
      const modal = document.getElementById('gemini-key-modal');
      if (modal) modal.classList.add('hidden');
    },

    bindSetupModal() {
      const openBtn = document.getElementById('assistant-api-key-btn');
      const modal = document.getElementById('gemini-key-modal');
      const closeBtn = document.getElementById('gemini-modal-close');
      const cancelBtn = document.getElementById('gemini-modal-cancel');
      const backBtn = document.getElementById('cf-wizard-back-btn');
      const nextBtn = document.getElementById('cf-wizard-next-btn');
      const saveSignInBtn = document.getElementById('gemini-key-save-btn');
      const disconnectBtn = document.getElementById('gemini-key-clear-btn');
      const testBtn = document.getElementById('cf-test-conn-btn');
      const signOutBtn = document.getElementById('cf-signout-btn');
      const copyCmdBtn = document.getElementById('cf-copy-deploy-cmd');

      openBtn?.addEventListener('click', () => this.openModal());
      closeBtn?.addEventListener('click', () => this.closeModal());
      cancelBtn?.addEventListener('click', () => this.closeModal());

      backBtn?.addEventListener('click', () => this.goToStep(this.currentStep - 1));

      nextBtn?.addEventListener('click', async () => {
        if (this.currentStep === 3) {
          const urlVal = (document.getElementById('cf-worker-url-input')?.value || '').trim();
          const statusBox = document.getElementById('cf-test-status');
          if (!this.isValidWorkerUrl(urlVal)) {
            if (statusBox) statusBox.innerHTML = '<span class="text-amber-300">Please paste your valid https://...workers.dev link before continuing.</span>';
            return;
          }
          if (!this.connectionVerified) {
            if (statusBox) statusBox.innerHTML = '<span class="text-indigo-300 animate-pulse">Testing your Worker link before continuing...</span>';
            try {
              await this.checkWorkerHealth(urlVal);
              if (statusBox) statusBox.innerHTML = '<span class="text-emerald-400 font-semibold">✓ Connection verified!</span>';
            } catch (err) {
              if (statusBox) statusBox.innerHTML = `<span class="text-rose-400 font-medium">${escapeHtml(err.message || 'Connection test failed.')}</span>`;
              return;
            }
          }
        }
        this.goToStep(this.currentStep + 1);
      });

      document.getElementById('cf-worker-url-input')?.addEventListener('input', () => {
        this.connectionVerified = false;
      });

      modal?.addEventListener('click', (e) => {
        if (e.target === modal) this.closeModal();
      });

      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal && !modal.classList.contains('hidden')) {
          this.closeModal();
        }
      });

      copyCmdBtn?.addEventListener('click', async () => {
        const cmd = 'cd cloudflare-worker && npx wrangler login && npx wrangler deploy && npx wrangler secret put ACCESS_PASSCODE';
        try {
          await navigator.clipboard.writeText(cmd);
          storage.showToast('Copied deployment commands.', 'success');
        } catch {
          storage.showToast('Copy blocked; copy the command manually.', 'warning');
        }
      });

      testBtn?.addEventListener('click', async () => {
        const urlVal = (document.getElementById('cf-worker-url-input')?.value || '').trim();
        const statusBox = document.getElementById('cf-test-status');
        if (statusBox) statusBox.innerHTML = '<span class="text-indigo-400 animate-pulse">Checking your Cloudflare Worker...</span>';
        try {
          const health = await this.checkWorkerHealth(urlVal);
          const quotaNote = health.quotaEnforced ? `Daily limit: ${health.dailyLimit} messages/day` : 'Usage tracked in your Cloudflare account';
          if (statusBox) {
            statusBox.innerHTML = `<span class="text-emerald-400 font-semibold">✓ Connected! Your Worker is online and AI is ready (${escapeHtml(quotaNote)}). Click "Continue to Sign In →".</span>`;
          }
        } catch (err) {
          if (statusBox) statusBox.innerHTML = `<span class="text-rose-400 font-medium">${escapeHtml(err.message || 'Connection test failed.')}</span>`;
        }
      });

      saveSignInBtn?.addEventListener('click', async () => {
        const urlVal = (document.getElementById('cf-worker-url-input')?.value || '').trim();
        const passVal = (document.getElementById('cf-worker-passcode-input')?.value || '').trim();
        const modelVal = document.getElementById('cf-model-select')?.value || DEFAULT_TEXT_MODEL;
        const signInStatus = document.getElementById('cf-signin-status');

        try { localStorage.setItem(MODEL_KEY, modelVal); } catch {}

        if (this.isAuthenticated() && urlVal.replace(/\/+$/, '') === this.getWorkerUrl() && !passVal) {
          this.notifyAuthChange();
          storage.showToast('AI model preference updated.', 'success');
          this.closeModal();
          return;
        }

        if (signInStatus) signInStatus.innerHTML = '<span class="text-indigo-400 animate-pulse">Verifying your passcode with your Worker...</span>';
        try {
          await this.checkWorkerHealth(urlVal);
          await this.signIn(urlVal, passVal);
          storage.showToast('You are signed in! OMNIA Intelligence is ready.', 'success');
          this.closeModal();
        } catch (err) {
          if (signInStatus) signInStatus.innerHTML = `<span class="text-rose-400 font-medium">${escapeHtml(err.message || 'Sign-in failed.')}</span>`;
        }
      });

      signOutBtn?.addEventListener('click', async () => {
        await this.signOut();
        this.closeModal();
      });

      disconnectBtn?.addEventListener('click', async () => {
        await this.disconnectWorker();
        this.closeModal();
      });
    }
  };

  window.Omnia.assistantAuth = AssistantAuthModule;
})();
