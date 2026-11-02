(function() {
  window.Omnia = window.Omnia || {};
  const storage = window.Omnia.storage || {
    get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch(e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch(e) {} },
    showToast(m) { console.log(m); }
  };
  const api = window.Omnia.api || {};

/**
 * OMNIA 2.0 - Code Playground Module
 * Sandboxed HTML/CSS/JS IDE, live execution, download, and developer tools
 */

const CodePlaygroundModule = {
  activeTab: 'html',

  init() {
    this.bindEditor();
    this.bindDevTools();
    this.runCode();
  },

  bindEditor() {
    // Tab switching
    const tabs = ['html', 'css', 'js'];
    tabs.forEach(t => {
      const btn = document.getElementById(`cp-tab-${t}`);
      const editor = document.getElementById(`cp-editor-${t}`);
      if (btn && editor) {
        btn.addEventListener('click', () => {
          tabs.forEach(x => {
            document.getElementById(`cp-tab-${x}`)?.classList.remove('bg-indigo-600', 'text-white');
            document.getElementById(`cp-tab-${x}`)?.classList.add('text-slate-400');
            document.getElementById(`cp-editor-${x}`)?.classList.add('hidden');
          });
          btn.classList.add('bg-indigo-600', 'text-white');
          btn.classList.remove('text-slate-400');
          editor.classList.remove('hidden');
          this.activeTab = t;
        });
      }
    });

    // Run action
    const runBtn = document.getElementById('cp-run-btn');
    if (runBtn) {
      runBtn.addEventListener('click', () => this.runCode());
    }

    // Reset action
    const resetBtn = document.getElementById('cp-reset-btn');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        document.getElementById('cp-editor-html').value = '<div class="box">\n  <h1>Hello OMNIA 2.0</h1>\n  <p>Live Code Playground</p>\n</div>';
        document.getElementById('cp-editor-css').value = 'body {\n  font-family: system-ui, sans-serif;\n  background: #0f172a;\n  color: #f8fafc;\n  display: grid;\n  place-items: center;\n  min-height: 90vh;\n}\n.box {\n  padding: 24px;\n  border-radius: 12px;\n  background: #1e293b;\n  box-shadow: 0 10px 25px rgba(0,0,0,0.5);\n  text-align: center;\n}\nh1 { color: #818cf8; margin-bottom: 8px; }';
        document.getElementById('cp-editor-js').value = 'console.log("Playground ready!");';
        this.runCode();
        storage.showToast('Playground reset');
      });
    }

    // Download action
    const dlBtn = document.getElementById('cp-download-btn');
    if (dlBtn) {
      dlBtn.addEventListener('click', () => {
        const html = document.getElementById('cp-editor-html')?.value || '';
        const css = document.getElementById('cp-editor-css')?.value || '';
        const js = document.getElementById('cp-editor-js')?.value || '';
        const fullDoc = `<!DOCTYPE html>\n<html>\n<head>\n  <meta charset="utf-8">\n  <title>OMNIA Project</title>\n  <style>\n${css}\n  </style>\n</head>\n<body>\n${html}\n  <script>\n${js}\n  <\\/script>\n</body>\n</html>`;
        const blob = new Blob([fullDoc], { type: 'text/html' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `omnia_project_${Date.now()}.html`;
        a.click();
        storage.showToast('Project downloaded');
      });
    }
  },

  runCode() {
    const iframe = document.getElementById('cp-preview-frame');
    if (!iframe) return;

    const html = document.getElementById('cp-editor-html')?.value || '';
    const css = document.getElementById('cp-editor-css')?.value || '';
    const js = document.getElementById('cp-editor-js')?.value || '';

    const content = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          ${css}
        </style>
      </head>
      <body>
        ${html}
        <script>
          try {
            ${js}
          } catch (e) {
            console.error(e);
          }
        <\\/script>
      </body>
      </html>
    `;

    iframe.srcdoc = content;
  },

  bindDevTools() {
    // JSON Formatter / Validator
    const jsonBtn = document.getElementById('cp-json-format-btn');
    if (jsonBtn) {
      jsonBtn.addEventListener('click', () => {
        const input = document.getElementById('cp-json-input');
        if (!input) return;
        try {
          const parsed = JSON.parse(input.value);
          input.value = JSON.stringify(parsed, null, 2);
          storage.showToast('Valid JSON formatted');
        } catch (e) {
          storage.showToast('Invalid JSON: ' + e.message);
        }
      });
    }

    // UUID Generator
    const uuidBtn = document.getElementById('cp-uuid-gen-btn');
    if (uuidBtn) {
      uuidBtn.addEventListener('click', () => {
        const out = document.getElementById('cp-uuid-output');
        if (out) {
          out.value = crypto.randomUUID();
          storage.showToast('Generated UUID v4');
        }
      });
    }

    // Timestamp Converter
    const tsBtn = document.getElementById('cp-ts-convert-btn');
    if (tsBtn) {
      tsBtn.addEventListener('click', () => {
        const inEl = document.getElementById('cp-ts-input');
        const outEl = document.getElementById('cp-ts-output');
        if (!inEl || !outEl) return;
        const val = parseInt(inEl.value);
        if (isNaN(val)) {
          // Current time
          outEl.textContent = new Date().toISOString();
        } else {
          const d = new Date(val > 1e11 ? val : val * 1000);
          outEl.textContent = `${d.toUTCString()} (Local: ${d.toLocaleString()})`;
        }
      });
    }

    // Base64 Encode / Decode
    const b64Enc = document.getElementById('cp-b64-enc-btn');
    const b64Dec = document.getElementById('cp-b64-dec-btn');
    if (b64Enc) {
      b64Enc.addEventListener('click', () => {
        const text = document.getElementById('cp-b64-txt')?.value || '';
        document.getElementById('cp-b64-txt').value = btoa(text);
      });
    }
    if (b64Dec) {
      b64Dec.addEventListener('click', () => {
        const text = document.getElementById('cp-b64-txt')?.value || '';
        try {
          document.getElementById('cp-b64-txt').value = atob(text);
        } catch (e) {
          storage.showToast('Invalid Base64 sequence');
        }
      });
    }
  }
};

window.CodePlaygroundModule = CodePlaygroundModule;


  window.Omnia.codePlayground = CodePlaygroundModule;
  window.CodePlaygroundModule = CodePlaygroundModule;
})();
