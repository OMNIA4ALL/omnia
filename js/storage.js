/**
 * OMNIA Storage & Utility Module
 * Manages LocalStorage persistence, toast notifications, and safe clipboard copying.
 */
(function() {
  window.Omnia = window.Omnia || {};

  const storage = {
    /**
     * Safely reads an item from localStorage with JSON parsing and fallback.
     */
    get(key, fallback = null) {
      try {
        const item = window.localStorage.getItem(key);
        return item ? JSON.parse(item) : fallback;
      } catch (err) {
        console.warn(`[OMNIA Storage] Read error for "${key}":`, err);
        return fallback;
      }
    },

    /**
     * Safely writes an item to localStorage with JSON stringification.
     */
    set(key, val) {
      try {
        window.localStorage.setItem(key, JSON.stringify(val));
      } catch (err) {
        console.warn(`[OMNIA Storage] Write error for "${key}":`, err);
      }
    },

    /**
     * Removes an item from localStorage.
     */
    remove(key) {
      try {
        window.localStorage.removeItem(key);
      } catch (err) {
        console.warn(`[OMNIA Storage] Remove error for "${key}":`, err);
      }
    },

    /**
     * Displays a floating toast notification.
     * @param {string} msg
     * @param {'info' | 'success' | 'warning' | 'error'} type
     */
    showToast(msg, type = 'info') {
      const container = document.getElementById('toast-container');
      if (!container) return;

      const toast = document.createElement('div');
      const borderClass = type === 'success' 
        ? 'border-emerald-500/40 text-emerald-300' 
        : type === 'error' 
        ? 'border-rose-500/40 text-rose-300' 
        : type === 'warning' 
        ? 'border-amber-500/40 text-amber-300' 
        : 'border-indigo-500/40 text-indigo-300';

      const dotClass = type === 'success' 
        ? 'bg-emerald-400' 
        : type === 'error' 
        ? 'bg-rose-400' 
        : type === 'warning' 
        ? 'bg-amber-400' 
        : 'bg-indigo-400';

      toast.className = `px-4 py-2.5 rounded-xl bg-slate-900/95 backdrop-blur-md border ${borderClass} text-xs shadow-2xl flex items-center gap-2 transform transition-all duration-300 translate-y-2 opacity-0 select-none`;
      toast.innerHTML = `
        <span class="w-2 h-2 rounded-full ${dotClass}"></span>
        <span>${msg}</span>
      `;

      container.appendChild(toast);
      requestAnimationFrame(() => {
        toast.classList.remove('translate-y-2', 'opacity-0');
      });

      setTimeout(() => {
        toast.classList.add('opacity-0', 'translate-y-2');
        setTimeout(() => toast.remove(), 320);
      }, 3200);
    },

    /**
     * Safely copies text to the user's clipboard.
     */
    copyText(str, label = 'Copied to clipboard!') {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(str)
          .then(() => storage.showToast(label, 'success'))
          .catch(() => storage.fallbackCopy(str, label));
      } else {
        storage.fallbackCopy(str, label);
      }
    },

    /**
     * Legacy document.execCommand fallback for environments blocking navigator.clipboard.
     */
    fallbackCopy(str, label) {
      const el = document.createElement('textarea');
      el.value = str;
      el.style.position = 'fixed';
      el.style.opacity = '0';
      document.body.appendChild(el);
      el.select();
      try {
        document.execCommand('copy');
        storage.showToast(label, 'success');
      } catch (e) {
        storage.showToast('Unable to copy text', 'error');
      }
      document.body.removeChild(el);
    }
  };

  window.Omnia.storage = storage;
})();
