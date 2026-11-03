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
    msg = msg.replace(/sk-[a-zA-Z0-9T3BlbkFJ_-]{20,}/g, '[REDACTED_OPENAI_KEY]');
    msg = msg.replace(/Bearer\s+[a-zA-Z0-9._-]+/gi, 'Bearer [REDACTED_TOKEN]');
    return msg;
  };

/**
 * OMNIA 2.0 - OMNIA Intelligence Module (Multi-Provider: Google Gemini + OpenAI)
 * Educational & Scientific Assistant with strict content guardrails and secure local API configuration.
 */
const AssistantModule = {
  activeProvider: 'gemini', // 'gemini' | 'openai'
  activeModalTab: 'gemini',

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
    this.activeProvider = localStorage.getItem('omnia_ai_provider') || 'gemini';
    if (this.activeProvider !== 'gemini' && this.activeProvider !== 'openai') {
      this.activeProvider = 'gemini';
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
    if (p === 'openai') {
      const key = localStorage.getItem('omnia_openai_api_key') || sessionStorage.getItem('omnia_openai_api_key') || '';
      const model = localStorage.getItem('omnia_openai_model') || 'gpt-6.1-sol';
      return { key: key.trim(), model };
    } else {
      const key = localStorage.getItem('omnia_gemini_api_key') || sessionStorage.getItem('omnia_gemini_api_key') || '';
      const model = localStorage.getItem('omnia_gemini_model') || 'gemini-3.8-flash';
      return { key: key.trim(), model };
    }
  },

  setProviderConfig(provider, key, model, persist = true) {
    const cleanKey = (key || '').replace(/["'\s]/g, '');
    const cleanModel = (model || '').trim();

    if (provider === 'openai') {
      if (cleanKey) {
        if (persist) {
          localStorage.setItem('omnia_openai_api_key', cleanKey);
          sessionStorage.removeItem('omnia_openai_api_key');
        } else {
          sessionStorage.setItem('omnia_openai_api_key', cleanKey);
          localStorage.removeItem('omnia_openai_api_key');
        }
        localStorage.setItem('omnia_openai_model', cleanModel || 'gpt-6.1-sol');
        storage.showToast('OpenAI API configuration saved securely', 'success');
      } else {
        localStorage.removeItem('omnia_openai_api_key');
        sessionStorage.removeItem('omnia_openai_api_key');
        storage.showToast('OpenAI API key removed', 'info');
      }
    } else {
      if (cleanKey) {
        if (persist) {
          localStorage.setItem('omnia_gemini_api_key', cleanKey);
          sessionStorage.removeItem('omnia_gemini_api_key');
        } else {
          sessionStorage.setItem('omnia_gemini_api_key', cleanKey);
          localStorage.removeItem('omnia_gemini_api_key');
        }
        localStorage.setItem('omnia_gemini_model', cleanModel || 'gemini-3.8-flash');
        storage.showToast('Google Gemini configuration saved securely', 'success');
      } else {
        localStorage.removeItem('omnia_gemini_api_key');
        sessionStorage.removeItem('omnia_gemini_api_key');
        storage.showToast('Google Gemini API key removed', 'info');
      }
    }

    this.activeProvider = provider;
    localStorage.setItem('omnia_ai_provider', provider);
    this.updateStatusBadge();
  },

  updateStatusBadge() {
    const badge = document.getElementById('gemini-status-badge');
    if (!badge) return;

    const cfg = this.getProviderConfig(this.activeProvider);
    const providerName = this.activeProvider === 'openai' ? 'OpenAI' : 'Google Gemini';

    if (cfg.key) {
      badge.textContent = `● Powered by ${providerName} (${cfg.model})`;
      badge.className = 'px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30';
    } else {
      badge.textContent = `● ${providerName} (Key Required)`;
      badge.className = 'px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30';
    }
  },

  bindProviderModal() {
    const btn = document.getElementById('assistant-api-key-btn');
    const modal = document.getElementById('gemini-key-modal');
    const closeBtn = document.getElementById('gemini-modal-close');
    const cancelBtn = document.getElementById('gemini-modal-cancel');
    const saveBtn = document.getElementById('gemini-key-save-btn');
    const clearBtn = document.getElementById('gemini-key-clear-btn');

    // Provider Tabs
    const tabGemini = document.getElementById('provider-tab-gemini');
    const tabOpenAI = document.getElementById('provider-tab-openai');
    const panelGemini = document.getElementById('panel-provider-gemini');
    const panelOpenAI = document.getElementById('panel-provider-openai');

    // Key Inputs
    const geminiInput = document.getElementById('gemini-api-key-input');
    const openaiInput = document.getElementById('openai-api-key-input');
    const geminiModelSelect = document.getElementById('gemini-model-select');
    const openaiModelSelect = document.getElementById('openai-model-select');
    const geminiHint = document.getElementById('gemini-key-masked-hint');
    const openaiHint = document.getElementById('openai-key-masked-hint');

    // Show/Hide Toggles
    const geminiEyeBtn = document.getElementById('gemini-toggle-key-visibility');
    const openaiEyeBtn = document.getElementById('openai-toggle-key-visibility');

    // Test Connection Buttons
    const geminiTestBtn = document.getElementById('gemini-test-conn-btn');
    const openaiTestBtn = document.getElementById('openai-test-conn-btn');

    const switchModalTab = (provider) => {
      this.activeModalTab = provider;
      if (provider === 'openai') {
        tabOpenAI?.classList.add('bg-indigo-600', 'text-white');
        tabOpenAI?.classList.remove('text-slate-400', 'bg-slate-800');
        tabGemini?.classList.remove('bg-indigo-600', 'text-white');
        tabGemini?.classList.add('text-slate-400', 'bg-slate-800');
        panelOpenAI?.classList.remove('hidden');
        panelGemini?.classList.add('hidden');
      } else {
        tabGemini?.classList.add('bg-indigo-600', 'text-white');
        tabGemini?.classList.remove('text-slate-400', 'bg-slate-800');
        tabOpenAI?.classList.remove('bg-indigo-600', 'text-white');
        tabOpenAI?.classList.add('text-slate-400', 'bg-slate-800');
        panelGemini?.classList.remove('hidden');
        panelOpenAI?.classList.add('hidden');
      }
    };

    tabGemini?.addEventListener('click', () => switchModalTab('gemini'));
    tabOpenAI?.addEventListener('click', () => switchModalTab('openai'));

    // Toggle password visibility (safely toggles password/text; never exposes unmasked saved key)
    const setupEyeToggle = (btnEl, inputEl) => {
      btnEl?.addEventListener('click', () => {
        if (!inputEl) return;
        const isPass = inputEl.type === 'password';
        inputEl.type = isPass ? 'text' : 'password';
        btnEl.textContent = isPass ? '🔒 Hide' : '👁️ Show';
      });
    };
    setupEyeToggle(geminiEyeBtn, geminiInput);
    setupEyeToggle(openaiEyeBtn, openaiInput);

    // Setup focus / replace listener for inputs displaying masked key
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
    setupMaskedInputHandlers(geminiInput, geminiHint);
    setupMaskedInputHandlers(openaiInput, openaiHint);

    // Open Modal
    const openModal = () => {
      const gCfg = this.getProviderConfig('gemini');
      const oCfg = this.getProviderConfig('openai');

      // Display only masked key for existing keys; never reveal full key
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

      if (openaiInput) {
        if (oCfg.key) {
          openaiInput.value = this.maskKey(oCfg.key);
          openaiHint?.classList.remove('hidden');
        } else {
          openaiInput.value = '';
          openaiHint?.classList.add('hidden');
        }
        openaiInput.type = 'password';
        if (openaiEyeBtn) openaiEyeBtn.textContent = '👁️ Show';
      }

      if (geminiModelSelect) geminiModelSelect.value = gCfg.model;
      if (openaiModelSelect) openaiModelSelect.value = oCfg.model;

      // Reset test status labels
      const gStatus = document.getElementById('gemini-test-status');
      const oStatus = document.getElementById('openai-test-status');
      if (gStatus) gStatus.textContent = '';
      if (oStatus) oStatus.textContent = '';

      switchModalTab(this.activeProvider);
      modal?.classList.remove('hidden');
    };

    const closeModal = () => {
      modal?.classList.add('hidden');
    };

    btn?.addEventListener('click', openModal);
    closeBtn?.addEventListener('click', closeModal);
    cancelBtn?.addEventListener('click', closeModal);

    // Save
    saveBtn?.addEventListener('click', () => {
      if (this.activeModalTab === 'openai') {
        const rawVal = openaiInput ? openaiInput.value.trim() : '';
        let keyToSave = rawVal;
        // If unchanged mask, preserve existing key
        if (rawVal.startsWith('••••••••')) {
          keyToSave = this.getProviderConfig('openai').key;
        }
        const model = openaiModelSelect ? openaiModelSelect.value : 'gpt-6.1-sol';
        const persist = document.getElementById('openai-persist-cb')?.checked ?? true;
        this.setProviderConfig('openai', keyToSave, model, persist);
      } else {
        const rawVal = geminiInput ? geminiInput.value.trim() : '';
        let keyToSave = rawVal;
        // If unchanged mask, preserve existing key
        if (rawVal.startsWith('••••••••')) {
          keyToSave = this.getProviderConfig('gemini').key;
        }
        const model = geminiModelSelect ? geminiModelSelect.value : 'gemini-3.8-flash';
        const persist = document.getElementById('gemini-persist-cb')?.checked ?? true;
        this.setProviderConfig('gemini', keyToSave, model, persist);
      }
      closeModal();
    });

    // Remove / Clear key option
    clearBtn?.addEventListener('click', () => {
      if (this.activeModalTab === 'openai') {
        if (openaiInput) openaiInput.value = '';
        openaiHint?.classList.add('hidden');
        this.setProviderConfig('openai', '', '');
      } else {
        if (geminiInput) geminiInput.value = '';
        geminiHint?.classList.add('hidden');
        this.setProviderConfig('gemini', '', '');
      }
      closeModal();
    });

    // Test Connections
    geminiTestBtn?.addEventListener('click', async () => {
      const rawVal = (geminiInput ? geminiInput.value : '').trim();
      let testKey = rawVal.startsWith('••••••••') ? this.getProviderConfig('gemini').key : rawVal.replace(/["'\s]/g, '');
      const model = geminiModelSelect ? geminiModelSelect.value : 'gemini-3.8-flash';
      const statusBox = document.getElementById('gemini-test-status');

      if (!testKey) {
        if (statusBox) statusBox.innerHTML = '<span class="text-amber-400">Please enter a Gemini API key first</span>';
        return;
      }
      if (statusBox) statusBox.innerHTML = '<span class="text-indigo-400 animate-pulse">Testing Gemini connection...</span>';
      const start = performance.now();
      try {
        await this.queryGeminiRaw('Respond with: CONNECTED', testKey, model);
        const ms = Math.round(performance.now() - start);
        if (statusBox) statusBox.innerHTML = `<span class="text-emerald-400 font-bold">✓ Connected to ${this.escapeHtml(model)} (${ms}ms)</span>`;
      } catch (err) {
        const safeMsg = sanitizeError(err.message || 'Connection failed');
        if (statusBox) statusBox.innerHTML = `<span class="text-rose-400 font-medium">Failed: ${this.escapeHtml(safeMsg)}</span>`;
      } finally {
        testKey = null; // Clear local reference
      }
    });

    openaiTestBtn?.addEventListener('click', async () => {
      const rawVal = (openaiInput ? openaiInput.value : '').trim();
      let testKey = rawVal.startsWith('••••••••') ? this.getProviderConfig('openai').key : rawVal.replace(/["'\s]/g, '');
      const model = openaiModelSelect ? openaiModelSelect.value : 'gpt-6.1-sol';
      const statusBox = document.getElementById('openai-test-status');

      if (!testKey) {
        if (statusBox) statusBox.innerHTML = '<span class="text-amber-400">Please enter an OpenAI API key first</span>';
        return;
      }
      if (statusBox) statusBox.innerHTML = '<span class="text-indigo-400 animate-pulse">Testing OpenAI connection...</span>';
      const start = performance.now();
      try {
        await this.queryOpenAiRaw('Respond with: CONNECTED', testKey, model);
        const ms = Math.round(performance.now() - start);
        if (statusBox) statusBox.innerHTML = `<span class="text-emerald-400 font-bold">✓ Connected to ${this.escapeHtml(model)} (${ms}ms)</span>`;
      } catch (err) {
        const safeMsg = sanitizeError(err.message || 'Connection failed');
        if (statusBox) statusBox.innerHTML = `<span class="text-rose-400 font-medium">Failed: ${this.escapeHtml(safeMsg)}</span>`;
      } finally {
        testKey = null; // Clear local reference
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
  async queryGeminiRaw(prompt, apiKey, model) {
    if (!apiKey || typeof apiKey !== 'string' || apiKey.length < 10) {
      throw new Error('Missing or invalid Google Gemini API Key.');
    }

    // Ensure reliable active models are prioritized so experimental identifiers never block the user
    const requestedModel = (model || '').trim();
    // Active Google AI Studio models; retired models (like gemini-1.5-pro) are smoothly upgraded
    const candidateModels = [
      requestedModel,
      'gemini-3.8-flash',
      'gemini-2.5-flash',
      'gemini-2.5-pro',
      'gemini-2.0-flash',
      'gemini-1.5-flash'
    ].filter((v, i, a) => v && a.indexOf(v) === i);

    let lastErr = null;

    for (const m of candidateModels) {
      try {
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

        let res = null;
        // Attempt 1: Header-based authentication (secure, keeps key out of URL logs)
        try {
          const headerUrl = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(m)}:generateContent`;
          res = await fetch(headerUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-goog-api-key': apiKey
            },
            body: JSON.stringify(payload)
          });
        } catch (corsHeaderErr) {
          // Attempt 2: Fallback to URL query parameter if browser CORS preflight blocks custom header
          const fallbackUrl = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(m)}:generateContent?key=${encodeURIComponent(apiKey)}`;
          res = await fetch(fallbackUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
        }

        if (res && res.ok) {
          const data = await res.json();
          const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
          if (text) {
            // If requested model was retired and we fell back to an active model, persist the working model
            if (m !== requestedModel && (m === 'gemini-2.5-flash' || m === 'gemini-2.5-pro')) {
              localStorage.setItem('omnia_gemini_model', m);
              this.updateStatusBadge();
            }
            return text;
          }
        } else if (res) {
          const errData = await res.json().catch(() => ({}));
          const errMsg = errData.error?.message || `HTTP ${res.status}`;
          lastErr = new Error(errMsg);
          if (res.status === 400 && errMsg.includes('API_KEY_INVALID')) {
            throw new Error('Invalid Google Gemini API Key. Please verify your key at Google AI Studio.');
          }
          // If model is not found (404), loop continues to next candidate
        }
      } catch (e) {
        lastErr = e;
        if (e.message && e.message.includes('Invalid Google Gemini API Key')) throw e;
      }
    }
    throw (lastErr || new Error('Google Gemini API request failed.'));
  },

  async queryOpenAiRaw(prompt, apiKey, model) {
    if (!apiKey || typeof apiKey !== 'string' || apiKey.length < 10) {
      throw new Error('Missing or invalid OpenAI API Key.');
    }

    const selectedModel = model || 'gpt-4o-mini';

    // 1. Primary: Official OpenAI Responses API (/v1/responses)
    try {
      const url = 'https://api.openai.com/v1/responses';
      const payload = {
        model: selectedModel,
        input: prompt,
        instructions: this.systemInstruction
      };

      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const data = await res.json();
        if (data.output_text) return data.output_text.trim();
        if (data.output?.[0]?.content?.[0]?.text) return data.output[0].content[0].text.trim();
        if (data.response?.text) return data.response.text.trim();
      } else {
        const errData = await res.json().catch(() => ({}));
        const errMsg = errData.error?.message || `HTTP ${res.status}`;
        if (res.status === 401) {
          throw new Error('Invalid OpenAI API Key. Please verify your key at platform.openai.com.');
        }
        if (res.status === 429 && errMsg.includes('quota')) {
          throw new Error('OpenAI Quota Exceeded. Insufficient credits on your account.');
        }
      }
    } catch (e) {
      if (e.name === 'TypeError' && String(e.message).includes('fetch')) {
        throw new Error("OpenAI API blocks direct browser requests via CORS ('No Access-Control-Allow-Origin'). For direct in-browser AI on GitHub Pages, please switch to Google Gemini (which fully supports browser requests) or route OpenAI through a backend proxy.");
      }
      if (e.message && (e.message.includes('Invalid OpenAI API Key') || e.message.includes('OpenAI Quota Exceeded') || e.message.includes('CORS'))) {
        throw e;
      }
    }

    // 2. Fallback: OpenAI Chat Completions API (/v1/chat/completions)
    const chatUrl = 'https://api.openai.com/v1/chat/completions';
    const chatPayload = {
      model: selectedModel,
      messages: [
        { role: 'system', content: this.systemInstruction },
        { role: 'user', content: prompt }
      ],
      temperature: 0.3,
      max_tokens: 1200
    };

    try {
      const chatRes = await fetch(chatUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify(chatPayload)
      });

      if (chatRes.ok) {
        const chatData = await chatRes.json();
        const content = chatData.choices?.[0]?.message?.content?.trim();
        if (content) return content;
      }

      const finalErr = await chatRes.json().catch(() => ({}));
      throw new Error(finalErr.error?.message || `OpenAI API Error: HTTP ${chatRes.status}`);
    } catch (e) {
      if (e.name === 'TypeError' && String(e.message).includes('fetch')) {
        throw new Error("OpenAI API blocks direct browser requests via CORS ('No Access-Control-Allow-Origin'). For direct in-browser AI on GitHub Pages, please switch to Google Gemini (which fully supports browser requests) or route OpenAI through a backend proxy.");
      }
      throw e;
    }
  },

  async processQuery(prompt) {
    this.appendMessage('user', prompt);

    // Explicit slash navigation command support
    const trimmed = prompt.trim();
    if (trimmed.startsWith('/')) {
      const cmd = trimmed.slice(1).toLowerCase();
      const validSections = ['home', 'tools', 'earth', 'universe', 'simulation-lab', 'learn', 'file-lab', 'code-playground', 'world', 'workspace', 'network', 'device', 'studio', 'focus', 'privacy'];
      if (validSections.includes(cmd)) {
        window.Omnia.navigation?.navigateTo(cmd);
        this.appendMessage('ai', `Navigated to **${cmd}**.`);
        return;
      }
    }

    if (this.activeProvider !== 'gemini' && this.activeProvider !== 'openai') {
      this.activeProvider = 'gemini';
    }

    const cfg = this.getProviderConfig(this.activeProvider);
    const providerName = this.activeProvider === 'openai' ? 'OpenAI' : 'Google Gemini';

    // Validate key presence
    if (!cfg.key || cfg.key.length < 10) {
      const fallbackText = `**${providerName} API Key Required**\n\nI received your question: *"${this.escapeHtml(prompt)}"*.\n\nTo receive conversational AI answers powered by **${providerName}**, please click **"🔑 Configure AI Providers"** above and paste your API key.\n\nKeys are stored **locally in this browser** and are never sent to external OMNIA servers.`;
      this.appendMessage('ai', fallbackText);
      return;
    }

    // Thinking indicator
    const thinkingEl = this.appendMessage('ai', '', true);

    try {
      let aiText = '';
      if (this.activeProvider === 'openai') {
        aiText = await this.queryOpenAiRaw(prompt, cfg.key, cfg.model);
      } else {
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
          errHelp.innerHTML = 'Please verify your API key and model selection under <strong>"🔑 Configure AI Providers"</strong>.';

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
