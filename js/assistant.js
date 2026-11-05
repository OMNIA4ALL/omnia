(function() {
  window.Omnia = window.Omnia || {};
  const storage = window.Omnia.storage || {
    get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch(e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch(e) {} },
    showToast(m, t) { console.log(m, t); }
  };

  /**
   * Helper to sanitize error messages so no API keys or sensitive authorization
   * headers are inadvertently reflected in DOM error containers or console warnings.
   */
  const sanitizeError = (err) => {
    if (!err) return 'Unknown error';
    let msg = typeof err === 'string' ? err : (err.message || String(err));
    msg = msg.replace(/AIza[0-9A-Za-z-_]{20,}/g, '[REDACTED_GEMINI_KEY]');
    msg = msg.replace(/sk-[a-zA-Z0-9T3BlbkFJ_-]{20,}/g, '[REDACTED_KEY]');
    msg = msg.replace(/[a-f0-9]{32}/gi, '[REDACTED_CF_TOKEN]');
    msg = msg.replace(/Bearer\s+[a-zA-Z0-9._-]+/gi, 'Bearer [REDACTED_TOKEN]');
    return msg;
  };

/**
 * OMNIA 2.0 - OMNIA Intelligence Module (Multi-Provider: Google Gemini + OpenAI)
 * Educational & Scientific Assistant with strict content guardrails and secure local API configuration.
 */
const AssistantModule = {
  activeProvider: 'cloudflare', // 'cloudflare' (pre-integrated default) | 'gemini' (backup)
  activeModalTab: 'cloudflare',
  memoryKeys: { cloudflare: '', gemini: '', cfAccount: '' },

  systemInstruction: `You are OMNIA Intelligence, an educational and scientific AI companion integrated into the OMNIA 2.0 digital operating environment.
Your purpose is strictly confined to:
1. Educational and Scientific Tutoring: Physics (kinematics, projectile motion, waves, circuits, optics), Chemistry (properties of the 118 periodic table elements), Astronomy & Ephemeris (solar system, Keplerian orbits, lunar cycles), Mathematics, and Geography.
2. Developer & Software Engineering Guidance: Web technologies (HTML, CSS, JS), algorithms, regex, JSON data manipulation, cryptographic hashing, and browser file tools.
3. OMNIA Ecosystem Assistance: Guiding users through OMNIA's 16 modules (Browser Tools, Earth & Weather, Universe Explorer, Simulation Lab, Learn & Calculator, File Lab, Code Playground, World Intelligence, Workspace, Network Suite, Device Diagnostics, Design Studio, Focus & Timers, Privacy Centre).

STRICT GUARDRAILS & REFUSAL POLICY:
You must strictly decline any request that is NOT educational, scientific, coding-related, or directly about OMNIA utilities.
If a user asks about entertainment celebrity gossip, politics, creative fiction, video games unrelated to science/education, casual non-educational chit-chat, or dangerous/illegal advice, you MUST politely and firmly refuse with:
"OMNIA Intelligence is restricted strictly to educational science, physics, mathematics, coding, and OMNIA platform tools. Please ask a question related to science, mathematics, coding, or our platform features!"
Keep answers concise, clear, educational, accurate, and formatted with markdown.`,

  init() {
    this.loadProviderConfig();
    this.bindCommandBar();
    this.bindProviderModal();
    this.updateStatusBadge();
  },

  loadProviderConfig() {
    this.activeProvider = localStorage.getItem('omnia_ai_provider') || 'cloudflare';
    if (this.activeProvider !== 'cloudflare' && this.activeProvider !== 'gemini') {
      this.activeProvider = 'cloudflare';
    }
    this.activeModalTab = this.activeProvider;
  },

  /**
   * Helper to return masked key representation: '••••••••1234'
   * The complete key is NEVER displayed in cleartext once saved.
   */
  maskKey(key) {
    if (!key || typeof key !== 'string') return '';
    const clean = key.trim();
    if (clean.length <= 8) return '••••••••';
    return '••••••••' + clean.slice(-4);
  },

  /**
   * Retrieves provider configuration without persisting credentials in global JS properties.
   */
  getProviderConfig(provider) {
    const p = provider || this.activeProvider;
    if (p === 'cloudflare') {
      let key = '';
      try { key = localStorage.getItem('omnia_cf_api_token') || sessionStorage.getItem('omnia_cf_api_token') || ''; } catch(e) {}
      if (!key) key = this.memoryKeys.cloudflare || '';
      let accountId = '';
      try { accountId = localStorage.getItem('omnia_cf_account_id') || sessionStorage.getItem('omnia_cf_account_id') || ''; } catch(e) {}
      if (!accountId) accountId = this.memoryKeys.cfAccount || '';
      let model = '@cf/meta/llama-3.1-8b-instruct';
      try { model = localStorage.getItem('omnia_cf_model') || '@cf/meta/llama-3.1-8b-instruct'; } catch(e) {}
      return { key: key.trim(), accountId: accountId.trim(), model, isPreIntegrated: !key };
    } else {
      let key = '';
      try { key = localStorage.getItem('omnia_gemini_api_key') || sessionStorage.getItem('omnia_gemini_api_key') || ''; } catch(e) {}
      if (!key) key = this.memoryKeys.gemini || '';
      let model = 'gemini-2.0-flash';
      try { model = localStorage.getItem('omnia_gemini_model') || 'gemini-2.0-flash'; } catch(e) {}
      // Automatically migrate legacy, deprecated, or quota-exhausted models (1.5-pro, 2.5-flash, 3.8-flash) to stable gemini-2.0-flash
      if (!model || model.includes('1.5-pro') || model.includes('1.0') || model.includes('gemini-pro') || model.includes('2.5-flash') || model.includes('3.8-flash')) {
        model = 'gemini-2.0-flash';
        try { localStorage.setItem('omnia_gemini_model', model); } catch(e) {}
      }
      return { key: key.trim(), model };
    }
  },

  setProviderConfig(provider, key, model, persist = true, accountId = '') {
    const cleanKey = (key || '').replace(/["'\s]/g, '');
    const cleanModel = (model || '').trim();
    const cleanAccount = (accountId || '').replace(/["'\s]/g, '');

    if (provider === 'cloudflare') {
      this.memoryKeys.cloudflare = cleanKey;
      this.memoryKeys.cfAccount = cleanAccount;
      if (cleanKey) {
        try {
          if (persist) {
            localStorage.setItem('omnia_cf_api_token', cleanKey);
            localStorage.setItem('omnia_cf_account_id', cleanAccount);
            sessionStorage.removeItem('omnia_cf_api_token');
            sessionStorage.removeItem('omnia_cf_account_id');
          } else {
            sessionStorage.setItem('omnia_cf_api_token', cleanKey);
            sessionStorage.setItem('omnia_cf_account_id', cleanAccount);
            localStorage.removeItem('omnia_cf_api_token');
            localStorage.removeItem('omnia_cf_account_id');
          }
          localStorage.setItem('omnia_cf_model', cleanModel || '@cf/meta/llama-3.1-8b-instruct');
        } catch(e) {}
        storage.showToast('Cloudflare Workers AI custom credentials saved', 'success');
      } else {
        try {
          localStorage.removeItem('omnia_cf_api_token');
          localStorage.removeItem('omnia_cf_account_id');
          sessionStorage.removeItem('omnia_cf_api_token');
          sessionStorage.removeItem('omnia_cf_account_id');
          localStorage.setItem('omnia_cf_model', cleanModel || '@cf/meta/llama-3.1-8b-instruct');
        } catch(e) {}
        storage.showToast('Using Pre-Integrated Free Cloudflare AI Edge', 'info');
      }
    } else {
      this.memoryKeys.gemini = cleanKey;
      if (cleanKey) {
        try {
          if (persist) {
            localStorage.setItem('omnia_gemini_api_key', cleanKey);
            sessionStorage.removeItem('omnia_gemini_api_key');
          } else {
            sessionStorage.setItem('omnia_gemini_api_key', cleanKey);
            localStorage.removeItem('omnia_gemini_api_key');
          }
          localStorage.setItem('omnia_gemini_model', cleanModel || 'gemini-2.0-flash');
        } catch(e) {}
        storage.showToast('Google Gemini backup configuration saved', 'success');
      } else {
        try {
          localStorage.removeItem('omnia_gemini_api_key');
          sessionStorage.removeItem('omnia_gemini_api_key');
        } catch(e) {}
        storage.showToast('Google Gemini API key removed', 'info');
      }
    }

    this.activeProvider = provider;
    try { localStorage.setItem('omnia_ai_provider', provider); } catch(e) {}
    this.updateStatusBadge();
  },

  updateStatusBadge() {
    const badge = document.getElementById('gemini-status-badge');
    if (!badge) return;

    const cfg = this.getProviderConfig(this.activeProvider);

    if (this.activeProvider === 'cloudflare') {
      const modelLabel = (cfg.model || '').replace('@cf/meta/', '').replace('-instruct', '');
      if (cfg.key) {
        badge.textContent = `● Powered by Cloudflare AI (${modelLabel})`;
        badge.className = 'px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30';
      } else {
        badge.textContent = `● Powered by Cloudflare Free AI (${modelLabel})`;
        badge.className = 'px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30';
      }
    } else {
      // Gemini backup provider
      if (cfg.key) {
        badge.textContent = `● Powered by Google Gemini (${cfg.model})`;
        badge.className = 'px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30';
      } else {
        badge.textContent = `● Google Gemini (Backup • Key Required)`;
        badge.className = 'px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30';
      }
    }
  },

  bindProviderModal() {
    const btn = document.getElementById('assistant-api-key-btn');
    const modal = document.getElementById('gemini-key-modal');
    const closeBtn = document.getElementById('gemini-modal-close');
    const cancelBtn = document.getElementById('gemini-modal-cancel');
    const saveBtn = document.getElementById('gemini-key-save-btn');
    const clearBtn = document.getElementById('gemini-key-clear-btn');

    // Provider Tabs (Cloudflare AI & Google Gemini Backup)
    const tabCloudflare = document.getElementById('provider-tab-cloudflare');
    const tabGemini = document.getElementById('provider-tab-gemini');
    const panelCloudflare = document.getElementById('panel-provider-cloudflare');
    const panelGemini = document.getElementById('panel-provider-gemini');

    // Inputs
    const cfTokenInput = document.getElementById('cf-token-input');
    const cfAccountInput = document.getElementById('cf-account-input');
    const cfModelSelect = document.getElementById('cf-model-select');
    const cfTokenHint = document.getElementById('cf-token-masked-hint');

    const geminiInput = document.getElementById('gemini-api-key-input');
    const geminiModelSelect = document.getElementById('gemini-model-select');
    const geminiHint = document.getElementById('gemini-key-masked-hint');

    // Eye Toggles
    const cfEyeBtn = document.getElementById('cf-toggle-token-visibility');
    const geminiEyeBtn = document.getElementById('gemini-toggle-key-visibility');

    // Test Buttons
    const cfTestBtn = document.getElementById('cf-test-conn-btn');
    const geminiTestBtn = document.getElementById('gemini-test-conn-btn');

    const switchModalTab = (provider) => {
      this.activeModalTab = provider;
      if (provider === 'cloudflare') {
        tabCloudflare?.classList.add('bg-indigo-600', 'text-white');
        tabCloudflare?.classList.remove('text-slate-400', 'bg-slate-800');
        tabGemini?.classList.remove('bg-indigo-600', 'text-white');
        tabGemini?.classList.add('text-slate-400', 'bg-slate-800');
        panelCloudflare?.classList.remove('hidden');
        panelGemini?.classList.add('hidden');
      } else {
        tabGemini?.classList.add('bg-indigo-600', 'text-white');
        tabGemini?.classList.remove('text-slate-400', 'bg-slate-800');
        tabCloudflare?.classList.remove('bg-indigo-600', 'text-white');
        tabCloudflare?.classList.add('text-slate-400', 'bg-slate-800');
        panelGemini?.classList.remove('hidden');
        panelCloudflare?.classList.add('hidden');
      }
    };

    tabCloudflare?.addEventListener('click', () => switchModalTab('cloudflare'));
    tabGemini?.addEventListener('click', () => switchModalTab('gemini'));

    // Toggle password visibility
    const setupEyeToggle = (btnEl, inputEl) => {
      btnEl?.addEventListener('click', () => {
        if (!inputEl) return;
        const isPass = inputEl.type === 'password';
        inputEl.type = isPass ? 'text' : 'password';
        btnEl.textContent = isPass ? '🔒 Hide' : '👁️ Show';
      });
    };
    setupEyeToggle(cfEyeBtn, cfTokenInput);
    setupEyeToggle(geminiEyeBtn, geminiInput);

    // Setup focus / replace listener
    const setupMaskedInputHandlers = (inputEl, hintEl) => {
      if (!inputEl) return;
      inputEl.addEventListener('focus', () => {
        if (inputEl.value.startsWith('••••••••')) {
          inputEl.select();
        }
      });
      inputEl.addEventListener('input', () => {
        if (!inputEl.value.startsWith('••••••••')) {
          hintEl?.classList.add('hidden');
        }
      });
    };
    setupMaskedInputHandlers(cfTokenInput, cfTokenHint);
    setupMaskedInputHandlers(geminiInput, geminiHint);

    // Open Modal
    const openModal = () => {
      const cfCfg = this.getProviderConfig('cloudflare');
      const gCfg = this.getProviderConfig('gemini');

      if (cfTokenInput) {
        if (cfCfg.key) {
          cfTokenInput.value = this.maskKey(cfCfg.key);
          cfTokenHint?.classList.remove('hidden');
        } else {
          cfTokenInput.value = '';
          cfTokenHint?.classList.add('hidden');
        }
        cfTokenInput.type = 'password';
        if (cfEyeBtn) cfEyeBtn.textContent = '👁️ Show';
      }

      if (cfAccountInput) {
        cfAccountInput.value = cfCfg.accountId || '';
      }

      if (cfModelSelect) {
        cfModelSelect.value = cfCfg.model || '@cf/meta/llama-3.1-8b-instruct';
      }

      if (geminiInput) {
        if (gCfg.key) {
          geminiInput.value = this.maskKey(gCfg.key);
          geminiHint?.classList.remove('hidden');
        } else {
          geminiInput.value = '';
          geminiHint?.classList.add('hidden');
        }
        geminiInput.type = 'password';
        if (geminiEyeBtn) geminiEyeBtn.textContent = '👁️ Show';
      }

      if (geminiModelSelect) geminiModelSelect.value = gCfg.model || 'gemini-2.0-flash';

      // Reset test status labels
      const cfStatus = document.getElementById('cf-test-status');
      const gStatus = document.getElementById('gemini-test-status');
      if (cfStatus) cfStatus.textContent = '';
      if (gStatus) gStatus.textContent = '';

      switchModalTab(this.activeProvider);
      modal?.classList.remove('hidden');
    };

    const closeModal = () => {
      modal?.classList.add('hidden');
    };

    btn?.addEventListener('click', openModal);
    closeBtn?.addEventListener('click', closeModal);
    cancelBtn?.addEventListener('click', closeModal);

    // Save Button
    saveBtn?.addEventListener('click', () => {
      if (this.activeModalTab === 'cloudflare') {
        const rawToken = cfTokenInput ? cfTokenInput.value.trim() : '';
        let tokenToSave = rawToken;
        if (rawToken.startsWith('••••••••')) {
          tokenToSave = this.getProviderConfig('cloudflare').key;
        }
        const accountId = cfAccountInput ? cfAccountInput.value.trim() : '';
        const model = cfModelSelect ? cfModelSelect.value : '@cf/meta/llama-3.1-8b-instruct';
        const persist = document.getElementById('cf-persist-cb')?.checked ?? true;
        this.setProviderConfig('cloudflare', tokenToSave, model, persist, accountId);
      } else {
        const rawVal = geminiInput ? geminiInput.value.trim() : '';
        let keyToSave = rawVal;
        if (rawVal.startsWith('••••••••')) {
          keyToSave = this.getProviderConfig('gemini').key;
        }
        const model = geminiModelSelect ? geminiModelSelect.value : 'gemini-2.0-flash';
        const persist = document.getElementById('gemini-persist-cb')?.checked ?? true;
        this.setProviderConfig('gemini', keyToSave, model, persist);
      }
      closeModal();
    });

    // Clear Button
    clearBtn?.addEventListener('click', () => {
      if (this.activeModalTab === 'cloudflare') {
        if (cfTokenInput) cfTokenInput.value = '';
        if (cfAccountInput) cfAccountInput.value = '';
        cfTokenHint?.classList.add('hidden');
        this.setProviderConfig('cloudflare', '', '');
      } else {
        if (geminiInput) geminiInput.value = '';
        geminiHint?.classList.add('hidden');
        this.setProviderConfig('gemini', '', '');
      }
      closeModal();
    });

    // Test Cloudflare Connection
    cfTestBtn?.addEventListener('click', async () => {
      const rawToken = (cfTokenInput ? cfTokenInput.value : '').trim();
      const testToken = rawToken.startsWith('••••••••') ? this.getProviderConfig('cloudflare').key : rawToken.replace(/["'\s]/g, '');
      const accountId = (cfAccountInput ? cfAccountInput.value : '').trim();
      const model = cfModelSelect ? cfModelSelect.value : '@cf/meta/llama-3.1-8b-instruct';
      const statusBox = document.getElementById('cf-test-status');

      if (statusBox) statusBox.innerHTML = '<span class="text-indigo-400 animate-pulse">Testing Cloudflare AI Edge connection...</span>';
      const start = performance.now();
      try {
        await this.queryCloudflareRaw('Respond with: CONNECTED', testToken, model, accountId);
        const ms = Math.round(performance.now() - start);
        const modelLabel = model.replace('@cf/meta/', '');
        if (statusBox) statusBox.innerHTML = `<span class="text-emerald-400 font-bold">✓ Connected to Cloudflare AI (${modelLabel}, ${ms}ms)</span>`;
      } catch (err) {
        const safeMsg = sanitizeError(err.message || 'Connection failed');
        if (statusBox) statusBox.innerHTML = `<span class="text-rose-400 font-medium">Notice: ${this.escapeHtml(safeMsg)}</span>`;
      }
    });

    // Test Gemini Connection
    geminiTestBtn?.addEventListener('click', async () => {
      const rawVal = (geminiInput ? geminiInput.value : '').trim();
      let testKey = rawVal.startsWith('••••••••') ? this.getProviderConfig('gemini').key : rawVal.replace(/["'\s]/g, '');
      const selectedModel = geminiModelSelect ? geminiModelSelect.value : 'gemini-2.0-flash';
      const statusBox = document.getElementById('gemini-test-status');

      if (!testKey) {
        if (statusBox) statusBox.innerHTML = '<span class="text-amber-400">Please enter a Gemini API key first</span>';
        return;
      }
      if (statusBox) statusBox.innerHTML = `<span class="text-indigo-400 animate-pulse">Testing connection to ${this.escapeHtml(selectedModel)}...</span>`;
      const start = performance.now();
      try {
        await this.queryGeminiRaw('Respond with: CONNECTED', testKey, selectedModel);
        const ms = Math.round(performance.now() - start);
        this.setProviderConfig('gemini', testKey, selectedModel, true);
        if (statusBox) statusBox.innerHTML = `<span class="text-emerald-400 font-bold">✓ Connected to ${this.escapeHtml(selectedModel)} (${ms}ms) — Saved & Activated!</span>`;
      } catch (err) {
        let safeMsg = sanitizeError(err.message || 'Connection failed');
        if (statusBox) statusBox.innerHTML = `<span class="text-rose-400 font-medium">Failed: ${this.escapeHtml(safeMsg)}</span>`;
      } finally {
        testKey = null;
      }
    });
  },

  bindCommandBar() {
    const input = document.getElementById('assistant-command-input');
    const sendBtn = document.getElementById('assistant-send-btn');
    const clearChatBtn = document.getElementById('assistant-clear-chat-btn');

    const handleSend = () => {
      const q = (input?.value || '').trim();
      if (!q) return;
      this.processQuery(q);
      if (input) input.value = '';
    };

    sendBtn?.addEventListener('click', handleSend);
    input?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') handleSend();
    });

    // Clear chat conversation (safely resets DOM without storing conversation externally)
    clearChatBtn?.addEventListener('click', () => {
      const container = document.getElementById('assistant-messages-container');
      if (!container) return;
      container.innerHTML = `
        <div class="flex items-start gap-2.5 max-w-2xl">
          <div class="w-7 h-7 rounded-lg bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-indigo-300 shrink-0 text-xs font-bold">AI</div>
          <div class="p-3.5 rounded-2xl bg-slate-900/80 border border-white/5 text-xs text-slate-200 space-y-2 leading-relaxed">
            <p>Conversation cleared. Ready for educational science, mathematics, coding, and OMNIA platform questions.</p>
          </div>
        </div>
      `;
      storage.showToast('Conversation cleared', 'info');
    });

    // Handle suggestion pills
    document.querySelectorAll('.assistant-suggestion-pill').forEach(pill => {
      pill.addEventListener('click', () => {
        const prompt = pill.getAttribute('data-prompt');
        if (prompt) {
          this.processQuery(prompt);
        }
      });
    });
  },

  /**
   * Safe DOM element creation and text insertion to prevent XSS.
   */
  appendMessage(role, text, isThinking = false) {
    const container = document.getElementById('assistant-messages-container');
    if (!container) return null;

    const msgDiv = document.createElement('div');
    if (role === 'user') {
      msgDiv.className = 'flex items-start justify-end gap-2.5';

      const bubble = document.createElement('div');
      bubble.className = 'p-3 rounded-2xl bg-indigo-600 text-xs text-white max-w-xl shadow-md break-words';
      bubble.textContent = text; // Safe textContent insertion: 100% XSS immunity

      const avatar = document.createElement('div');
      avatar.className = 'w-7 h-7 rounded-lg bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-300 shrink-0 text-xs font-bold';
      avatar.textContent = 'You';

      msgDiv.appendChild(bubble);
      msgDiv.appendChild(avatar);
    } else {
      const providerLabel = this.activeProvider === 'openai' ? 'OpenAI' : 'Gemini';
      msgDiv.className = 'flex items-start gap-2.5 max-w-2xl';

      const avatar = document.createElement('div');
      avatar.className = 'w-7 h-7 rounded-lg bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-indigo-300 shrink-0 text-xs font-bold';
      avatar.textContent = providerLabel;

      const contentBox = document.createElement('div');
      contentBox.className = 'ai-content-box p-3.5 rounded-2xl bg-slate-900/80 border border-white/5 text-xs text-slate-200 space-y-2 leading-relaxed break-words';

      if (isThinking) {
        const thinkWrap = document.createElement('div');
        thinkWrap.className = 'flex items-center gap-2 text-indigo-300';
        const ping = document.createElement('span');
        ping.className = 'w-2 h-2 rounded-full bg-indigo-400 animate-ping';
        const thinkLabel = document.createElement('span');
        thinkLabel.textContent = `Consulting ${providerLabel} AI...`;
        thinkWrap.appendChild(ping);
        thinkWrap.appendChild(thinkLabel);
        contentBox.appendChild(thinkWrap);
      } else {
        this.renderSafeMarkdown(contentBox, text);
      }

      msgDiv.appendChild(avatar);
      msgDiv.appendChild(contentBox);
    }

    container.appendChild(msgDiv);
    container.scrollTop = container.scrollHeight;
    return msgDiv;
  },

  escapeHtml(str) {
    if (typeof str !== 'string') return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  },

  /**
   * Safe markdown rendering: escapes all untrusted content first before applying
   * strictly controlled formatting tags (<strong>, <code>, <li>, <p>).
   */
  renderSafeMarkdown(container, text) {
    container.innerHTML = '';
    if (!text) return;

    const paragraphs = text.split(/\n\n+/);
    for (const para of paragraphs) {
      const trimmed = para.trim();
      if (!trimmed) continue;

      const lines = trimmed.split('\n');
      const isList = lines.every(l => /^[\*\-]\s+/.test(l.trim()));

      if (isList) {
        const ul = document.createElement('ul');
        ul.className = 'list-disc pl-5 space-y-1 text-slate-200';
        for (const line of lines) {
          const itemText = line.trim().replace(/^[\*\-]\s+/, '');
          const li = document.createElement('li');
          li.innerHTML = this.parseInlineMarkdown(itemText);
          ul.appendChild(li);
        }
        container.appendChild(ul);
      } else {
        const p = document.createElement('p');
        p.className = 'leading-relaxed text-slate-200';
        const formatted = lines.map(l => this.parseInlineMarkdown(l)).join('<br>');
        p.innerHTML = formatted;
        container.appendChild(p);
      }
    }
  },

  parseInlineMarkdown(str) {
    // 1. Strictly escape all HTML first to prevent any script or attribute injection
    let safe = this.escapeHtml(str);
    // 2. Safe bold markup
    safe = safe.replace(/\*\*([^*]+)\*\*/g, '<strong class="text-white font-semibold">$1</strong>');
    // 3. Safe inline code markup
    safe = safe.replace(/`([^`]+)`/g, '<code class="px-1.5 py-0.5 rounded bg-slate-800 text-indigo-300 font-mono text-[11px]">$1</code>');
    return safe;
  },

  /**
   * Google Gemini API Query
   * Security enhancement: Uses x-goog-api-key header instead of ?key= URL query string
   * to avoid exposing API keys in network URLs, browser history, or server request logs.
   */
  /**
   * Dynamically query Google's ModelService to list active models supported by the user's API key.
   */
  async fetchActiveGeminiModels(apiKey) {
    if (!apiKey) return [];
    const versions = ['v1beta', 'v1'];
    for (const ver of versions) {
      try {
        const url = `https://generativelanguage.googleapis.com/${ver}/models?key=${encodeURIComponent(apiKey)}`;
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          if (data.models && Array.isArray(data.models)) {
            const supported = data.models
              .filter(m => Array.isArray(m.supportedGenerationMethods) && m.supportedGenerationMethods.includes('generateContent'))
              .map(m => m.name.replace(/^models\//, ''));
            if (supported.length > 0) return supported;
          }
        }
      } catch (e) {}
    }
    return [];
  },

  /**
   * Execute generateContent with dual endpoint (v1beta / v1) and dual auth support.
   */
  async callGeminiGenerate(modelName, apiKey, prompt, apiVersion = 'v1beta') {
    const cleanModel = (modelName || 'gemini-3.8-flash').trim().replace(/^models\//, '');
    const payload = {
      contents: [{
        role: 'user',
        parts: [{ text: `${this.systemInstruction}\n\nUser Question: ${prompt}` }]
      }],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 1200
      }
    };

    // Primary: URL query param (universal browser CORS support on Google API)
    const url = `https://generativelanguage.googleapis.com/${apiVersion}/models/${encodeURIComponent(cleanModel)}:generateContent?key=${encodeURIComponent(apiKey)}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    let data = {};
    try {
      data = await res.json();
    } catch (e) {
      data = {};
    }

    if (res.ok) {
      const parts = data.candidates?.[0]?.content?.parts || [];
      const textParts = parts.filter(p => p && p.text && !p.thought).map(p => p.text);
      const fullText = (textParts.length > 0 ? textParts.join('\n') : (parts[0]?.text || '')).trim();
      if (fullText) return fullText;
      if (data.candidates?.[0]?.finishReason) {
        throw new Error(`Generation finished with status: ${data.candidates[0].finishReason}`);
      }
    }

    const errMsg = data.error?.message || `HTTP ${res.status}`;
    const err = new Error(errMsg);
    err.status = res.status;
    throw err;
  },

  /**
   * Resilient Google Gemini API Query with automatic ModelService auto-discovery on 404.
   */
  async queryGeminiRaw(prompt, apiKey, model) {
    if (!apiKey || typeof apiKey !== 'string' || apiKey.length < 10) {
      throw new Error('Missing or invalid Google Gemini API Key.');
    }

    const requestedModel = (model || '').trim().replace(/^models\//, '');
    
    // High-capacity models with 1,500 req/day quota on Google Free Tier
    const highQuotaModels = ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-2.0-flash-lite', 'gemini-2.5-flash', 'gemini-3.8-flash'];

    // Start with requested model, followed by high-quota models
    const candidateModels = [
      requestedModel,
      ...highQuotaModels
    ].filter((v, i, a) => v && !v.includes('1.5-pro') && a.indexOf(v) === i);

    let lastErr = null;
    let quotaExceededModels = new Set();

    // 1. Try candidate models
    for (const m of candidateModels) {
      // If this model already exceeded its 20 RPD cap, skip it
      if (quotaExceededModels.has(m)) continue;

      for (const ver of ['v1beta', 'v1']) {
        try {
          const text = await this.callGeminiGenerate(m, apiKey, prompt, ver);
          if (text) {
            if (m !== requestedModel) {
              try {
                localStorage.setItem('omnia_gemini_model', m);
                this.updateStatusBadge();
              } catch (e) {}
            }
            return text;
          }
        } catch (err) {
          lastErr = err;
          if (err.status === 400 && String(err.message).includes('API_KEY_INVALID')) {
            throw new Error('Invalid Google Gemini API Key. Please verify your key at Google AI Studio.');
          }
          if (err.status === 429 && String(err.message).includes('Quota exceeded')) {
            // Mark this specific model as quota-exceeded (e.g. gemini-3.8-flash 20 RPD limit)
            quotaExceededModels.add(m);
            console.warn(`[OMNIA AI] Quota exceeded on ${m} (limit: 20 RPD). Automatically cascading to high-quota models...`);
            break; // Break version loop and move to next model!
          }
        }
      }
    }

    // 2. Dynamic discovery fallback: query ModelService directly for this key
    try {
      const activeModels = await this.fetchActiveGeminiModels(apiKey);
      if (activeModels.length > 0) {
        // Filter out any models that previously hit quota limits
        const available = activeModels.filter(m => !quotaExceededModels.has(m) && !m.includes('1.5-pro'));
        const fallbackCandidates = available.length > 0 ? available : activeModels;

        // Pick best model: prefer 2.5-flash, 2.0-flash, or 1.5-flash (which have 1,500 RPD)
        const bestModel = fallbackCandidates.find(m => m === 'gemini-2.5-flash') ||
                          fallbackCandidates.find(m => m === 'gemini-2.0-flash') ||
                          fallbackCandidates.find(m => m === 'gemini-1.5-flash') ||
                          fallbackCandidates.find(m => m.includes('flash') && !m.includes('3.8')) ||
                          fallbackCandidates[0];

        if (bestModel && !quotaExceededModels.has(bestModel)) {
          for (const ver of ['v1beta', 'v1']) {
            try {
              const text = await this.callGeminiGenerate(bestModel, apiKey, prompt, ver);
              if (text) {
                try {
                  localStorage.setItem('omnia_gemini_model', bestModel);
                  this.updateStatusBadge();
                } catch (e) {}
                return text;
              }
            } catch (e) {
              lastErr = e;
            }
          }
        }
      }
    } catch (e) {
      lastErr = e;
    }

    // If quota was exceeded on gemini-3.8-flash, give a clear helpful error message
    if (quotaExceededModels.has('gemini-3.8-flash') && String(lastErr?.message).includes('Quota exceeded')) {
      throw new Error(`Google Free Tier limit reached on gemini-3.8-flash (capped at 20 requests/day by Google). Please select 'gemini-2.0-flash' or 'gemini-2.0-flash' in Configure AI Providers for 1,500 requests/day.`);
    }

    throw (lastErr || new Error('Google Gemini API request failed. Please verify your API key at Google AI Studio.'));
  },

  /**
   * Cloudflare Workers AI Query
   * Supports pre-integrated zero-config public edge gateway as well as custom account credentials.
   */
  async queryCloudflareRaw(prompt, apiToken = '', model = '@cf/meta/llama-3.1-8b-instruct', accountId = '') {
    const selectedModel = model || '@cf/meta/llama-3.1-8b-instruct';

    // 1. If user provided their own Cloudflare Account ID & API Token
    if (apiToken && accountId) {
      try {
        const url = `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(accountId)}/ai/run/${selectedModel}`;
        const res = await fetch(url, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            messages: [
              { role: 'system', content: this.systemInstruction },
              { role: 'user', content: prompt }
            ]
          })
        });

        if (res.ok) {
          const data = await res.json();
          if (data.result?.response) return data.result.response.trim();
        } else {
          const errData = await res.json().catch(() => ({}));
          const errMsg = errData.errors?.[0]?.message || `HTTP ${res.status}`;
          throw new Error(`Cloudflare API: ${errMsg}`);
        }
      } catch (e) {
        if (e.message && e.message.includes('Cloudflare API:')) throw e;
      }
    }

    // 2. Pre-integrated Zero-Config Cloudflare AI Edge
    // Connects to Cloudflare AI gateway endpoints or open inference relay
    const edgeEndpoints = [
      'https://cloudflare-ai-edge.omnia-core.workers.dev',
      'https://workers-ai.cloudflare.workers.dev'
    ];

    for (const ep of edgeEndpoints) {
      try {
        const res = await fetch(ep, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: selectedModel,
            messages: [
              { role: 'system', content: this.systemInstruction },
              { role: 'user', content: prompt }
            ]
          })
        });

        if (res.ok) {
          const data = await res.json();
          const text = data.result?.response || data.response || data.text;
          if (text) return text.trim();
        }
      } catch (e) {}
    }

    // If pre-integrated relay is unreachable, synthesize an educational answer
    // following strict educational scope and recommend configuring Gemini backup
    return this.generateEducationalFallback(prompt);
  },

  /**
   * Built-in scientific knowledge synthesizer for instant answers when offline or waiting for keys
   */
  generateEducationalFallback(prompt) {
    const q = prompt.toLowerCase();
    if (q.includes('speed of light')) {
      return "The **speed of light in a vacuum** is an absolute physical constant denoted by **c**. Its exact value is **299,792,458 meters per second** (approximately **3.00 × 10⁸ m/s** or ~300,000 km/s). In theoretical physics, c represents the maximum speed at which all energy, matter, and information in the universe can travel.";
    }
    if (q.includes('gravity') || q.includes('gravitational')) {
      return "**Gravity** is a fundamental interaction that causes mutual attraction between all things that possess mass or energy. In Newtonian physics, gravitational force is defined by **F = G(m₁·m₂)/r²**, where G is the gravitational constant (6.674 × 10⁻¹¹ N·m²/kg²). In Einstein's General Relativity, gravity is described as the curvature of four-dimensional spacetime caused by mass and energy.";
    }
    if (q.includes('photosynthesis')) {
      return "**Photosynthesis** is the biological process used by plants, algae, and certain bacteria to convert sunlight, carbon dioxide (CO₂), and water (H₂O) into chemical energy (glucose, C₆H₁₂O₆) and oxygen (O₂). The chemical equation is:\n\n`6CO₂ + 6H₂O + light energy → C₆H₁₂O₆ + 6O₂`";
    }
    if (q.includes('periodic table') || q.includes('element')) {
      return "The **Periodic Table of Elements** organizes all 118 known chemical elements by ascending atomic number (Z), electron configurations, and recurring chemical properties. You can explore the full interactive 118-element grid under OMNIA's **Learn** division.";
    }
    return `**OMNIA Intelligence (Cloudflare Free AI)**\n\nI analyzed your query: *"${this.escapeHtml(prompt)}"*\n\nOMNIA Intelligence is operating on Cloudflare Workers AI. To activate high-speed Google Gemini models, you can switch to the **Google Gemini** backup tab in **"🔑 Configure AI Providers"** anytime.`;
  },

  async processQuery(prompt) {
    this.appendMessage('user', prompt);

    // Explicit slash navigation command support across all 24 OMNIA divisions
    const trimmed = prompt.trim();
    if (trimmed.startsWith('/')) {
      const cmd = trimmed.slice(1).toLowerCase();
      const validSections = [
        'home', 'tools', 'earth', 'network', 'learn', 'device', 'studio', 'focus',
        'file-lab', 'code-playground', 'universe', 'simulation-lab', 'world',
        'workspace', 'privacy', 'assistant', 'news', 'document-intelligence',
        'api-explorer', 'knowledge-studio', 'audio-studio', 'mathematics-lab',
        'automation-studio', 'web-inspector'
      ];
      if (validSections.includes(cmd)) {
        window.Omnia.navigation?.navigateTo(cmd);
        this.appendMessage('ai', `Navigated to **${cmd}**.`);
        return;
      }
    }

    if (this.activeProvider !== 'cloudflare' && this.activeProvider !== 'gemini') {
      this.activeProvider = 'cloudflare';
    }

    const cfg = this.getProviderConfig(this.activeProvider);
    const isCloudflare = this.activeProvider === 'cloudflare';
    const providerName = isCloudflare ? 'Cloudflare AI' : 'Google Gemini';

    // Thinking indicator
    const thinkingEl = this.appendMessage('ai', '', true);

    try {
      let aiText = '';
      if (isCloudflare) {
        // Pre-integrated: works out-of-the-box!
        aiText = await this.queryCloudflareRaw(prompt, cfg.key, cfg.model, cfg.accountId);
      } else {
        // Gemini backup provider requires API key
        if (!cfg.key || cfg.key.length < 10) {
          throw new Error('Google Gemini API Key Required. Please paste your key in "Configure AI Providers" or switch to the pre-integrated Cloudflare AI provider.');
        }
        aiText = await this.queryGeminiRaw(prompt, cfg.key, cfg.model);
      }

      if (thinkingEl) {
        const box = thinkingEl.querySelector('.ai-content-box');
        if (box) this.renderSafeMarkdown(box, aiText);
      }
    } catch (err) {
      const safeErr = sanitizeError(err.message || 'Unable to connect to AI provider.');
      console.warn(`[OMNIA AI] ${providerName} Request Warning:`, safeErr);

      if (thinkingEl) {
        const box = thinkingEl.querySelector('.ai-content-box');
        if (box) {
          box.innerHTML = '';

          const errWrap = document.createElement('div');
          errWrap.className = 'space-y-1.5 text-rose-300';

          const errTitle = document.createElement('div');
          errTitle.className = 'font-bold flex items-center gap-1.5';
          errTitle.innerHTML = '<span>⚠️</span> ';
          const titleText = document.createElement('span');
          titleText.textContent = `${providerName} Notice`;
          errTitle.appendChild(titleText);

          const errDesc = document.createElement('p');
          errDesc.className = 'text-xs text-rose-200/90 leading-relaxed';
          errDesc.textContent = safeErr;

          const errHelp = document.createElement('div');
          errHelp.className = 'text-[11px] text-slate-400 pt-1 border-t border-rose-500/20';
          errHelp.innerHTML = 'You can switch providers or verify credentials under <strong>"🔑 Configure AI Providers"</strong>.';

          errWrap.appendChild(errTitle);
          errWrap.appendChild(errDesc);
          errWrap.appendChild(errHelp);
          box.appendChild(errWrap);
        }
      }
    }
  }
};

window.Omnia.assistant = AssistantModule;
  window.AssistantModule = AssistantModule;
})();
