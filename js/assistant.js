/**
 * OMNIA 2.0 - OMNIA Intelligence Module (User-Owned Cloudflare Workers AI)
 * - Requires server-verified sign-in to the user's own Cloudflare Worker for cloud AI.
 * - Zero Gemini, zero OpenAI, zero fallback to owner's Worker, zero fabricated responses.
 * - Supports text chat, image upload, voice (STT/TTS), camera capture, live camera & screen frame sampling.
 * - Preserves offline local /commands across all 24 OMNIA divisions.
 * - Enforces persistent daily quota (authoritative in Cloudflare KV, mirrored locally so closing/reopening never resets exhausted quota).
 */
(function() {
  window.Omnia = window.Omnia || {};
  const storage = window.Omnia.storage || {
    get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
    showToast(m, t) { console.log(m, t); }
  };

  const MODEL_KEY = 'omnia_cf_model';
  const DEFAULT_TEXT_MODEL = '@cf/meta/llama-3.1-8b-instruct-fast';
  const DEFAULT_VISION_MODEL = '@cf/meta/llama-3.2-11b-vision-instruct';

  const TEXT_MODELS = [
    '@cf/meta/llama-3.1-8b-instruct-fast',
    '@cf/meta/llama-3.1-8b-instruct-fp8-fast',
    '@cf/meta/llama-3.2-3b-instruct',
    '@cf/meta/llama-3.3-70b-instruct-fp8-fast'
  ];

  const VISION_MODELS = [
    '@cf/meta/llama-3.2-11b-vision-instruct',
    '@cf/meta/llama-4-scout-17b-16e-instruct'
  ];

  const ALL_MODELS = [...TEXT_MODELS, ...VISION_MODELS];

  const sanitizeError = (err) => {
    if (!err) return 'Unknown error';
    let msg = typeof err === 'string' ? err : (err.message || String(err));
    msg = msg.replace(/Bearer\s+[a-zA-Z0-9._\-]+/gi, 'Bearer [REDACTED]');
    msg = msg.replace(/[a-f0-9]{32,}/gi, '[REDACTED]');
    return msg;
  };

  const AssistantModule = {
    activeAbortController: null,
    conversationHistory: [],

    systemInstruction: `You are OMNIA Intelligence, an educational and scientific AI companion integrated into the OMNIA 2.0 digital operating environment.
Your purpose is focused on:
1. Educational and Scientific Tutoring: Physics, Chemistry, Astronomy, Mathematics, and Geography.
2. Developer & Software Engineering Guidance: HTML, CSS, JavaScript, JSON, algorithms, regex, and web inspection.
3. OMNIA Ecosystem Assistance: Guiding users through OMNIA's 24 modules.
Keep answers concise, accurate, clear, and formatted with markdown.`,

    init() {
      this.bindCommandBar();
      const auth = window.Omnia.assistantAuth;
      if (auth) {
        auth.onAuthChange(() => this.syncAuthAndQuotaUI());
      }
      const media = window.Omnia.assistantMedia;
      if (media) {
        media.onAttachmentChange((att) => this.handleAttachmentNotice(att));
      }
      this.syncAuthAndQuotaUI();
    },

    getSelectedModel() {
      let model = DEFAULT_TEXT_MODEL;
      try { model = (localStorage.getItem(MODEL_KEY) || DEFAULT_TEXT_MODEL).trim(); } catch {}
      return ALL_MODELS.includes(model) ? model : DEFAULT_TEXT_MODEL;
    },

    setSelectedModel(model) {
      if (!ALL_MODELS.includes(model)) return;
      try { localStorage.setItem(MODEL_KEY, model); } catch {}
      const sel = document.getElementById('cf-model-select');
      if (sel) sel.value = model;
      this.syncAuthAndQuotaUI();
    },

    isVisionModel(model) {
      return VISION_MODELS.includes(model);
    },

    handleAttachmentNotice(att) {
      const notice = document.getElementById('assistant-vision-notice');
      if (!notice) return;
      if (att && !this.isVisionModel(this.getSelectedModel())) {
        notice.classList.remove('hidden');
      } else {
        notice.classList.add('hidden');
      }
    },

    syncAuthAndQuotaUI() {
      const auth = window.Omnia.assistantAuth;
      const state = auth ? auth.getState() : { authenticated: false, workerUrl: '', quota: null };
      const model = this.getSelectedModel();
      const shortModel = model.replace('@cf/meta/', '');

      // 1. Top status badge
      const badge = document.getElementById('gemini-status-badge');
      if (badge) {
        if (state.authenticated && state.workerUrl) {
          let host = state.workerUrl;
          try { host = new URL(state.workerUrl).hostname; } catch {}
          badge.textContent = `● Connected: ${host} (${shortModel})`;
          badge.className = 'px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30';
        } else {
          badge.textContent = '● Sign-In & Personal Worker Required';
          badge.className = 'px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30';
        }
      }

      // 2. Onboarding / Sign-In Gate Banner
      const gateEl = document.getElementById('assistant-auth-gate');
      if (gateEl) {
        gateEl.classList.toggle('hidden', !!(state.authenticated && state.workerUrl));
      }

      // 3. Honest Quota Display
      const quotaEl = document.getElementById('assistant-quota-badge');
      if (quotaEl) {
        const q = state.quota;
        if (q && q.enforced && typeof q.used === 'number' && typeof q.limit === 'number') {
          quotaEl.textContent = q.exhausted
            ? `Daily Quota Finished (${q.used}/${q.limit} today — resets 00:00 UTC)`
            : `Your Worker Quota: ${q.used}/${q.limit} messages today`;
          quotaEl.className = q.exhausted
            ? 'px-2.5 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/30'
            : 'px-2.5 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-slate-800/80 text-slate-300 border border-white/10';
        } else {
          quotaEl.textContent = 'Usage: Your Cloudflare Workers AI Account';
          quotaEl.className = 'px-2.5 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-slate-800/80 text-slate-300 border border-white/10';
        }
      }

      // 4. Sign-out button visibility inside modal
      const signOutBtn = document.getElementById('cf-signout-btn');
      if (signOutBtn) signOutBtn.classList.toggle('hidden', !state.authenticated);

      // 5. Re-evaluate vision notice if an image is attached
      const att = window.Omnia.assistantMedia?.getPendingImage();
      this.handleAttachmentNotice(att);
    },

    bindCommandBar() {
      const input = document.getElementById('assistant-command-input');
      const sendBtn = document.getElementById('assistant-send-btn');
      const stopBtn = document.getElementById('assistant-stop-btn');
      const clearChatBtn = document.getElementById('assistant-clear-chat-btn');
      const gateSetupBtn = document.getElementById('assistant-gate-setup-btn');
      const switchVisionBtn = document.getElementById('assistant-switch-vision-btn');

      const handleSend = () => {
        const q = (input?.value || '').trim();
        const att = window.Omnia.assistantMedia?.getPendingImage();
        if (!q && !att) return;
        this.processQuery(q || 'Analyze this attached image.');
        if (input) input.value = '';
      };

      sendBtn?.addEventListener('click', handleSend);
      input?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') handleSend();
      });

      gateSetupBtn?.addEventListener('click', () => {
        window.Omnia.assistantAuth?.openModal();
      });

      switchVisionBtn?.addEventListener('click', () => {
        this.setSelectedModel(DEFAULT_VISION_MODEL);
        storage.showToast(`Switched to vision model ${DEFAULT_VISION_MODEL}.`, 'success');
      });

      stopBtn?.addEventListener('click', () => {
        if (this.activeAbortController) {
          this.activeAbortController.abort();
          this.activeAbortController = null;
          storage.showToast('AI request cancelled.', 'info');
        }
      });

      clearChatBtn?.addEventListener('click', () => {
        this.conversationHistory = [];
        window.Omnia.assistantMedia?.clearPendingImage();
        const container = document.getElementById('assistant-messages-container');
        if (!container) return;
        container.innerHTML = `
          <div class="flex items-start gap-2.5 max-w-2xl">
            <div class="w-7 h-7 rounded-lg bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-indigo-300 shrink-0 text-xs font-bold">AI</div>
            <div class="p-3.5 rounded-2xl bg-slate-900/80 border border-white/5 text-xs text-slate-200 space-y-2 leading-relaxed">
              <p>Conversation cleared. Local slash commands (like <code>/tools</code> or <code>/earth</code>) work offline; cloud AI replies use your own connected Cloudflare Worker.</p>
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

    appendMessage(role, text, isThinking = false, attachedThumb = '') {
      const container = document.getElementById('assistant-messages-container');
      if (!container) return null;

      const msgDiv = document.createElement('div');
      if (role === 'user') {
        msgDiv.className = 'flex items-start justify-end gap-2.5';

        const bubble = document.createElement('div');
        bubble.className = 'p-3 rounded-2xl bg-indigo-600 text-xs text-white max-w-xl shadow-md break-words space-y-2';

        if (attachedThumb) {
          const img = document.createElement('img');
          img.src = attachedThumb;
          img.alt = 'Submitted image';
          img.className = 'max-h-40 rounded-xl border border-white/20';
          bubble.appendChild(img);
        }

        const p = document.createElement('div');
        p.textContent = text;
        bubble.appendChild(p);

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
          thinkLabel.textContent = 'Consulting your Cloudflare Workers AI...';
          thinkWrap.appendChild(ping);
          thinkWrap.appendChild(thinkLabel);
          contentBox.appendChild(thinkWrap);
        } else {
          this.renderSafeMarkdown(contentBox, text);
          this.appendCopyButton(contentBox, text);
        }

        msgDiv.appendChild(avatar);
        msgDiv.appendChild(contentBox);
      }

      container.appendChild(msgDiv);
      container.scrollTop = container.scrollHeight;
      return msgDiv;
    },

    appendCopyButton(container, rawText) {
      if (!rawText) return;
      const bar = document.createElement('div');
      bar.className = 'pt-1.5 border-t border-white/5 flex items-center justify-end gap-2';
      const copyBtn = document.createElement('button');
      copyBtn.type = 'button';
      copyBtn.className = 'text-[10.5px] text-slate-400 hover:text-indigo-300 transition';
      copyBtn.textContent = '📋 Copy response';
      copyBtn.setAttribute('aria-label', 'Copy AI response');
      copyBtn.addEventListener('click', async () => {
        try {
          await navigator.clipboard.writeText(rawText);
          storage.showToast('Response copied to clipboard.', 'success');
        } catch {
          storage.showToast('Clipboard access blocked by browser.', 'warning');
        }
      });
      bar.appendChild(copyBtn);
      container.appendChild(bar);
    },

    escapeHtml(str) {
      if (typeof str !== 'string') return '';
      return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
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
          p.innerHTML = lines.map(l => this.parseInlineMarkdown(l)).join('<br>');
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

    async queryPersonalWorker(prompt, model, imageBase64, signal) {
      const auth = window.Omnia.assistantAuth;
      if (!auth || !auth.isAuthenticated()) {
        throw new Error('Sign-in required. Connect and sign in to your own Cloudflare Worker under "⚡ Connect / Sign In" to use cloud AI.');
      }

      if (auth.isQuotaExhaustedLocally()) {
        const q = auth.getState().quota;
        throw new Error(`Daily quota finished (${q.used}/${q.limit} messages used for ${q.date} UTC). Closing or reloading the page does not reset your daily limit; it resets at 00:00 UTC.`);
      }

      if (typeof navigator !== 'undefined' && navigator.onLine === false) {
        throw new Error('You are offline. Local slash commands (e.g. /tools) still work, but Cloudflare Workers AI requires an internet connection.');
      }

      if (imageBase64 && !this.isVisionModel(model)) {
        throw new Error(`The selected model (${model}) is text-only and cannot analyze images. Switch to ${DEFAULT_VISION_MODEL} to analyze images or live frames.`);
      }

      const workerUrl = auth.getWorkerUrl();
      const token = auth.getSessionToken();

      const recentHistory = this.conversationHistory.slice(-4);
      const messages = [
        { role: 'system', content: this.systemInstruction },
        ...recentHistory,
        { role: 'user', content: prompt }
      ];

      const body = { model, messages };
      if (imageBase64) body.imageBase64 = imageBase64;

      const res = await fetch(`${workerUrl}/ai/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        signal,
        body: JSON.stringify(body)
      });

      let data = {};
      try { data = await res.json(); } catch {}

      if (data.quota) {
        auth.saveQuotaMirror(data.quota);
      }

      if (res.status === 401) {
        auth.authenticated = false;
        auth.setSessionToken('');
        auth.notifyAuthChange();
        throw new Error(data.error || 'Your session expired or is invalid. Please sign in to your Worker again.');
      }

      if (!res.ok) {
        throw new Error(data.error || `Your Cloudflare Worker returned HTTP ${res.status}.`);
      }

      const reply = (data.response || '').trim();
      if (!reply) {
        throw new Error('Your Cloudflare Worker returned an empty response.');
      }

      this.conversationHistory.push({ role: 'user', content: prompt });
      this.conversationHistory.push({ role: 'assistant', content: reply });
      if (this.conversationHistory.length > 12) {
        this.conversationHistory = this.conversationHistory.slice(-12);
      }

      return reply;
    },

    async processQuery(prompt) {
      const media = window.Omnia.assistantMedia;
      const pendingImg = media?.getPendingImage() || null;

      this.appendMessage('user', prompt, false, pendingImg?.dataUrl || '');

      // 1. Offline local slash-command router across all 24 OMNIA divisions
      const trimmed = prompt.trim();
      if (trimmed.startsWith('/') && !pendingImg) {
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
          this.appendMessage('ai', 'Local commands work offline without sign-in: `/tools`, `/earth`, `/universe`, `/learn`, `/mathematics-lab`, `/api-explorer`, `/news`, `/workspace`, etc. For cloud AI, sign in to your own Cloudflare Worker.');
          return;
        }
      }

      if (this.activeAbortController) {
        this.activeAbortController.abort();
      }
      const controller = new AbortController();
      this.activeAbortController = controller;

      const model = this.getSelectedModel();
      const thinkingEl = this.appendMessage('ai', '', true);
      this.setLoadingUI(true);
      window.Omnia.status?.report('OMNIA Intelligence', 'loading', 'Sending request to your Cloudflare Worker');

      try {
        const aiText = await this.queryPersonalWorker(prompt, model, pendingImg?.dataUrl || '', controller.signal);
        if (pendingImg) media?.clearPendingImage();

        if (thinkingEl) {
          const box = thinkingEl.querySelector('.ai-content-box');
          if (box) {
            this.renderSafeMarkdown(box, aiText);
            this.appendCopyButton(box, aiText);
          }
        }
        media?.speakText(aiText);
        window.Omnia.status?.report('OMNIA Intelligence', 'live', `Personal Worker (${model.replace('@cf/meta/', '')})`);
      } catch (err) {
        const isAbort = err && err.name === 'AbortError';
        const safeErr = isAbort
          ? 'Request was cancelled.'
          : sanitizeError(err.message || 'Unable to reach your Cloudflare Worker.');

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
            titleText.textContent = isAbort ? 'Request Cancelled' : 'OMNIA Intelligence Notice';
            errTitle.appendChild(titleText);

            const errDesc = document.createElement('p');
            errDesc.className = 'text-xs text-rose-200/90 leading-relaxed';
            errDesc.textContent = safeErr;

            const errHelp = document.createElement('div');
            errHelp.className = 'text-[11px] text-slate-400 pt-1 border-t border-rose-500/20';
            errHelp.innerHTML = 'Open <strong>"⚡ Connect / Sign In"</strong> to check your setup, or <button type="button" data-omnia-support="OMNIA Intelligence" class="text-indigo-300 hover:underline font-medium">Contact Support</button> if you need help.';

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
