(function() {
  window.Omnia = window.Omnia || {};
  const storage = window.Omnia.storage || {
    get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch(e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch(e) {} },
    showToast(m) { console.log(m); }
  };
  const api = window.Omnia.api || {};

/**
 * OMNIA 2.0 - OMNIA Intelligence Module (Google Gemini Integration)
 * Educational & Scientific Assistant with strict content guardrails
 */
const AssistantModule = {
  geminiEndpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent',
  systemInstruction: `You are OMNIA Intelligence, an educational and scientific AI companion integrated into the OMNIA 2.0 operating environment.
Your purpose is strictly confined to:
1. Educational and Scientific Tutoring: Physics (kinematics, waves, circuits, optics), Chemistry (periodic table of elements), Astronomy & Ephemeris (solar system, lunar cycles), Mathematics, and Geography.
2. Developer & Software Engineering Guidance: Web technologies (HTML, CSS, JS), algorithms, regex, JSON data manipulation, cryptographic hashing, and file operations.
3. OMNIA Ecosystem Assistance: Guiding users through OMNIA's 16 modules (Browser Tools, Earth & Weather, Universe Explorer, Simulation Lab, Learn & Calculator, File Lab, Code Playground, World Intelligence, Workspace, Network Suite, Device Diagnostics, Design Studio, Focus & Timers, Privacy Centre).

STRICT GUARDRAILS & REFUSAL POLICY:
You must strictly decline any request that is NOT educational, scientific, coding-related, or directly about OMNIA utilities.
If a user asks about entertainment celebrity gossip, politics, creative fiction, video games unrelated to science/education, casual non-educational chit-chat, or dangerous/illegal advice, you MUST politely and firmly refuse with:
"OMNIA Intelligence is restricted strictly to educational science, physics, mathematics, coding, and OMNIA platform tools. Please ask a question related to science, mathematics, coding, or our platform features!"
Keep answers concise, clear, educational, and formatted with markdown.`,

  init() {
    this.bindCommandBar();
    this.bindGeminiModal();
    this.updateStatusBadge();
  },

  getApiKey() {
    return localStorage.getItem('omnia_gemini_api_key') || '';
  },

  setApiKey(key) {
    if (key) {
      localStorage.setItem('omnia_gemini_api_key', key.trim());
      storage.showToast('Google Gemini API Key saved locally', 'success');
    } else {
      localStorage.removeItem('omnia_gemini_api_key');
      storage.showToast('Gemini API Key removed', 'info');
    }
    this.updateStatusBadge();
  },

  updateStatusBadge() {
    const badge = document.getElementById('gemini-status-badge');
    if (!badge) return;
    const key = this.getApiKey();
    if (key) {
      badge.textContent = '● Gemini 1.5 Flash Connected';
      badge.className = 'px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30';
    } else {
      badge.textContent = '● Local Engine (Add Gemini Key)';
      badge.className = 'px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30';
    }
  },

  bindGeminiModal() {
    const btn = document.getElementById('assistant-api-key-btn');
    const modal = document.getElementById('gemini-key-modal');
    const closeBtn = document.getElementById('gemini-modal-close');
    const cancelBtn = document.getElementById('gemini-modal-cancel');
    const saveBtn = document.getElementById('gemini-key-save-btn');
    const clearBtn = document.getElementById('gemini-key-clear-btn');
    const input = document.getElementById('gemini-api-key-input');

    const openModal = () => {
      if (input) input.value = this.getApiKey();
      modal?.classList.remove('hidden');
    };

    const closeModal = () => {
      modal?.classList.add('hidden');
    };

    btn?.addEventListener('click', openModal);
    closeBtn?.addEventListener('click', closeModal);
    cancelBtn?.addEventListener('click', closeModal);

    saveBtn?.addEventListener('click', () => {
      const val = input ? input.value.trim() : '';
      this.setApiKey(val);
      closeModal();
    });

    clearBtn?.addEventListener('click', () => {
      if (input) input.value = '';
      this.setApiKey('');
      closeModal();
    });
  },

  bindCommandBar() {
    const input = document.getElementById('assistant-command-input');
    const sendBtn = document.getElementById('assistant-send-btn');

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

  appendMessage(role, text, isThinking = false) {
    const container = document.getElementById('assistant-messages-container');
    if (!container) return null;

    const msgDiv = document.createElement('div');
    if (role === 'user') {
      msgDiv.className = 'flex items-start justify-end gap-2.5';
      msgDiv.innerHTML = `
        <div class="p-3 rounded-2xl bg-indigo-600 text-xs text-white max-w-xl shadow-md">
          ${this.escapeHtml(text)}
        </div>
        <div class="w-7 h-7 rounded-lg bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-300 shrink-0 text-xs font-bold">You</div>
      `;
    } else {
      msgDiv.className = 'flex items-start gap-2.5 max-w-2xl';
      msgDiv.innerHTML = `
        <div class="w-7 h-7 rounded-lg bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-indigo-300 shrink-0 text-xs font-bold">AI</div>
        <div class="ai-content-box p-3.5 rounded-2xl bg-slate-900/80 border border-white/5 text-xs text-slate-200 space-y-2 leading-relaxed">
          ${isThinking ? '<div class="flex items-center gap-2 text-indigo-300"><span class="w-2 h-2 rounded-full bg-indigo-400 animate-ping"></span><span>Consulting Google Gemini...</span></div>' : this.formatMarkdown(text)}
        </div>
      `;
    }

    container.appendChild(msgDiv);
    container.scrollTop = container.scrollHeight;
    return msgDiv;
  },

  escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  },

  formatMarkdown(text) {
    // Basic Markdown parser for educational responses
    let html = this.escapeHtml(text);
    // Bold
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong class="text-white">$1</strong>');
    // Inline code
    html = html.replace(/`([^`]+)`/g, '<code class="px-1.5 py-0.5 rounded bg-slate-800 text-indigo-300 font-mono text-[11px]">$1</code>');
    // Bullet lists
    html = html.replace(/^[\*\-]\s+(.+)$/gm, '<li class="ml-4 list-disc">$1</li>');
    // Paragraph breaks
    html = html.replace(/\n\n+/g, '</p><p class="mt-2">');
    return `<p>${html}</p>`;
  },

  async processQuery(prompt) {
    // 1. Display user query in chat
    this.appendMessage('user', prompt);

    // 2. Check for local navigation triggers first
    const qLower = prompt.toLowerCase();
    if (qLower.includes('weather') || qLower.includes('temperature') || qLower.includes('radar')) {
      window.Omnia.navigation?.navigateTo('earth');
      this.appendMessage('ai', `Navigating you to **Earth & Weather Intelligence** to view live planetary telemetry and radar for ${prompt}.`);
      return;
    } else if (qLower.startsWith('qr ') || qLower.includes('qr code')) {
      window.Omnia.navigation?.navigateTo('tools');
      const text = prompt.replace(/^qr\s+/i, '').replace(/create qr code for/i, '').trim();
      const qrInput = document.getElementById('qr-input-text');
      if (qrInput && text) {
        qrInput.value = text;
        document.getElementById('qr-generate-btn')?.click();
      }
      this.appendMessage('ai', `Switched to **Browser Tools** and generated your QR code for: \`${text || 'https://omnia.local'}\`.`);
      return;
    } else if (qLower.includes('simulate') || qLower.includes('pendulum') || qLower.includes('projectile motion')) {
      window.Omnia.navigation?.navigateTo('simulation-lab');
      this.appendMessage('ai', 'Opened **Simulation Lab** so you can interact with physical laws and formula sliders directly.');
      return;
    } else if (qLower.includes('playground') || qLower.includes('code sandbox')) {
      window.Omnia.navigation?.navigateTo('code-playground');
      this.appendMessage('ai', 'Switched to **Code Playground** for live HTML/CSS/JS execution.');
      return;
    }

    // 3. Query Google Gemini API if key is available
    const apiKey = this.getApiKey();
    if (!apiKey) {
      // Fallback response with key prompt
      const fallbackText = `**Google Gemini API Key Required for Conversational AI**\n\nI recognized your question: "${prompt}".\n\nTo unlock full AI tutoring with Google Gemini, please click **"Configure Gemini API Key"** above and enter your free API key from Google AI Studio. Your key remains 100% private in your browser's LocalStorage!\n\nIn the meantime, you can explore all educational physics simulations in **Simulation Lab**, chemistry in **Learn**, and astronomical ephemeris in **Universe Explorer**.`;
      this.appendMessage('ai', fallbackText);
      return;
    }

    // Thinking indicator
    const thinkingEl = this.appendMessage('ai', '', true);

    try {
      const url = `${this.geminiEndpoint}?key=${apiKey}`;
      const payload = {
        contents: [
          {
            role: 'user',
            parts: [{ text: `${this.systemInstruction}\n\nUser Question: ${prompt}` }]
          }
        ],
        generationConfig: {
          temperature: 0.2, // Low temperature for high factual accuracy and strict adherence
          maxOutputTokens: 800
        }
      };

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error?.message || `HTTP ${res.status}`);
      }

      const data = await res.json();
      const aiText = data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response generated.';

      // Replace thinking message with Gemini response
      if (thinkingEl) {
        const box = thinkingEl.querySelector('.ai-content-box');
        if (box) box.innerHTML = this.formatMarkdown(aiText);
      }
    } catch (err) {
      console.warn('[OMNIA Gemini] API error:', err);
      if (thinkingEl) {
        const box = thinkingEl.querySelector('.ai-content-box');
        if (box) {
          box.innerHTML = `<p class="text-rose-400"><strong>Gemini API Error:</strong> ${this.escapeHtml(err.message)}</p><p class="text-slate-400 text-[11px] mt-1">Please verify your API key in "Configure Gemini API Key" or check network connectivity.</p>`;
        }
      }
    }
  }
};

  window.Omnia.assistant = AssistantModule;
  window.AssistantModule = AssistantModule;
})();
