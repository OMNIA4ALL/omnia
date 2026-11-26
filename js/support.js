/**
 * OMNIA 2.0 — Simple Email-Based Support Module
 * Official support address: omnia4ai@gmail.com
 *
 * Privacy & Safety:
 * - Uses standard mailto: links so the user's own email app opens for review before sending.
 * - Never sends emails automatically.
 * - Never includes passwords, API keys, authentication tokens, files, or private user data.
 * - Provides a clean fallback dialog with Copy Email & Copy Template buttons if no email app is configured.
 */
(function() {
  window.Omnia = window.Omnia || {};
  const storage = window.Omnia.storage || {
    showToast(m) { console.log(m); }
  };

  const SUPPORT_EMAIL = 'omnia4ai@gmail.com';
  const SUPPORT_SUBJECT = 'OMNIA Support Request';

  function buildBodyTemplate(featureHint = '') {
    const featureLine = featureHint ? featureHint : '[Enter feature name]';
    return [
      'Hello OMNIA Support Team,',
      '',
      'I need assistance with OMNIA.',
      '',
      'Problem description:',
      '',
      '[Please describe your problem here]',
      '',
      'Which section or feature are you experiencing problems with?',
      '',
      featureLine,
      '',
      'Device and browser (optional):',
      '',
      '[Enter details]',
      '',
      'Thank you.'
    ].join('\n');
  }

  function buildMailtoUrl(featureHint = '') {
    const subject = encodeURIComponent(SUPPORT_SUBJECT);
    const body = encodeURIComponent(buildBodyTemplate(featureHint));
    return `mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`;
  }

  const SupportModule = {
    initialized: false,
    lastFocusedEl: null,
    currentFeatureHint: '',

    init() {
      if (this.initialized) return;
      this.initialized = true;
      this.injectSupportModal();
      this.injectIntoSettingsModal();
      this.bindModalEvents();
    },

    getEmail() {
      return SUPPORT_EMAIL;
    },

    getMailtoUrl(featureHint = '') {
      return buildMailtoUrl(featureHint);
    },

    getTemplateText(featureHint = '') {
      return buildBodyTemplate(featureHint);
    },

    async copyEmail() {
      try {
        await navigator.clipboard.writeText(SUPPORT_EMAIL);
        storage.showToast(`Copied ${SUPPORT_EMAIL} to clipboard.`, 'success');
      } catch {
        storage.showToast(`Support email: ${SUPPORT_EMAIL}`, 'info');
      }
    },

    async copyTemplate(featureHint = '') {
      try {
        await navigator.clipboard.writeText(`To: ${SUPPORT_EMAIL}\nSubject: ${SUPPORT_SUBJECT}\n\n${buildBodyTemplate(featureHint)}`);
        storage.showToast('Copied support email template to clipboard.', 'success');
      } catch {
        storage.showToast('Clipboard blocked; copy the template from the preview box.', 'warning');
      }
    },

    injectSupportModal() {
      if (document.getElementById('omnia-support-modal')) return;
      const modal = document.createElement('div');
      modal.id = 'omnia-support-modal';
      modal.className = 'fixed inset-0 z-[60] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 hidden';
      modal.setAttribute('role', 'dialog');
      modal.setAttribute('aria-modal', 'true');
      modal.setAttribute('aria-labelledby', 'omnia-support-modal-title');

      modal.innerHTML = `
        <div class="glass-card w-full max-w-md rounded-2xl border border-white/15 p-5 md:p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
          <div class="flex items-center justify-between border-b border-white/10 pb-3">
            <div class="flex items-center gap-2">
              <span aria-hidden="true">✉️</span>
              <h3 id="omnia-support-modal-title" class="text-sm font-bold text-slate-100">Contact OMNIA Support</h3>
            </div>
            <button type="button" id="omnia-support-close" class="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 text-sm" aria-label="Close support dialog">✕</button>
          </div>

          <p class="text-xs text-slate-300 leading-relaxed">
            Need help with OMNIA or want to report a problem? Click <strong>Open Email App</strong> below to start a prefilled email to our support team. You can review and edit everything before sending—nothing is sent automatically.
          </p>

          <div class="p-3 rounded-xl bg-slate-900/80 border border-white/10 flex items-center justify-between gap-2">
            <div class="min-w-0">
              <div class="text-[10.5px] text-slate-400">Official Support Email</div>
              <div class="text-xs font-mono font-semibold text-indigo-300 truncate">${SUPPORT_EMAIL}</div>
            </div>
            <button type="button" id="omnia-support-copy-email" class="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-medium shrink-0">📋 Copy Email</button>
          </div>

          <div class="flex flex-wrap items-center gap-2">
            <a id="omnia-support-mailto-link" href="${buildMailtoUrl()}" class="flex-1 text-center px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md transition">
              ✉️ Open Email App
            </a>
            <button type="button" id="omnia-support-copy-template" class="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition">
              Copy Template
            </button>
          </div>

          <p class="text-[10.5px] text-slate-400 leading-relaxed">
            <strong>No email app on this device?</strong> Tap <strong>Copy Email</strong> and <strong>Copy Template</strong>, then paste them into Gmail or your preferred webmail. Never include passwords, API keys, or private tokens in support emails.
          </p>
        </div>
      `;

      document.body.appendChild(modal);
    },

    /**
     * Adds an unobtrusive Contact Support section inside the existing Settings modal (#api-settings-modal).
     */
    injectIntoSettingsModal() {
      const settingsModal = document.getElementById('api-settings-modal');
      if (!settingsModal || document.getElementById('omnia-settings-support-card')) return;
      const card = settingsModal.querySelector('.glass-card');
      if (!card) return;

      const block = document.createElement('div');
      block.id = 'omnia-settings-support-card';
      block.className = 'p-3.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3';
      block.innerHTML = `
        <div class="space-y-0.5">
          <div class="text-xs font-bold text-indigo-200 flex items-center gap-1.5"><span aria-hidden="true">✉️</span> Need Help or Found a Problem?</div>
          <p class="text-[11px] text-slate-300 leading-snug">Reach the OMNIA team at <span class="font-mono text-indigo-300">${SUPPORT_EMAIL}</span>. Opens your email app so you can edit before sending.</p>
        </div>
        <div class="flex items-center gap-2 shrink-0">
          <button type="button" id="omnia-settings-copy-email-btn" class="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-medium" title="Copy support email address">Copy Email</button>
          <a href="${buildMailtoUrl()}" id="omnia-settings-support-btn" class="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-semibold shadow-sm transition">Contact Support</a>
        </div>
      `;

      // Insert just before the final footer/close button row if possible, else append cleanly
      const footerBtn = card.querySelector('#close-api-modal-btn-2')?.parentElement;
      if (footerBtn && footerBtn.parentElement === card) {
        card.insertBefore(block, footerBtn);
      } else {
        card.appendChild(block);
      }

      document.getElementById('omnia-settings-copy-email-btn')?.addEventListener('click', () => this.copyEmail());
    },

    open(featureHint = '') {
      this.lastFocusedEl = document.activeElement;
      this.currentFeatureHint = featureHint || '';
      const modal = document.getElementById('omnia-support-modal');
      const link = document.getElementById('omnia-support-mailto-link');
      if (link) link.href = buildMailtoUrl(this.currentFeatureHint);
      if (modal) {
        modal.classList.remove('hidden');
        document.getElementById('omnia-support-mailto-link')?.focus();
      }
    },

    close() {
      const modal = document.getElementById('omnia-support-modal');
      if (modal) modal.classList.add('hidden');
      if (this.lastFocusedEl && typeof this.lastFocusedEl.focus === 'function') {
        this.lastFocusedEl.focus();
      }
    },

    bindModalEvents() {
      const modal = document.getElementById('omnia-support-modal');
      document.getElementById('omnia-support-close')?.addEventListener('click', () => this.close());
      document.getElementById('omnia-support-copy-email')?.addEventListener('click', () => this.copyEmail());
      document.getElementById('omnia-support-copy-template')?.addEventListener('click', () => this.copyTemplate(this.currentFeatureHint));

      modal?.addEventListener('click', (e) => {
        if (e.target === modal) this.close();
      });

      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal && !modal.classList.contains('hidden')) {
          this.close();
        }
      });

      // Delegated listener for any unobtrusive [data-omnia-support] trigger buttons
      document.addEventListener('click', (e) => {
        const trigger = e.target.closest?.('[data-omnia-support]');
        if (trigger) {
          e.preventDefault();
          const hint = trigger.getAttribute('data-omnia-support') || '';
          this.open(hint);
        }
      });
    }
  };

  window.Omnia.support = SupportModule;
})();
