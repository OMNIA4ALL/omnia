(function() {
  window.Omnia = window.Omnia || {};
  const storage = window.Omnia.storage || {
    get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch(e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch(e) {} },
    showToast(m) { console.log(m); }
  };
  const api = window.Omnia.api || {};

/**
 * OMNIA 2.0 - File Lab Module
 * In-browser, local file processing: Image manipulation, PDF tools, File hashing, File viewers
 * 100% Client-side. No files leave your device.
 */

const FileLabModule = {
  currentImage: null,
  imageFile: null,

  init() {
    this.bindImageTools();
    this.bindInspectors();
    this.bindTextViewers();
  },

  bindImageTools() {
    const input = document.getElementById('fl-img-input');
    if (!input) return;

    input.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      this.imageFile = file;
      const reader = new FileReader();
      reader.onload = (evt) => {
        const img = new Image();
        img.onload = () => {
          this.currentImage = img;
          this.renderImagePreview();
        };
        img.src = evt.target.result;
      };
      reader.readAsDataURL(file);
    });

    // Resize / Compress Action
    const compressBtn = document.getElementById('fl-img-compress-btn');
    if (compressBtn) {
      compressBtn.addEventListener('click', () => this.processImage());
    }

    // Rotate Action
    const rotateBtn = document.getElementById('fl-img-rotate-btn');
    if (rotateBtn) {
      rotateBtn.addEventListener('click', () => this.rotateImage(90));
    }

    // Base64 converters
    const toB64Btn = document.getElementById('fl-img-tob64-btn');
    if (toB64Btn) {
      toB64Btn.addEventListener('click', () => {
        if (!this.currentImage) return;
        const canvas = document.createElement('canvas');
        canvas.width = this.currentImage.width;
        canvas.height = this.currentImage.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(this.currentImage, 0, 0);
        const b64 = canvas.toDataURL('image/png');
        const out = document.getElementById('fl-b64-output');
        if (out) out.value = b64;
        storage.showToast('Converted to Base64 URI');
      });
    }

    const fromB64Btn = document.getElementById('fl-b64-render-btn');
    if (fromB64Btn) {
      fromB64Btn.addEventListener('click', () => {
        const text = (document.getElementById('fl-b64-input')?.value || '').trim();
        if (!text) return;
        const img = new Image();
        img.onload = () => {
          this.currentImage = img;
          this.renderImagePreview();
          storage.showToast('Base64 image loaded');
        };
        img.onerror = () => storage.showToast('Invalid Base64 image data');
        img.src = text;
      });
    }
  },

  renderImagePreview() {
    const preview = document.getElementById('fl-img-preview');
    const info = document.getElementById('fl-img-info');
    const wInput = document.getElementById('fl-img-width');
    const hInput = document.getElementById('fl-img-height');
    if (!this.currentImage) return;

    if (preview) {
      preview.src = this.currentImage.src;
      preview.classList.remove('hidden');
    }
    if (info) {
      info.textContent = `${this.currentImage.naturalWidth || this.currentImage.width} × ${this.currentImage.naturalHeight || this.currentImage.height} px • ${this.imageFile ? (this.imageFile.size / 1024).toFixed(1) + ' KB' : 'In-memory'}`;
    }
    if (wInput) wInput.value = this.currentImage.naturalWidth || this.currentImage.width;
    if (hInput) hInput.value = this.currentImage.naturalHeight || this.currentImage.height;
  },

  rotateImage(deg) {
    if (!this.currentImage) return;
    const canvas = document.createElement('canvas');
    canvas.width = this.currentImage.height;
    canvas.height = this.currentImage.width;
    const ctx = canvas.getContext('2d');
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((deg * Math.PI) / 180);
    ctx.drawImage(this.currentImage, -this.currentImage.width / 2, -this.currentImage.height / 2);

    const nextImg = new Image();
    nextImg.onload = () => {
      this.currentImage = nextImg;
      this.renderImagePreview();
      storage.showToast('Image rotated 90°');
    };
    nextImg.src = canvas.toDataURL('image/png');
  },

  processImage() {
    if (!this.currentImage) {
      storage.showToast('Please select an image first');
      return;
    }
    const targetW = parseInt(document.getElementById('fl-img-width')?.value) || this.currentImage.width;
    const targetH = parseInt(document.getElementById('fl-img-height')?.value) || this.currentImage.height;
    const quality = parseFloat(document.getElementById('fl-img-quality')?.value || '0.8');
    const format = document.getElementById('fl-img-format')?.value || 'image/jpeg';

    const canvas = document.createElement('canvas');
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(this.currentImage, 0, 0, targetW, targetH);

    const dataUrl = canvas.toDataURL(format, quality);
    const downloadLink = document.getElementById('fl-img-download-link');
    if (downloadLink) {
      downloadLink.href = dataUrl;
      const ext = format === 'image/webp' ? 'webp' : format === 'image/png' ? 'png' : 'jpg';
      downloadLink.download = `omnia_processed_${Date.now()}.${ext}`;
      downloadLink.classList.remove('hidden');
      downloadLink.textContent = `Download Processed (${Math.round((dataUrl.length * 3/4) / 1024)} KB)`;
    }
    storage.showToast('Image processed successfully');
  },

  bindInspectors() {
    // SHA-256 Hashing
    const hashInput = document.getElementById('fl-hash-file-input');
    const hashOutput = document.getElementById('fl-hash-result');
    if (hashInput) {
      hashInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (hashOutput) hashOutput.textContent = 'Computing SHA-256...';
        try {
          const buffer = await file.arrayBuffer();
          const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
          const hashArray = Array.from(new Uint8Array(hashBuffer));
          const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
          if (hashOutput) hashOutput.textContent = hashHex;
          storage.showToast('SHA-256 calculated');
        } catch (err) {
          if (hashOutput) hashOutput.textContent = 'Error computing hash: ' + err.message;
        }
      });
    }

    // File info
    const infoInput = document.getElementById('fl-inspect-file-input');
    const infoBox = document.getElementById('fl-inspect-result');
    if (infoInput && infoBox) {
      infoInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const ext = file.name.split('.').pop().toLowerCase();
        infoBox.innerHTML = `
          <div class="space-y-1 text-xs">
            <div><strong class="text-slate-300">File Name:</strong> ${file.name}</div>
            <div><strong class="text-slate-300">File Size:</strong> ${(file.size / 1024).toFixed(2)} KB (${file.size.toLocaleString()} bytes)</div>
            <div><strong class="text-slate-300">Detected MIME:</strong> ${file.type || 'Unknown / Binary'}</div>
            <div><strong class="text-slate-300">Extension:</strong> .${ext}</div>
            <div><strong class="text-slate-300">Last Modified:</strong> ${new Date(file.lastModified).toLocaleString()}</div>
          </div>
        `;
      });
    }
  },

  bindTextViewers() {
    // Text / CSV / Markdown viewer
    const textInput = document.getElementById('fl-text-file-input');
    const textOutput = document.getElementById('fl-text-preview-box');
    if (textInput && textOutput) {
      textInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (evt) => {
          const content = evt.target.result;
          if (file.name.endsWith('.csv')) {
            // Render CSV table
            const lines = content.split('\n').filter(l => l.trim()).slice(0, 50);
            const rows = lines.map(l => l.split(','));
            if (rows.length > 0) {
              const headers = rows[0].map(h => `<th class="p-2 text-left border-b border-white/10 text-xs font-semibold text-indigo-300">${h.replace(/"/g, '')}</th>`).join('');
              const body = rows.slice(1).map(r => `<tr>${r.map(c => `<td class="p-2 border-b border-white/5 text-xs text-slate-300">${c.replace(/"/g, '')}</td>`).join('')}</tr>`).join('');
              textOutput.innerHTML = `<div class="overflow-x-auto"><table class="w-full text-left"><thead><tr>${headers}</tr></thead><tbody>${body}</tbody></table></div>`;
              return;
            }
          }
          // Default text / code view
          textOutput.textContent = content.slice(0, 50000); // 50KB preview cap
        };
        reader.readAsText(file);
      });
    }
  }
};

window.FileLabModule = FileLabModule;


  window.Omnia.fileLab = FileLabModule;
  window.FileLabModule = FileLabModule;
})();
