/**
 * OMNIA 2.0 - OMNIA Intelligence Module (Cloudflare Workers AI via Secure Worker Proxy)
 * Replaces legacy Gemini integration with Cloudflare Workers AI exclusively.
 * - Zero API tokens or account secrets are ever stored in the browser.
 * - Connects to a user-configured Cloudflare Worker URL (server-side AI binding).
 * - Preserves local slash command routing (/tools, /earth, etc.) offline.
 * - Supports explicit request cancellation via AbortController.
 */
(function() {
  window.Omnia = window.Omnia || {};
  const storage = window.Omnia.storage || {
    get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
    showToast(m, t) { console.log(m, t); }
  };

  const WORKER_URL_KEY = 'omnia_cf_worker_url';
  const MODEL_KEY = 'omnia_cf_model';
  const DEFAULT_MODEL = '@cf/meta/llama-3.1-8b-instruct-fast';

  // Verified active Cloudflare Workers AI text-generation models (Cloudflare Docs)
  const SUPPORTED_MODELS = [
    '@cf/meta/llama-3.1-8b-instruct-fast',
    '@cf/meta/llama-3.1-8b-instruct-fp8-fast',
    '@cf/meta/llama-3.2-3b-instruct',
    '@cf/meta/llama-3.3-70b-instruct-fp8-fast'
  ];

  const sanitizeError = (err) => {
    if (!err) return 'Unknown error';
    let msg = typeof err === 'string' ? err : (err.message || String(err));
    msg = msg.replace(/Bearer\s+[a-zA-Z0-9._\-]+/gi, 'Bearer [REDACTED]');
    msg = msg.replace(/[a-f0-9]{32,}/gi, '[REDACTED]');
    return msg;
  };

  const AssistantModule = {
    activeAbortController: null,
    lastFocusedEl: null,

    systemInstruction: `You are OMNIA Intelligence, an educational and scientific AI companion integrated into the OMNIA 2.0 digital operating environment.
Your purpose is focused on:
1. Educational and Scientific Tutoring: Physics, Chemistry, Astronomy, Mathematics, and Geography.
2. Developer & Software Engineering Guidance: HTML, CSS, JavaScript, JSON, algorithms, regex, and web inspection.
3. OMNIA Ecosystem Assistance: Guiding users through OMNIA's 24 modules.
Keep answers concise, accurate, clear, and formatted with markdown.`,

    init() {
      this.cleanupLegacyTokens();
      this.bindCommandBar();
      this.bindConfigModal();
      this.updateStatusBadge();
    },

    /**
     * Ensures no legacy API tokens remain in browser storage from previous versions.
     */
    cleanupLegacyTokens() {
      try {
        localStorage.removeItem('omnia_cf_api_token');
        localStorage.removeItem('omnia_cf_account_id');
        sessionStorage.removeItem('omnia_cf_api_token');
        sessionStorage.removeItem('omnia_cf_account_id');
      } catch (e) {}
    },

    getConfig() {
      let workerUrl = '';
      let model = DEFAULT_MODEL;
      try {
        workerUrl = (localStorage.getItem(WORKER_URL_KEY) || '').trim();
        model = (localStorage.getItem(MODEL_KEY) || DEFAULT_MODEL).trim();
      } catch (e) {}

      if (!SUPPORTED_MODELS.includes(model)) {
        model = DEFAULT_MODEL;
      }
      return { workerUrl, model, isConfigured: this.isValidWorkerUrl(workerUrl) };
    },

    isValidWorkerUrl(url) {
      if (!url || typeof url !== 'string') return false;
      try {
        const parsed = new URL(url.trim());
        return parsed.protocol === 'https:' || (parsed.protocol === 'http:' && (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1'));
      } catch (e) {
        return false;
      }
    },

    saveConfig(workerUrl, model) {
      const cleanUrl = (workerUrl || '').trim().replace(/\/+$/, '');
      const cleanModel = SUPPORTED_MODELS.includes(model) ? model : DEFAULT_MODEL;
      try {
        if (cleanUrl) {
          localStorage.setItem(WORKER_URL_KEY, cleanUrl);
        } else {
          localStorage.removeItem(WORKER_URL_KEY);
        }
        localStorage.setItem(MODEL_KEY, cleanModel);
      } catch (e) {}
      this.updateStatusBadge();
      storage.showToast(cleanUrl ? 'Cloudflare Worker endpoint saved.' : 'Cloudflare Worker endpoint cleared.', cleanUrl ? 'success' : 'info');
    },

    updateStatusBadge() {
      const badge = document.getElementById('gemini-status-badge');
      if (!badge) return;
      const cfg = this.getConfig();
      const shortModel = cfg.model.replace('@cf/meta/', '');

      if (cfg.isConfigured) {
        badge.textContent = `● Cloudflare Workers AI (${shortModel})`;
        badge.className = 'px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30';
      } else {
        badge.textContent = '● Cloudflare Workers AI (Worker URL Required)';
        badge.className = 'px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30';
      }
    },

    bindConfigModal() {
      const btn = document.getElementById('assistant-api-key-btn');
      const modal = document.getElementById('gemini-key-modal');
      const closeBtn = document.getElementById('gemini-modal-close');
      const cancelBtn = document.getElementById('gemini-modal-cancel');
      const saveBtn = document.getElementById('gemini-key-save-btn');
      const clearBtn = document.getElementById('gemini-key-clear-btn');

      const workerUrlInput = document.getElementById('cf-worker-url-input');
      const modelSelect = document.getElementById('cf-model-select');
      const testBtn = document.getElementById('cf-test-conn-btn');
      const statusBox = document.getElementById('cf-test-status');

      const openModal = () => {
        this.lastFocusedEl = document.activeElement;
        const cfg = this.getConfig();
        if (workerUrlInput) workerUrlInput.value = cfg.workerUrl || '';
        if (modelSelect) modelSelect.value = cfg.model || DEFAULT_MODEL;
        if (statusBox) statusBox.textContent = '';
        modal?.classList.remove('hidden');
        workerUrlInput?.focus();
      };

      const closeModal = () => {
        modal?.classList.add('hidden');
        if (this.lastFocusedEl && typeof this.lastFocusedEl.focus === 'function') {
          this.lastFocusedEl.focus();
        }
      };

      btn?.addEventListener('click', openModal);
      closeBtn?.addEventListener('click', closeModal);
      cancelBtn?.addEventListener('click', closeModal);

      modal?.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
      });

      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal && !modal.classList.contains('hidden')) {
          closeModal();
        }
      });

      saveBtn?.addEventListener('click', () => {
        const urlVal = (workerUrlInput?.value || '').trim();
        const modelVal = modelSelect?.value || DEFAULT_MODEL;
        if (urlVal && !this.isValidWorkerUrl(urlVal)) {
          if (statusBox) statusBox.innerHTML = '<span class="text-rose-400">Please enter a valid HTTPS Cloudflare Worker URL (or http://localhost for local testing).</span>';
          return;
        }
        this.saveConfig(urlVal, modelVal);
        closeModal();
      });

      clearBtn?.addEventListener('click', () => {
        if (workerUrlInput) workerUrlInput.value = '';
        this.saveConfig('', DEFAULT_MODEL);
        closeModal();
      });

      testBtn?.addEventListener('click', async () => {
        const urlVal = (workerUrlInput?.value || '').trim().replace(/\/+$/, '');
        const modelVal = modelSelect?.value || DEFAULT_MODEL;

        if (!this.isValidWorkerUrl(urlVal)) {
          if (statusBox) statusBox.innerHTML = '<span class="text-amber-400">Enter a valid HTTPS Cloudflare Worker URL first (e.g. https://omnia-ai-worker.your-subdomain.workers.dev).</span>';
          return;
        }

        if (statusBox) statusBox.innerHTML = '<span class="text-indigo-400 animate-pulse">Testing Cloudflare Worker connection...</span>';
        const start = performance.now();
        try {
          await this.queryCloudflareWorker('Reply with the single word: CONNECTED', urlVal, modelVal);
          const ms = Math.round(performance.now() - start);
          this.saveConfig(urlVal, modelVal);
          if (statusBox) statusBox.innerHTML = `<span class="text-emerald-400 font-bold">✓ Connected via Cloudflare Worker (${ms}ms) — Saved!</span>`;
        } catch (err) {
          const safeMsg = sanitizeError(err.message || 'Connection failed');
          if (statusBox) statusBox.innerHTML = `<span class="text-rose-400 font-medium">Failed: ${this.escapeHtml(safeMsg)}</span>`;
        }
      });
    },

    bindCommandBar() {
      const input = document.getElementById('assistant-command-input');
      const sendBtn = document.getElementById('assistant-send-btn');
      const stopBtn = document.getElementById('assistant-stop-btn');
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

      stopBtn?.addEventListener('click', () => {
        if (this.activeAbortController) {
          this.activeAbortController.abort();
          this.activeAbortController = null;
          storage.showToast('AI request cancelled.', 'info');
        }
      });

      clearChatBtn?.addEventListener('click', () => {
        const container = document.getElementById('assistant-messages-container');
        if (!container) return;
        container.innerHTML = `
          <div class="flex items-start gap-2.5 max-w-2xl">
            <div class="w-7 h-7 rounded-lg bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-indigo-300 shrink-0 text-xs font-bold">AI</div>
            <div class="p-3.5 rounded-2xl bg-slate-900/80 border border-white/5 text-xs text-slate-200 space-y-2 leading-relaxed">
              <p>Conversation cleared. Ready for educational science, mathematics, coding, and OMNIA platform questions — or type a local slash command like <code>/tools</code> or <code>/earth</code>.</p>
            </div>
          </div>
        `;
        storage.showToast('Conversation cleared', 'info');
      });

      document.querySelectorAll('.assistant-suggestion-pill').forEach(pill => {
        pill.addEventListener('click', () => {
          const prompt = pill.getAttribute('data-prompt');
          if (prompt) this.processQuery(prompt);
        });
      });
    },

    setLoadingUI(isLoading) {
      const sendBtn = document.getElementById('assistant-send-btn');
      const stopBtn = document.getElementById('assistant-stop-btn');
      if (sendBtn) sendBtn.disabled = isLoading;
      if (stopBtn) stopBtn.classList.toggle('hidden', !isLoading);
    },

    appendMessage(role, text, isThinking = false) {
      const container = document.getElementById('assistant-messages-container');
      if (!container) return null;

      const msgDiv = document.createElement('div');
      if (role === 'user') {
        msgDiv.className = 'flex items-start justify-end gap-2.5';

        const bubble = document.createElement('div');
        bubble.className = 'p-3 rounded-2xl bg-indigo-600 text-xs text-white max-w-xl shadow-md break-words';
        bubble.textContent = text;

        const avatar = document.createElement('div');
        avatar.className = 'w-7 h-7 rounded-lg bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-300 shrink-0 text-xs font-bold';
        avatar.textContent = 'You';

        msgDiv.appendChild(bubble);
        msgDiv.appendChild(avatar);
      } else {
        msgDiv.className = 'flex items-start gap-2.5 max-w-2xl';

        const avatar = document.createElement('div');
        avatar.className = 'w-7 h-7 rounded-lg bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-indigo-300 shrink-0 text-[10px] font-bold';
        avatar.textContent = 'CF AI';

        const contentBox = document.createElement('div');
        contentBox.className = 'ai-content-box p-3.5 rounded-2xl bg-slate-900/80 border border-white/5 text-xs text-slate-200 space-y-2 leading-relaxed break-words';

        if (isThinking) {
          const thinkWrap = document.createElement('div');
          thinkWrap.className = 'flex items-center gap-2 text-indigo-300';
          const ping = document.createElement('span');
          ping.className = 'w-2 h-2 rounded-full bg-indigo-400 animate-ping';
          const thinkLabel = document.createElement('span');
          thinkLabel.textContent = 'Consulting Cloudflare Workers AI...';
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
      let safe = this.escapeHtml(str);
      safe = safe.replace(/\*\*([^*]+)\*\*/g, '<strong class="text-white font-semibold">$1</strong>');
      safe = safe.replace(/`([^`]+)`/g, '<code class="px-1.5 py-0.5 rounded bg-slate-800 text-indigo-300 font-mono text-[11px]">$1</code>');
      return safe;
    },

    /**
     * Sends only the explicitly submitted user prompt to the configured Cloudflare Worker proxy.
     * No local notes, files, or browser storage are transmitted.
     */
    async queryCloudflareWorker(prompt, workerUrl, model, signal) {
      if (!this.isValidWorkerUrl(workerUrl)) {
        throw new Error('Cloudflare Worker endpoint URL is not configured. Click "Configure Cloudflare AI" to enter your deployed Worker URL.');
      }

      if (typeof navigator !== 'undefined' && navigator.onLine === false) {
        throw new Error('You appear to be offline. Local slash commands (e.g. /tools, /math) still work, but Cloudflare Workers AI requires an internet connection.');
      }

      const res = await fetch(workerUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal,
        body: JSON.stringify({
          model: model || DEFAULT_MODEL,
          messages: [
            { role: 'system', content: this.systemInstruction },
            { role: 'user', content: prompt }
          ]
        })
      });

      let data = {};
      try {
        data = await res.json();
      } catch (e) {
        data = {};
      }

      if (!res.ok) {
        if (res.status === 429) {
          throw new Error(data.error || 'Rate limit reached on Cloudflare Workers AI. Please wait a moment before trying again.');
        }
        if (res.status === 400) {
          throw new Error(data.error || 'Invalid request or unsupported model ID.');
        }
        throw new Error(data.error || `Cloudflare Worker returned HTTP ${res.status}.`);
      }

      const reply = (data.response || data.result?.response || '').trim();
      if (!reply) {
        throw new Error('Cloudflare Workers AI returned an empty response.');
      }
      return reply;
    },

    async processQuery(prompt) {
      this.appendMessage('user', prompt);

      // 1. Preserve local slash-command navigation router across all 24 OMNIA divisions (works offline)
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
          this.appendMessage('ai', `Navigated locally to **${cmd}**.`);
          return;
        }
        if (cmd === 'help') {
          this.appendMessage('ai', 'Local commands work offline: type `/tools`, `/earth`, `/universe`, `/learn`, `/mathematics-lab`, `/api-explorer`, `/news`, `/workspace`, etc. For cloud AI answers, configure your Cloudflare Worker URL under **Configure Cloudflare AI**.');
          return;
        }
      }

      // Cancel any in-flight request before starting a new one
      if (this.activeAbortController) {
        this.activeAbortController.abort();
      }
      const controller = new AbortController();
      this.activeAbortController = controller;

      const cfg = this.getConfig();
      const thinkingEl = this.appendMessage('ai', '', true);
      this.setLoadingUI(true);
      window.Omnia.status?.report('OMNIA Intelligence', 'loading', 'Sending prompt to Cloudflare Workers AI');

      try {
        const aiText = await this.queryCloudflareWorker(prompt, cfg.workerUrl, cfg.model, controller.signal);
        if (thinkingEl) {
          const box = thinkingEl.querySelector('.ai-content-box');
          if (box) this.renderSafeMarkdown(box, aiText);
        }
        window.Omnia.status?.report('OMNIA Intelligence', 'live', `Cloudflare Workers AI (${cfg.model.replace('@cf/meta/', '')})`);
      } catch (err) {
        const isAbort = err && err.name === 'AbortError';
        const safeErr = isAbort
          ? 'Request was cancelled.'
          : sanitizeError(err.message || 'Unable to reach Cloudflare Workers AI service.');

        window.Omnia.status?.report('OMNIA Intelligence', isAbort ? 'unavailable' : 'error', safeErr);

        if (thinkingEl) {
          const box = thinkingEl.querySelector('.ai-content-box');
          if (box) {
            box.innerHTML = '';

            const errWrap = document.createElement('div');
            errWrap.className = 'space-y-1.5 text-rose-300';
            errWrap.setAttribute('role', 'alert');

            const errTitle = document.createElement('div');
            errTitle.className = 'font-bold flex items-center gap-1.5';
            errTitle.innerHTML = isAbort ? '<span>⏹</span> ' : '<span>⚠️</span> ';
            const titleText = document.createElement('span');
            titleText.textContent = isAbort ? 'Request Cancelled' : 'Cloudflare Workers AI Unavailable';
            errTitle.appendChild(titleText);

            const errDesc = document.createElement('p');
            errDesc.className = 'text-xs text-rose-200/90 leading-relaxed';
            errDesc.textContent = safeErr;

            const errHelp = document.createElement('div');
            errHelp.className = 'text-[11px] text-slate-400 pt-1 border-t border-rose-500/20';
            errHelp.innerHTML = 'Verify your Worker endpoint URL under <strong>"⚡ Configure Cloudflare AI"</strong>. Local slash commands (e.g. <code>/tools</code>) always work offline.';

            errWrap.appendChild(errTitle);
            errWrap.appendChild(errDesc);
            errWrap.appendChild(errHelp);
            box.appendChild(errWrap);
          }
        }
      } finally {
        if (this.activeAbortController === controller) {
          this.activeAbortController = null;
        }
        this.setLoadingUI(false);
      }
    }
  };

  window.Omnia.assistant = AssistantModule;
  window.AssistantModule = AssistantModule;
})();
