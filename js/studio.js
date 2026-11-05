/**
 * OMNIA Design Studio Module
 * Harmonic palette generator, CSS gradient builder, and WCAG 2.1 contrast checker.
 */
(function() {
  window.Omnia = window.Omnia || {};
  const storage = window.Omnia.storage;

  const studio = {
    currentPalette: ['#6366F1', '#8B5CF6', '#EC4899', '#3B82F6', '#06B6D4'],
    lockedSwatches: [false, false, false, false, false],

    init() {
      this.bindTabs();
      this.initPalette();
      this.initGradient();
      this.initContrast();
      this.initGlassmorphism();
    },

    bindTabs() {
      document.querySelectorAll('.studio-tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          document.querySelectorAll('.studio-tab-btn').forEach(b => {
            b.classList.remove('active', 'bg-rose-500', 'text-white');
            b.classList.add('bg-slate-800', 'text-slate-300');
          });
          btn.classList.add('active', 'bg-rose-500', 'text-white');
          btn.classList.remove('bg-slate-800', 'text-slate-300');

          const t = btn.getAttribute('data-studiotab');
          document.getElementById('studiotab-panel-palette')?.classList.toggle('hidden', t !== 'palette');
          document.getElementById('studiotab-panel-gradient')?.classList.toggle('hidden', t !== 'gradient');
          document.getElementById('studiotab-panel-contrast')?.classList.toggle('hidden', t !== 'contrast');
          document.getElementById('studiotab-panel-glass')?.classList.toggle('hidden', t !== 'glass');
        });
      });
    },

    // ==========================================
    // 1. COLOR PALETTE GENERATOR
    // ==========================================
    initPalette() {
      document.getElementById('palette-generate-btn')?.addEventListener('click', () => this.generatePalette());
      document.getElementById('palette-harmony-select')?.addEventListener('change', () => this.generatePalette());

      document.getElementById('palette-export-css-btn')?.addEventListener('click', () => {
        const css = `:root {\n${this.currentPalette.map((c, i) => `  --color-stop-${i + 1}: ${c};`).join('\n')}\n}`;
        storage.copyText(css, 'Copied CSS variables!');
      });

      document.getElementById('palette-export-json-btn')?.addEventListener('click', () => {
        storage.copyText(JSON.stringify(this.currentPalette, null, 2), 'Copied JSON palette!');
      });

      this.generatePalette();
    },

    generatePalette() {
      const harmonySel = document.getElementById('palette-harmony-select');
      const harmony = harmonySel ? harmonySel.value : 'harmonious';
      const strip = document.getElementById('palette-swatches-strip');
      if (!strip) return;

      const baseHue = Math.floor(Math.random() * 360);

      for (let i = 0; i < 5; i++) {
        if (!this.lockedSwatches[i]) {
          let h = baseHue + i * 25;
          if (harmony === 'complementary') h = (baseHue + (i % 2 === 0 ? 0 : 180) + i * 15) % 360;
          else if (harmony === 'triadic') h = (baseHue + i * 72) % 360;
          else if (harmony === 'monochromatic') h = baseHue;
          else if (harmony === 'cyberpunk') h = (i * 90 + 30) % 360;

          const s = harmony === 'monochromatic' ? 40 + i * 12 : 75;
          const l = harmony === 'monochromatic' ? 25 + i * 14 : 55 + (i % 2 === 0 ? 10 : -5);

          // Convert HSL to HEX
          const c = (1 - Math.abs(2 * (l / 100) - 1)) * (s / 100);
          const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
          const m = l / 100 - c / 2;
          let r = 0, g = 0, b = 0;
          if (h < 60) { r = c; g = x; }
          else if (h < 120) { r = x; g = c; }
          else if (h < 180) { g = c; b = x; }
          else if (h < 240) { g = x; b = c; }
          else if (h < 300) { r = x; b = c; }
          else { r = c; b = x; }

          const toHex = v => Math.round((v + m) * 255).toString(16).padStart(2, '0').toUpperCase();
          this.currentPalette[i] = `#${toHex(r)}${toHex(g)}${toHex(b)}`;
        }
      }

      strip.innerHTML = '';
      this.currentPalette.forEach((hex, idx) => {
        const swatch = document.createElement('div');
        swatch.className = 'rounded-2xl p-4 flex flex-col justify-between shadow-xl transition-all relative overflow-hidden group min-h-[140px]';
        swatch.style.backgroundColor = hex;
        swatch.innerHTML = `
          <div class="flex items-center justify-between">
            <span class="text-[10px] font-mono px-2 py-0.5 rounded bg-black/30 text-white backdrop-blur-sm">Stop ${idx + 1}</span>
            <button class="lock-swatch-btn p-1.5 rounded-lg bg-black/30 hover:bg-black/50 text-white transition">
              <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="${this.lockedSwatches[idx] ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            </button>
          </div>
          <div class="space-y-1">
            <div class="font-mono font-bold text-sm text-white drop-shadow">${hex}</div>
            <button class="copy-swatch-btn text-[11px] text-white/80 hover:text-white underline">Copy HEX</button>
          </div>
        `;

        swatch.querySelector('.lock-swatch-btn')?.addEventListener('click', (ev) => {
          ev.stopPropagation();
          this.lockedSwatches[idx] = !this.lockedSwatches[idx];
          this.generatePalette();
        });

        swatch.querySelector('.copy-swatch-btn')?.addEventListener('click', () => {
          storage.copyText(hex, `Copied ${hex}!`);
        });

        strip.appendChild(swatch);
      });
    },

    // ==========================================
    // 2. GRADIENT GENERATOR
    // ==========================================
    initGradient() {
      const gradColor1 = document.getElementById('grad-color-1');
      const gradColor2 = document.getElementById('grad-color-2');
      const gradAngle = document.getElementById('grad-angle-slider');
      const gradCanvas = document.getElementById('grad-preview-canvas');
      const gradCssOut = document.getElementById('grad-css-output');

      const update = () => {
        const c1 = gradColor1 ? gradColor1.value : '#6366f1';
        const c2 = gradColor2 ? gradColor2.value : '#ec4899';
        const a = gradAngle ? gradAngle.value : 135;

        const c1Hex = document.getElementById('grad-color-1-hex');
        const c2Hex = document.getElementById('grad-color-2-hex');
        const angleVal = document.getElementById('grad-angle-val');

        if (c1Hex) c1Hex.value = c1.toUpperCase();
        if (c2Hex) c2Hex.value = c2.toUpperCase();
        if (angleVal) angleVal.textContent = `${a}°`;

        const css = `linear-gradient(${a}deg, ${c1}, ${c2})`;
        if (gradCanvas) gradCanvas.style.background = css;
        if (gradCssOut) gradCssOut.textContent = `background: ${css};`;
      };

      gradColor1?.addEventListener('input', update);
      gradColor2?.addEventListener('input', update);
      gradAngle?.addEventListener('input', update);

      document.querySelectorAll('.grad-preset').forEach(btn => {
        btn.addEventListener('click', () => {
          if (gradColor1) gradColor1.value = btn.getAttribute('data-c1');
          if (gradColor2) gradColor2.value = btn.getAttribute('data-c2');
          update();
        });
      });

      document.getElementById('grad-copy-css-btn')?.addEventListener('click', () => {
        if (gradCssOut) storage.copyText(gradCssOut.textContent.trim(), 'Gradient CSS Copied!');
      });

      update();
    },

    // ==========================================
    // 3. WCAG CONTRAST CHECKER
    // ==========================================
    initContrast() {
      const fgPicker = document.getElementById('contrast-fg-picker');
      const bgPicker = document.getElementById('contrast-bg-picker');
      const fgHex = document.getElementById('contrast-fg-hex');
      const bgHex = document.getElementById('contrast-bg-hex');
      const previewCard = document.getElementById('contrast-sample-preview');

      const getLum = (r, g, b) => {
        const [rs, gs, bs] = [r, g, b].map(c => {
          c /= 255;
          return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
        });
        return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
      };

      const update = () => {
        const fg = fgPicker ? fgPicker.value : '#ffffff';
        const bg = bgPicker ? bgPicker.value : '#0d121f';

        if (fgHex) fgHex.value = fg.toUpperCase();
        if (bgHex) bgHex.value = bg.toUpperCase();
        if (previewCard) {
          previewCard.style.backgroundColor = bg;
          previewCard.style.color = fg;
        }

        const parseHex = h => {
          const num = parseInt(h.replace(/^#/, ''), 16);
          return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
        };

        const [r1, g1, b1] = parseHex(fg);
        const [r2, g2, b2] = parseHex(bg);
        const l1 = getLum(r1, g1, b1);
        const l2 = getLum(r2, g2, b2);
        const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);

        const scoreEl = document.getElementById('contrast-ratio-score');
        if (scoreEl) scoreEl.textContent = `${ratio.toFixed(2)} : 1`;

        const setBadge = (id, pass) => {
          const el = document.getElementById(id);
          if (el) {
            el.className = `p-2 rounded-lg font-semibold ${pass ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`;
            el.textContent = el.textContent.split(':')[0] + ': ' + (pass ? 'PASS' : 'FAIL');
          }
        };

        setBadge('contrast-badge-aa-normal', ratio >= 4.5);
        setBadge('contrast-badge-aa-large', ratio >= 3.0);
        setBadge('contrast-badge-aaa-normal', ratio >= 7.0);
        setBadge('contrast-badge-aaa-large', ratio >= 4.5);
      };

      fgPicker?.addEventListener('input', update);
      bgPicker?.addEventListener('input', update);
      update();
    },

    // ==========================================
    // 4. GLASSMORPHISM GENERATOR
    // ==========================================
    initGlassmorphism() {
      const glassOp = document.getElementById('glass-opacity-slider');
      const glassBlur = document.getElementById('glass-blur-slider');
      const glassBorder = document.getElementById('glass-border-slider');
      const glassCard = document.getElementById('interactive-glass-card');
      const glassCss = document.getElementById('glass-css-out');

      const update = () => {
        const op = glassOp ? glassOp.value : 0.75;
        const bl = glassBlur ? glassBlur.value : 16;
        const bo = glassBorder ? glassBorder.value : 0.08;

        const setTxt = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
        setTxt('glass-opacity-val', op);
        setTxt('glass-blur-val', `${bl}px`);
        setTxt('glass-border-val', bo);

        if (glassCard) {
          glassCard.style.backgroundColor = `rgba(13, 18, 31, ${op})`;
          glassCard.style.backdropFilter = `blur(${bl}px)`;
          glassCard.style.border = `1px solid rgba(255, 255, 255, ${bo})`;
        }
        if (glassCss) {
          glassCss.textContent = `background: rgba(13, 18, 31, ${op}); backdrop-filter: blur(${bl}px); border: 1px solid rgba(255, 255, 255, ${bo});`;
        }
      };

      glassOp?.addEventListener('input', update);
      glassBlur?.addEventListener('input', update);
      glassBorder?.addEventListener('input', update);

      document.getElementById('glass-copy-css-btn')?.addEventListener('click', () => {
        if (glassCss) storage.copyText(glassCss.textContent.trim(), 'Glassmorphism CSS Copied!');
      });

      update();
    }
  };

  window.Omnia.studio = studio;
})();
