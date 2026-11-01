/**
 * OMNIA Tools Module
 * Full client-side implementation of 10 everyday digital utilities.
 */
(function() {
  window.Omnia = window.Omnia || {};
  const storage = window.Omnia.storage;

  const tools = {
    init() {
      this.bindTabSwitching();
      this.initSearchBar();
      this.initQr();
      this.initWordCounter();
      this.initCharCounter();
      this.initJsonFormatter();
      this.initBase64();
      this.initUnitConverter();
      this.initColorConverter();
      this.initPasswordChecker();
      this.initPercentageCalc();
      this.initAgeCalc();
    },

    initSearchBar() {
      const searchInput = document.getElementById('tools-search-bar');
      const clearBtn = document.getElementById('tools-search-clear-btn');
      if (!searchInput) return;

      const toolKeywords = {
        qr: ['qr', 'barcode', 'code', 'generator', 'png', 'link', 'download'],
        word: ['word', 'words', 'counter', 'count', 'reading', 'sentences', 'paragraphs'],
        char: ['char', 'character', 'characters', 'letters', 'vowels', 'consonants', 'digits'],
        json: ['json', 'format', 'formatter', 'validator', 'minify', 'prettify'],
        base64: ['base64', 'encode', 'decode', 'binary', 'urlsafe', 'string'],
        unit: ['unit', 'converter', 'metric', 'imperial', 'length', 'mass', 'weight', 'temperature', 'speed', 'area', 'data'],
        color: ['color', 'converter', 'hex', 'rgb', 'hsl', 'hsv', 'cmyk', 'picker', 'palette'],
        password: ['password', 'generator', 'checker', 'strength', 'entropy', 'security', 'crypto'],
        percentage: ['percentage', 'percent', 'calc', 'calculator', 'ratio', 'discount', 'tax', 'increase', 'decrease'],
        age: ['age', 'calculator', 'birthday', 'chronological', 'dob', 'date', 'milestone', 'days', 'hours']
      };

      const filterTools = (query) => {
        const q = query.toLowerCase().trim();
        if (clearBtn) clearBtn.classList.toggle('hidden', q.length === 0);

        const tabs = document.querySelectorAll('.tool-tab');
        let firstMatch = null;
        let activeMatch = false;

        tabs.forEach(tab => {
          const toolId = tab.getAttribute('data-tool');
          const name = tab.textContent.toLowerCase();
          const keywords = toolKeywords[toolId] || [];

          const matches = q.length === 0 || name.includes(q) || keywords.some(k => k.includes(q));
          tab.classList.toggle('hidden', !matches);

          if (matches) {
            if (!firstMatch) firstMatch = toolId;
            if (tab.classList.contains('active')) activeMatch = true;
          }
        });

        // Auto switch to first match if current active tool is hidden by search
        if (q.length > 0 && !activeMatch && firstMatch) {
          this.switchTool(firstMatch);
        }
      };

      searchInput.addEventListener('input', (e) => filterTools(e.target.value));
      clearBtn?.addEventListener('click', () => {
        searchInput.value = '';
        filterTools('');
        searchInput.focus();
      });
    },

    bindTabSwitching() {
      const tabs = document.querySelectorAll('.tool-tab');
      tabs.forEach(tab => {
        tab.addEventListener('click', () => {
          this.switchTool(tab.getAttribute('data-tool'));
        });
      });
    },

    switchTool(toolId) {
      const tabs = document.querySelectorAll('.tool-tab');
      tabs.forEach(t => {
        const matches = t.getAttribute('data-tool') === toolId;
        t.classList.toggle('active', matches);
        t.classList.toggle('bg-indigo-600', matches);
        t.classList.toggle('text-white', matches);
        t.classList.toggle('bg-slate-800/80', !matches);
        t.classList.toggle('text-slate-300', !matches);
      });

      document.querySelectorAll('.tool-panel').forEach(p => {
        p.classList.toggle('hidden', p.id !== `tool-panel-${toolId}`);
      });

      if (window.Omnia.navigation) {
        window.Omnia.navigation.setActiveTool(toolId);
      }
    },

    // ==========================================
    // 1. QR CODE GENERATOR
    // ==========================================
    initQr() {
      const input = document.getElementById('qr-input-text');
      const sizeSel = document.getElementById('qr-size-select');
      const colorInput = document.getElementById('qr-color-input');
      const colorVal = document.getElementById('qr-color-val');

      const render = () => {
        const text = input ? input.value : 'https://omnia.app';
        const size = sizeSel ? parseInt(sizeSel.value) : 260;
        const color = colorInput ? colorInput.value : '#000000';
        if (colorVal) colorVal.textContent = color;
        this.renderQrCanvas(text, size, color);
      };

      input?.addEventListener('input', render);
      sizeSel?.addEventListener('change', render);
      colorInput?.addEventListener('input', render);

      document.getElementById('qr-generate-btn')?.addEventListener('click', () => {
        render();
        storage.showToast('Regenerated QR Code', 'success');
      });

      document.getElementById('qr-download-btn')?.addEventListener('click', () => {
        const canvas = document.getElementById('qr-canvas');
        if (!canvas) return;
        const a = document.createElement('a');
        a.download = 'omnia-qr.png';
        a.href = canvas.toDataURL('image/png');
        a.click();
        storage.showToast('Downloaded QR Code PNG', 'success');
      });

      document.getElementById('qr-copy-btn')?.addEventListener('click', () => {
        const canvas = document.getElementById('qr-canvas');
        if (!canvas) return;
        storage.copyText(canvas.toDataURL('image/png'), 'Copied QR Data URL!');
      });

      render();
    },

    renderQrCanvas(text, size, color) {
      const canvas = document.getElementById('qr-canvas');
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      canvas.width = size;
      canvas.height = size;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, size, size);

      if (!text) text = 'https://omnia.app';

      const n = text.length < 15 ? 21 : text.length < 32 ? 25 : 29;
      const matrix = Array.from({ length: n }, () => Array(n).fill(false));

      const drawFinder = (r0, c0) => {
        for (let r = -1; r <= 7; r++) {
          for (let c = -1; c <= 7; c++) {
            const nr = r0 + r, nc = c0 + c;
            if (nr >= 0 && nr < n && nc >= 0 && nc < n) {
              if (r >= 0 && r <= 6 && c >= 0 && c <= 6) {
                matrix[nr][nc] = (r === 0 || r === 6 || c === 0 || c === 6 || (r >= 2 && r <= 4 && c >= 2 && c <= 4));
              } else {
                matrix[nr][nc] = false;
              }
            }
          }
        }
      };

      drawFinder(0, 0);
      drawFinder(0, n - 7);
      drawFinder(n - 7, 0);

      for (let i = 8; i < n - 8; i++) {
        matrix[6][i] = i % 2 === 0;
        matrix[i][6] = i % 2 === 0;
      }

      const bytes = new TextEncoder().encode(text);
      let byteIdx = 0, bitIdx = 0;

      for (let c = n - 1; c > 0; c -= 2) {
        if (c === 6) c--;
        for (let count = 0; count < n; count++) {
          const r = ((c + 1) / 2) % 2 === 0 ? count : n - 1 - count;
          for (let offset = 0; offset < 2; offset++) {
            const col = c - offset;
            const isFinder = (r <= 8 && col <= 8) || (r <= 8 && col >= n - 9) || (r >= n - 9 && col <= 8) || r === 6 || col === 6;
            if (isFinder) continue;

            let bit = false;
            if (byteIdx < bytes.length) {
              bit = Boolean((bytes[byteIdx] >> (7 - bitIdx)) & 1);
              bitIdx++;
              if (bitIdx === 8) { bitIdx = 0; byteIdx++; }
            } else {
              bit = (r + col) % 3 === 0;
            }
            const mask = (r + col) % 2 === 0;
            matrix[r][col] = bit ? !mask : mask;
          }
        }
      }

      const cell = size / n;
      ctx.fillStyle = color;
      for (let r = 0; r < n; r++) {
        for (let c = 0; c < n; c++) {
          if (matrix[r][c]) {
            ctx.fillRect(Math.round(c * cell), Math.round(r * cell), Math.ceil(cell), Math.ceil(cell));
          }
        }
      }
    },

    // ==========================================
    // 2. WORD COUNTER
    // ==========================================
    initWordCounter() {
      const text = document.getElementById('word-textarea');
      const update = () => {
        if (!text) return;
        const val = text.value;
        const words = val.trim() ? val.trim().split(/\s+/).length : 0;
        const chars = val.length;
        const charsNoSpace = val.replace(/\s/g, '').length;
        const sentences = val.trim() ? val.split(/[.!?]+/).filter(Boolean).length : 0;
        const paragraphs = val.trim() ? val.split(/\n+/).filter(Boolean).length : 0;
        const readTime = Math.ceil(words / 200);

        const setVal = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
        setVal('word-stat-words', words.toLocaleString());
        setVal('word-stat-chars', chars.toLocaleString());
        setVal('word-stat-nospace', charsNoSpace.toLocaleString());
        setVal('word-stat-sentences', sentences.toLocaleString());
        setVal('word-stat-paragraphs', paragraphs.toLocaleString());
        setVal('word-stat-reading', `${readTime}m`);
      };

      text?.addEventListener('input', update);
      document.getElementById('word-sample-btn')?.addEventListener('click', () => {
        if (text) {
          text.value = 'OMNIA is a unified digital ecosystem designed to bring useful internet-based tools, scientific instruments, and focus experiences together in one interface. With privacy-conscious architecture, zero tracking, and instant execution, Omnia elevates daily productivity.';
          update();
        }
      });
      document.getElementById('word-clear-btn')?.addEventListener('click', () => {
        if (text) { text.value = ''; update(); }
      });
      update();
    },

    // ==========================================
    // 3. CHARACTER COUNTER
    // ==========================================
    initCharCounter() {
      const text = document.getElementById('char-textarea');
      const update = () => {
        if (!text) return;
        const val = text.value;
        let letters = 0, vowels = 0, consonants = 0, digits = 0;
        const vList = 'aeiouAEIOU';

        for (let ch of val) {
          if (/[a-zA-Z]/.test(ch)) {
            letters++;
            if (vList.includes(ch)) vowels++;
            else consonants++;
          } else if (/[0-9]/.test(ch)) {
            digits++;
          }
        }

        const setVal = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
        setVal('char-stat-letters', letters);
        setVal('char-stat-vowels', vowels);
        setVal('char-stat-consonants', consonants);
        setVal('char-stat-digits', digits);
      };

      text?.addEventListener('input', update);
      update();
    },

    // ==========================================
    // 4. JSON FORMATTER & VALIDATOR
    // ==========================================
    initJsonFormatter() {
      const jsonText = document.getElementById('json-textarea');
      const jsonStatus = document.getElementById('json-status-badge');
      const jsonErr = document.getElementById('json-error-banner');

      const validate = () => {
        if (!jsonText || !jsonStatus || !jsonErr) return;
        const val = jsonText.value.trim();
        if (!val) {
          jsonStatus.textContent = 'Empty';
          jsonStatus.className = 'text-[10px] px-2 py-0.5 rounded font-mono bg-slate-800 text-slate-400';
          jsonErr.classList.add('hidden');
          return;
        }
        try {
          JSON.parse(val);
          jsonStatus.textContent = 'Valid JSON';
          jsonStatus.className = 'text-[10px] px-2 py-0.5 rounded font-mono bg-emerald-500/20 text-emerald-400';
          jsonErr.classList.add('hidden');
        } catch (e) {
          jsonStatus.textContent = 'Syntax Error';
          jsonStatus.className = 'text-[10px] px-2 py-0.5 rounded font-mono bg-rose-500/20 text-rose-400';
          jsonErr.textContent = e.message;
          jsonErr.classList.remove('hidden');
        }
      };

      jsonText?.addEventListener('input', validate);

      document.getElementById('json-prettify-btn')?.addEventListener('click', () => {
        try {
          const parsed = JSON.parse(jsonText.value);
          jsonText.value = JSON.stringify(parsed, null, 2);
          validate();
          storage.showToast('JSON Formatted (2 spaces)', 'success');
        } catch (e) {
          storage.showToast('Invalid JSON: ' + e.message, 'error');
        }
      });

      document.getElementById('json-minify-btn')?.addEventListener('click', () => {
        try {
          const parsed = JSON.parse(jsonText.value);
          jsonText.value = JSON.stringify(parsed);
          validate();
          storage.showToast('JSON Minified', 'success');
        } catch (e) {
          storage.showToast('Invalid JSON: ' + e.message, 'error');
        }
      });

      document.getElementById('json-copy-btn')?.addEventListener('click', () => {
        if (jsonText) storage.copyText(jsonText.value, 'JSON Copied!');
      });

      document.getElementById('json-clear-btn')?.addEventListener('click', () => {
        if (jsonText) { jsonText.value = ''; validate(); }
      });

      document.getElementById('json-sample-btn')?.addEventListener('click', () => {
        if (jsonText) {
          jsonText.value = JSON.stringify({
            platform: 'OMNIA',
            version: '1.0.0',
            modules: ['Tools', 'Earth', 'Network', 'Learn', 'Device', 'Studio', 'Focus'],
            architecture: { clientSide: true, cloudReady: true }
          }, null, 2);
          validate();
        }
      });

      validate();
    },

    // ==========================================
    // 5. BASE64 CONVERTER
    // ==========================================
    initBase64() {
      const b64Plain = document.getElementById('base64-plain-input');
      const b64Encoded = document.getElementById('base64-encoded-input');
      const b64UrlSafe = document.getElementById('base64-urlsafe-chk');

      document.getElementById('base64-encode-btn')?.addEventListener('click', () => {
        if (!b64Plain || !b64Encoded) return;
        try {
          let encoded = btoa(unescape(encodeURIComponent(b64Plain.value)));
          if (b64UrlSafe && b64UrlSafe.checked) {
            encoded = encoded.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
          }
          b64Encoded.value = encoded;
          storage.showToast('Text Encoded to Base64', 'success');
        } catch (e) {
          storage.showToast('Encoding Error: ' + e.message, 'error');
        }
      });

      document.getElementById('base64-decode-btn')?.addEventListener('click', () => {
        if (!b64Plain || !b64Encoded) return;
        try {
          let str = b64Encoded.value.trim();
          str = str.replace(/-/g, '+').replace(/_/g, '/');
          while (str.length % 4) str += '=';
          const decoded = decodeURIComponent(escape(atob(str)));
          b64Plain.value = decoded;
          storage.showToast('Base64 Decoded to Text', 'success');
        } catch (e) {
          storage.showToast('Invalid Base64 string', 'error');
        }
      });

      document.getElementById('base64-swap-btn')?.addEventListener('click', () => {
        if (!b64Plain || !b64Encoded) return;
        const temp = b64Plain.value;
        b64Plain.value = b64Encoded.value;
        b64Encoded.value = temp;
      });
    },

    // ==========================================
    // 6. UNIT CONVERTER
    // ==========================================
    initUnitConverter() {
      const UNIT_DATA = {
        length: {
          units: { m: 1, km: 1000, cm: 0.01, mm: 0.001, mi: 1609.344, yd: 0.9144, ft: 0.3048, in: 0.0254 },
          names: { m: 'Meters (m)', km: 'Kilometers (km)', cm: 'Centimeters (cm)', mm: 'Millimeters (mm)', mi: 'Miles (mi)', yd: 'Yards (yd)', ft: 'Feet (ft)', in: 'Inches (in)' }
        },
        mass: {
          units: { kg: 1, g: 0.001, mg: 0.000001, lb: 0.45359237, oz: 0.028349523, ton: 1000 },
          names: { kg: 'Kilograms (kg)', g: 'Grams (g)', mg: 'Milligrams (mg)', lb: 'Pounds (lb)', oz: 'Ounces (oz)', ton: 'Metric Tons' }
        },
        temp: {
          special: true,
          units: ['c', 'f', 'k'],
          names: { c: 'Celsius (°C)', f: 'Fahrenheit (°F)', k: 'Kelvin (K)' }
        },
        speed: {
          units: { mps: 1, kmh: 0.277778, mph: 0.44704, knot: 0.514444 },
          names: { mps: 'Meters/sec (m/s)', kmh: 'Kilometers/hour (km/h)', mph: 'Miles/hour (mph)', knot: 'Knots (kn)' }
        },
        area: {
          units: { sqm: 1, sqkm: 1000000, sqft: 0.092903, acre: 4046.86, hectare: 10000 },
          names: { sqm: 'Square Meters (m²)', sqkm: 'Square Kilometers (km²)', sqft: 'Square Feet (ft²)', acre: 'Acres', hectare: 'Hectares' }
        },
        data: {
          units: { b: 1, kb: 1024, mb: 1048576, gb: 1073741824, tb: 1099511627776 },
          names: { b: 'Bytes (B)', kb: 'Kilobytes (KB)', mb: 'Megabytes (MB)', gb: 'Gigabytes (GB)', tb: 'Terabytes (TB)' }
        }
      };

      let currentCat = 'length';
      const leftSelect = document.getElementById('unit-left-select');
      const rightSelect = document.getElementById('unit-right-select');
      const leftVal = document.getElementById('unit-left-val');
      const rightVal = document.getElementById('unit-right-val');
      const formulaHint = document.getElementById('unit-formula-info');

      const populate = () => {
        if (!leftSelect || !rightSelect) return;
        leftSelect.innerHTML = '';
        rightSelect.innerHTML = '';
        const cat = UNIT_DATA[currentCat];
        const keys = cat.special ? cat.units : Object.keys(cat.units);

        keys.forEach((k, idx) => {
          const opt1 = new Option(cat.names[k], k);
          const opt2 = new Option(cat.names[k], k);
          if (idx === 0) opt1.selected = true;
          if (idx === 1) opt2.selected = true;
          leftSelect.appendChild(opt1);
          rightSelect.appendChild(opt2);
        });
        convert();
      };

      const convert = () => {
        if (!leftVal || !rightVal || !leftSelect || !rightSelect) return;
        const v = parseFloat(leftVal.value);
        if (isNaN(v)) { rightVal.value = ''; return; }

        const u1 = leftSelect.value;
        const u2 = rightSelect.value;
        const cat = UNIT_DATA[currentCat];

        let res = v;
        if (cat.special) {
          let celsius = v;
          if (u1 === 'f') celsius = (v - 32) * (5 / 9);
          else if (u1 === 'k') celsius = v - 273.15;

          if (u2 === 'c') res = celsius;
          else if (u2 === 'f') res = (celsius * 9 / 5) + 32;
          else if (u2 === 'k') res = celsius + 273.15;
        } else {
          const base = v * cat.units[u1];
          res = base / cat.units[u2];
        }

        rightVal.value = parseFloat(res.toPrecision(8));
        if (formulaHint) {
          formulaHint.textContent = `1 ${u1} = ${(cat.special ? 'special relation' : (cat.units[u1] / cat.units[u2]).toPrecision(6))} ${u2}`;
        }
      };

      document.querySelectorAll('.unit-cat-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          document.querySelectorAll('.unit-cat-btn').forEach(b => {
            b.classList.remove('active', 'bg-indigo-600', 'text-white');
            b.classList.add('bg-slate-800', 'text-slate-300');
          });
          btn.classList.add('active', 'bg-indigo-600', 'text-white');
          btn.classList.remove('bg-slate-800', 'text-slate-300');
          currentCat = btn.getAttribute('data-cat');
          populate();
        });
      });

      leftVal?.addEventListener('input', convert);
      leftSelect?.addEventListener('change', convert);
      rightSelect?.addEventListener('change', convert);

      document.getElementById('unit-swap-btn')?.addEventListener('click', () => {
        if (!leftSelect || !rightSelect) return;
        const t = leftSelect.value;
        leftSelect.value = rightSelect.value;
        rightSelect.value = t;
        convert();
      });

      populate();
    },

    // ==========================================
    // 7. COLOR CONVERTER
    // ==========================================
    initColorConverter() {
      const hexIn = document.getElementById('color-hex-input');
      const rSlider = document.getElementById('color-r-slider');
      const gSlider = document.getElementById('color-g-slider');
      const bSlider = document.getElementById('color-b-slider');
      const nativePicker = document.getElementById('color-native-picker');
      const previewBox = document.getElementById('color-preview-box');

      const updateFromRgb = (r, g, b) => {
        r = Math.max(0, Math.min(255, r));
        g = Math.max(0, Math.min(255, g));
        b = Math.max(0, Math.min(255, b));

        const hex = '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('').toUpperCase();
        if (hexIn) hexIn.value = hex;
        if (nativePicker) nativePicker.value = hex;
        if (previewBox) previewBox.style.backgroundColor = hex;

        const setTxt = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
        setTxt('color-r-val', r);
        setTxt('color-g-val', g);
        setTxt('color-b-val', b);

        if (rSlider) rSlider.value = r;
        if (gSlider) gSlider.value = g;
        if (bSlider) bSlider.value = b;

        setTxt('color-out-rgb', `rgb(${r}, ${g}, ${b})`);

        // HSL
        const rn = r / 255, gn = g / 255, bn = b / 255;
        const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn);
        let h = 0, s = 0, l = (max + min) / 2;
        if (max !== min) {
          const d = max - min;
          s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
          if (max === rn) h = (gn - bn) / d + (gn < bn ? 6 : 0);
          else if (max === gn) h = (bn - rn) / d + 2;
          else h = (rn - gn) / d + 4;
          h /= 6;
        }
        setTxt('color-out-hsl', `hsl(${Math.round(h * 360)}, ${Math.round(s * 100)}%, ${Math.round(l * 100)}%)`);

        // HSV
        const sv = max === 0 ? 0 : (max - min) / max;
        setTxt('color-out-hsv', `hsv(${Math.round(h * 360)}, ${Math.round(sv * 100)}%, ${Math.round(max * 100)}%)`);

        // CMYK
        const k = 1 - max;
        const c = k === 1 ? 0 : (1 - rn - k) / (1 - k);
        const m = k === 1 ? 0 : (1 - gn - k) / (1 - k);
        const y = k === 1 ? 0 : (1 - bn - k) / (1 - k);
        setTxt('color-out-cmyk', `cmyk(${Math.round(c * 100)}%, ${Math.round(m * 100)}%, ${Math.round(y * 100)}%, ${Math.round(k * 100)}%)`);
      };

      const updateFromHex = (hex) => {
        hex = hex.replace(/^#/, '');
        if (hex.length === 3) hex = hex.split('').map(x => x + x).join('');
        if (hex.length === 6) {
          const num = parseInt(hex, 16);
          if (!isNaN(num)) {
            updateFromRgb((num >> 16) & 255, (num >> 8) & 255, num & 255);
          }
        }
      };

      hexIn?.addEventListener('input', (e) => updateFromHex(e.target.value));
      nativePicker?.addEventListener('input', (e) => updateFromHex(e.target.value));

      [rSlider, gSlider, bSlider].forEach(slider => {
        slider?.addEventListener('input', () => {
          updateFromRgb(parseInt(rSlider.value), parseInt(gSlider.value), parseInt(bSlider.value));
        });
      });

      document.getElementById('color-copy-hex-btn')?.addEventListener('click', () => {
        if (hexIn) storage.copyText(hexIn.value, 'HEX Color Copied!');
      });

      updateFromHex('#6366F1');
    },

    // ==========================================
    // 8. PASSWORD STRENGTH & GENERATOR
    // ==========================================
    initPasswordChecker() {
      const pwdIn = document.getElementById('pwd-input');
      const meter = document.getElementById('pwd-strength-meter');
      const label = document.getElementById('pwd-strength-label');
      const entropyEl = document.getElementById('pwd-entropy-label');
      const crackEl = document.getElementById('pwd-crack-time');

      const evaluate = () => {
        if (!pwdIn) return;
        const val = pwdIn.value;
        const len = val.length;

        const hasLower = /[a-z]/.test(val);
        const hasUpper = /[A-Z]/.test(val);
        const hasNum = /[0-9]/.test(val);
        const hasSym = /[^a-zA-Z0-9]/.test(val);
        const isLong = len >= 12;

        const setCheck = (id, valid) => {
          const el = document.getElementById(id);
          if (el && el.firstElementChild) {
            el.firstElementChild.className = `w-2 h-2 rounded-full ${valid ? 'bg-emerald-400' : 'bg-slate-600'}`;
          }
        };

        setCheck('pwd-chk-len', isLong);
        setCheck('pwd-chk-lower', hasLower);
        setCheck('pwd-chk-upper', hasUpper);
        setCheck('pwd-chk-num', hasNum);
        setCheck('pwd-chk-sym', hasSym);

        if (len === 0) {
          if (meter) meter.style.width = '0%';
          if (label) { label.textContent = 'Empty'; label.className = 'text-rose-400 font-semibold'; }
          if (entropyEl) entropyEl.textContent = '0 bits';
          if (crackEl) crackEl.textContent = 'Instant';
          return;
        }

        let pool = 0;
        if (hasLower) pool += 26;
        if (hasUpper) pool += 26;
        if (hasNum) pool += 10;
        if (hasSym) pool += 32;

        const entropy = Math.round(len * Math.log2(pool || 1));
        if (entropyEl) entropyEl.textContent = `${entropy} bits`;

        let str = 'Very Weak', color = 'bg-rose-500', textCol = 'text-rose-400', pct = 15;
        let crack = 'Instant';

        if (entropy >= 80) {
          str = 'Very Strong'; color = 'bg-emerald-500'; textCol = 'text-emerald-400'; pct = 100;
          crack = 'Millions of years';
        } else if (entropy >= 60) {
          str = 'Strong'; color = 'bg-indigo-500'; textCol = 'text-indigo-400'; pct = 75;
          crack = 'Thousands of years';
        } else if (entropy >= 45) {
          str = 'Fair'; color = 'bg-amber-500'; textCol = 'text-amber-400'; pct = 50;
          crack = 'A few months';
        } else if (entropy >= 25) {
          str = 'Weak'; color = 'bg-orange-500'; textCol = 'text-orange-400'; pct = 30;
          crack = 'A few hours';
        }

        if (meter) {
          meter.style.width = `${pct}%`;
          meter.className = `h-full ${color} transition-all duration-300`;
        }
        if (label) {
          label.textContent = str;
          label.className = `${textCol} font-semibold`;
        }
        if (crackEl) crackEl.textContent = crack;
      };

      pwdIn?.addEventListener('input', evaluate);

      document.getElementById('pwd-toggle-visibility-btn')?.addEventListener('click', () => {
        if (!pwdIn) return;
        pwdIn.type = pwdIn.type === 'password' ? 'text' : 'password';
      });

      // Generator
      const lenSlider = document.getElementById('pwd-gen-len-slider');
      const lenVal = document.getElementById('pwd-gen-len-val');
      const resultIn = document.getElementById('pwd-gen-result');

      const generate = () => {
        const len = lenSlider ? parseInt(lenSlider.value) : 16;
        if (lenVal) lenVal.textContent = len;

        const useUpper = document.getElementById('pwd-opt-upper')?.checked;
        const useLower = document.getElementById('pwd-opt-lower')?.checked;
        const useNum = document.getElementById('pwd-opt-num')?.checked;
        const useSym = document.getElementById('pwd-opt-sym')?.checked;

        let chars = '';
        if (useLower) chars += 'abcdefghijklmnopqrstuvwxyz';
        if (useUpper) chars += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        if (useNum) chars += '0123456789';
        if (useSym) chars += '!@#$%^&*()_+-=[]{}|;:,.<>?';
        if (!chars) chars = 'abcdefghijklmnopqrstuvwxyz0123456789';

        const array = new Uint32Array(len);
        crypto.getRandomValues(array);
        let pwd = '';
        for (let i = 0; i < len; i++) {
          pwd += chars[array[i] % chars.length];
        }
        if (resultIn) resultIn.value = pwd;
      };

      lenSlider?.addEventListener('input', generate);
      ['pwd-opt-upper', 'pwd-opt-lower', 'pwd-opt-num', 'pwd-opt-sym'].forEach(id => {
        document.getElementById(id)?.addEventListener('change', generate);
      });

      document.getElementById('pwd-generate-new-btn')?.addEventListener('click', () => {
        generate();
        storage.showToast('Generated Secure Password', 'success');
      });

      document.getElementById('pwd-gen-copy-btn')?.addEventListener('click', () => {
        if (resultIn) storage.copyText(resultIn.value, 'Password Copied!');
      });

      generate();
      evaluate();
    },

    // ==========================================
    // 9. PERCENTAGE CALCULATOR
    // ==========================================
    initPercentageCalc() {
      const update = () => {
        // Mode 1: What is X% of Y?
        const p1x = parseFloat(document.getElementById('pct-p1-x')?.value || 0);
        const p1y = parseFloat(document.getElementById('pct-p1-y')?.value || 0);
        const r1 = document.getElementById('pct-p1-result');
        if (r1) r1.textContent = `= ${(p1x * p1y / 100).toFixed(2)}`;

        // Mode 2: X is what % of Y?
        const p2x = parseFloat(document.getElementById('pct-p2-x')?.value || 0);
        const p2y = parseFloat(document.getElementById('pct-p2-y')?.value || 1);
        const r2 = document.getElementById('pct-p2-result');
        if (r2) r2.textContent = `= ${(p2x / p2y * 100).toFixed(2)}%`;

        // Mode 3: Percentage Change
        const p3x = parseFloat(document.getElementById('pct-p3-x')?.value || 0);
        const p3y = parseFloat(document.getElementById('pct-p3-y')?.value || 0);
        const diff = p3y - p3x;
        const change = p3x !== 0 ? (diff / p3x * 100).toFixed(2) : 0;
        const r3 = document.getElementById('pct-p3-result');
        if (r3) r3.textContent = `= ${change >= 0 ? '+' : ''}${change}% ${diff >= 0 ? 'increase' : 'decrease'}`;

        // Mode 4: Discount & Tax
        const price = parseFloat(document.getElementById('pct-p4-x')?.value || 0);
        const disc = parseFloat(document.getElementById('pct-p4-y')?.value || 0);
        const savings = price * (disc / 100);
        const finalP = price - savings;
        const r4 = document.getElementById('pct-p4-result');
        if (r4) r4.textContent = `Final: $${finalP.toFixed(2)} (Save $${savings.toFixed(2)})`;
      };

      ['pct-p1-x', 'pct-p1-y', 'pct-p2-x', 'pct-p2-y', 'pct-p3-x', 'pct-p3-y', 'pct-p4-x', 'pct-p4-y'].forEach(id => {
        document.getElementById(id)?.addEventListener('input', update);
      });

      update();
    },

    // ==========================================
    // 10. AGE CALCULATOR
    // ==========================================
    initAgeCalc() {
      const calc = () => {
        const input = document.getElementById('age-dob-input');
        if (!input || !input.value) return;
        const dob = new Date(input.value);
        const now = new Date();

        if (isNaN(dob.getTime()) || dob > now) {
          storage.showToast('Please select a valid date in the past', 'warning');
          return;
        }

        let years = now.getFullYear() - dob.getFullYear();
        let months = now.getMonth() - dob.getMonth();
        let days = now.getDate() - dob.getDate();

        if (days < 0) {
          months--;
          const prevMonth = new Date(now.getFullYear(), now.getMonth(), 0);
          days += prevMonth.getDate();
        }
        if (months < 0) {
          years--;
          months += 12;
        }

        const exactStr = document.getElementById('age-exact-str');
        if (exactStr) exactStr.textContent = `${years} years, ${months} months, ${days} days`;

        const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const weekdayStr = document.getElementById('age-weekday-str');
        if (weekdayStr) weekdayStr.textContent = `Born on a ${daysOfWeek[dob.getDay()]}`;

        const diffMs = now.getTime() - dob.getTime();
        const totalDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        const totalHours = Math.floor(diffMs / (1000 * 60 * 60));
        const totalMins = Math.floor(diffMs / (1000 * 60));

        const setTxt = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
        setTxt('age-total-days', totalDays.toLocaleString());
        setTxt('age-total-hours', totalHours.toLocaleString());
        setTxt('age-total-mins', totalMins.toLocaleString());

        let nextBday = new Date(now.getFullYear(), dob.getMonth(), dob.getDate());
        if (nextBday < now) nextBday.setFullYear(now.getFullYear() + 1);
        const daysToNext = Math.ceil((nextBday.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        setTxt('age-next-bday', `${daysToNext} days`);
      };

      document.getElementById('age-calculate-btn')?.addEventListener('click', () => {
        calc();
        storage.showToast('Calculated chronological age', 'success');
      });

      calc();
    }
  };

  window.Omnia.tools = tools;
})();
