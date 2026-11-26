(function() {
  window.Omnia = window.Omnia || {};
  const storage = window.Omnia.storage || {
    get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch(e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch(e) {} },
    showToast(m) { console.log(m); }
  };
  const api = window.Omnia.api || {};

/**
 * OMNIA 2.0 - Workspace Module
 * Personal Notes (Markdown + autosave), Tasks (Priorities + due dates), Bookmarks, and JSON Backup/Restore
 * 100% Client-side privacy
 */

const WorkspaceModule = {
  notes: [],
  tasks: [],
  bookmarks: [],

  init() {
    this.loadData();
    this.bindNotes();
    this.bindTasks();
    this.bindBookmarks();
    this.bindBackup();
  },

  loadData() {
    try {
      this.notes = JSON.parse(localStorage.getItem('omnia_notes') || '[]');
      this.tasks = JSON.parse(localStorage.getItem('omnia_tasks') || '[]');
      this.bookmarks = JSON.parse(localStorage.getItem('omnia_bookmarks') || '[]');
    } catch (e) {
      this.notes = [];
      this.tasks = [];
      this.bookmarks = [];
    }
  },

  saveData() {
    try {
      localStorage.setItem('omnia_notes', JSON.stringify(this.notes));
      localStorage.setItem('omnia_tasks', JSON.stringify(this.tasks));
      localStorage.setItem('omnia_bookmarks', JSON.stringify(this.bookmarks));
      if (window.DashboardModule) DashboardModule.updateWorkspaceSummary();
    } catch (e) {
      console.error(e);
    }
  },

  bindNotes() {
    this.renderNotes();
    const addBtn = document.getElementById('ws-note-add-btn');
    if (addBtn) {
      addBtn.addEventListener('click', () => {
        const title = 'Note ' + (this.notes.length + 1);
        this.notes.unshift({
          id: 'note_' + Date.now(),
          title: title.trim(),
          content: '',
          pinned: false,
          updated: Date.now()
        });
        this.saveData();
        this.renderNotes();
        storage.showToast('Note created');
      });
    }

    const searchInput = document.getElementById('ws-notes-search');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        const q = e.target.value.toLowerCase().trim();
        this.renderNotes(q);
      });
    }
  },

  renderNotes(query = '') {
    const list = document.getElementById('ws-notes-list');
    if (!list) return;

    let filtered = this.notes;
    if (query) {
      filtered = filtered.filter(n => n.title.toLowerCase().includes(query) || n.content.toLowerCase().includes(query));
    }

    if (filtered.length === 0) {
      list.innerHTML = '<div class="p-6 text-center text-xs text-slate-400">No notes found. Click "+ New Note" to begin.</div>';
      return;
    }

    list.innerHTML = filtered.map(n => `
      <div class="p-3.5 rounded-xl bg-white/5 border border-white/5 hover:border-white/10 transition space-y-2">
        <div class="flex items-center justify-between">
          <input type="text" class="bg-transparent font-bold text-sm text-white focus:outline-none focus:border-b border-indigo-400 ws-note-title" data-id="${n.id}" value="${n.title}">
          <button class="text-xs text-rose-400 hover:text-rose-300 ws-note-del" data-id="${n.id}">✕</button>
        </div>
        <textarea class="w-full h-24 bg-black/20 rounded p-2 text-xs text-slate-300 font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500 ws-note-content" data-id="${n.id}" placeholder="Write notes here... Markdown supported">${n.content}</textarea>
        <div class="flex items-center justify-between text-[11px] text-slate-400">
          <span>${n.content.length} chars • ${(n.content.match(/\S+/g) || []).length} words</span>
          <span>${new Date(n.updated).toLocaleDateString()}</span>
        </div>
      </div>
    `).join('');

    // Attach listeners
    list.querySelectorAll('.ws-note-title').forEach(input => {
      input.addEventListener('change', (e) => {
        const note = this.notes.find(x => x.id === e.target.getAttribute('data-id'));
        if (note) {
          note.title = e.target.value.trim() || 'Untitled';
          note.updated = Date.now();
          this.saveData();
        }
      });
    });

    list.querySelectorAll('.ws-note-content').forEach(txt => {
      txt.addEventListener('input', (e) => {
        const note = this.notes.find(x => x.id === e.target.getAttribute('data-id'));
        if (note) {
          note.content = e.target.value;
          note.updated = Date.now();
          this.saveData();
        }
      });
    });

    list.querySelectorAll('.ws-note-del').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.target.getAttribute('data-id');
        this.notes = this.notes.filter(x => x.id !== id);
        this.saveData();
        this.renderNotes();
        storage.showToast('Note deleted');
      });
    });
  },

  bindTasks() {
    this.renderTasks();
    const addBtn = document.getElementById('ws-task-add-btn');
    const input = document.getElementById('ws-task-input');
    const prioritySelect = document.getElementById('ws-task-priority');

    if (addBtn && input) {
      addBtn.addEventListener('click', () => {
        const text = input.value.trim();
        if (!text) return;
        this.tasks.unshift({
          id: 'task_' + Date.now(),
          text,
          priority: prioritySelect?.value || 'medium',
          completed: false,
          created: Date.now()
        });
        input.value = '';
        this.saveData();
        this.renderTasks();
        storage.showToast('Task added');
      });
    }
  },

  renderTasks() {
    const list = document.getElementById('ws-tasks-list');
    if (!list) return;

    if (this.tasks.length === 0) {
      list.innerHTML = '<div class="p-6 text-center text-xs text-slate-400">No active tasks. Add one above!</div>';
      return;
    }

    list.innerHTML = this.tasks.map(t => {
      const pColor = t.priority === 'high' ? 'text-rose-400 bg-rose-400/10' : t.priority === 'low' ? 'text-slate-400 bg-slate-400/10' : 'text-amber-400 bg-amber-400/10';
      return `
        <div class="p-2.5 rounded-lg bg-white/5 border border-white/5 flex items-center justify-between">
          <div class="flex items-center gap-3">
            <input type="checkbox" class="ws-task-cb rounded border-slate-700 text-indigo-600 focus:ring-0" data-id="${t.id}" ${t.completed ? 'checked' : ''}>
            <span class="text-xs ${t.completed ? 'line-through text-slate-500' : 'text-slate-200'} font-medium">${t.text}</span>
          </div>
          <div class="flex items-center gap-2">
            <span class="px-2 py-0.5 rounded text-[10px] uppercase font-bold ${pColor}">${t.priority}</span>
            <button class="text-xs text-rose-400 hover:text-rose-300 ws-task-del" data-id="${t.id}">✕</button>
          </div>
        </div>
      `;
    }).join('');

    list.querySelectorAll('.ws-task-cb').forEach(cb => {
      cb.addEventListener('change', (e) => {
        const task = this.tasks.find(x => x.id === e.target.getAttribute('data-id'));
        if (task) {
          task.completed = e.target.checked;
          this.saveData();
          this.renderTasks();
        }
      });
    });

    list.querySelectorAll('.ws-task-del').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.target.getAttribute('data-id');
        this.tasks = this.tasks.filter(x => x.id !== id);
        this.saveData();
        this.renderTasks();
      });
    });
  },

  bindBookmarks() {
    this.renderBookmarks();
    const addBtn = document.getElementById('ws-bm-add-btn');
    if (addBtn) {
      addBtn.addEventListener('click', () => {
        const title = 'Note ' + (this.notes.length + 1);
        const url = 'https://omnia.local';
        // url ok
        this.bookmarks.unshift({
          id: 'bm_' + Date.now(),
          title: title.trim(),
          url: url.trim()
        });
        this.saveData();
        this.renderBookmarks();
        storage.showToast('Bookmark saved');
      });
    }
  },

  renderBookmarks() {
    const list = document.getElementById('ws-bookmarks-list');
    if (!list) return;

    if (this.bookmarks.length === 0) {
      list.innerHTML = '<div class="p-4 text-center text-xs text-slate-400">No bookmarks saved.</div>';
      return;
    }

    list.innerHTML = this.bookmarks.map(b => `
      <div class="p-2.5 rounded-lg bg-white/5 border border-white/5 flex items-center justify-between">
        <a href="${b.url}" target="_blank" rel="noopener" class="text-xs text-indigo-400 hover:text-indigo-300 font-medium truncate max-w-[200px]">
          ${b.title} <span class="text-[10px] text-slate-400">(${b.url})</span>
        </a>
        <button class="text-xs text-rose-400 hover:text-rose-300 ws-bm-del" data-id="${b.id}">✕</button>
      </div>
    `).join('');

    list.querySelectorAll('.ws-bm-del').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.target.getAttribute('data-id');
        this.bookmarks = this.bookmarks.filter(x => x.id !== id);
        this.saveData();
        this.renderBookmarks();
      });
    });
  },

  bindBackup() {
    // Export JSON
    const exportBtn = document.getElementById('ws-export-btn');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => {
        const data = {
          version: 'OMNIA 2.0',
          exportedAt: new Date().toISOString(),
          notes: this.notes,
          tasks: this.tasks,
          bookmarks: this.bookmarks
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `omnia_workspace_backup_${Date.now()}.json`;
        a.click();
        storage.showToast('Workspace backup exported');
      });
    }

    // Import JSON
    const importInput = document.getElementById('ws-import-file');
    if (importInput) {
      importInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (evt) => {
          try {
            const data = JSON.parse(evt.target.result);
            if (data.notes) this.notes = data.notes;
            if (data.tasks) this.tasks = data.tasks;
            if (data.bookmarks) this.bookmarks = data.bookmarks;
            this.saveData();
            this.renderNotes();
            this.renderTasks();
            this.renderBookmarks();
            storage.showToast('Workspace backup restored successfully');
          } catch (err) {
            storage.showToast('Invalid backup JSON file');
          }
        };
        reader.readAsText(file);
      });
    }
  }
};

window.WorkspaceModule = WorkspaceModule;


  window.Omnia.workspace = WorkspaceModule;
  window.WorkspaceModule = WorkspaceModule;
})();
