/**
 * OMNIA 2.0 - Division 23: Automation & Workflow Studio
 * Visual node-based workflow builder, step-by-step execution, and workflow presets.
 */
(function() {
  window.Omnia = window.Omnia || {};
  const storage = window.Omnia.storage || {
    get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch(e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch(e) {} },
    showToast(m, t) { console.log(m, t); }
  };

  const SAMPLE_WORKFLOWS = [
    {
      id: 'wf-sample-1',
      name: 'Word Count & Reading Time Report',
      desc: 'Takes raw text input, counts words and characters, calculates reading duration, and formats output.',
      nodes: [
        { id: 'n1', type: 'input_text', label: 'Input Text', x: 40, y: 50, config: { value: 'OMNIA 2.0 is an all-in-one digital operating environment combining scientific simulators, planetary intelligence, and developer suites.' } },
        { id: 'n2', type: 'text_stats', label: 'Calculate Statistics', x: 260, y: 50, config: {} },
        { id: 'n3', type: 'output_display', label: 'Executive Summary', x: 480, y: 50, config: {} }
      ],
      connections: [
        { from: 'n1', to: 'n2' },
        { from: 'n2', to: 'n3' }
      ]
    },
    {
      id: 'wf-sample-2',
      name: 'JSON Field Extractor',
      desc: 'Parses JSON payload, extracts specific nested property, and formats response.',
      nodes: [
        { id: 'n1', type: 'input_json', label: 'JSON Data', x: 40, y: 50, config: { value: '{\n  "system": "OMNIA",\n  "version": "2.0",\n  "status": "Online",\n  "modules": 24\n}' } },
        { id: 'n2', type: 'json_extract', label: 'Extract Field', x: 260, y: 50, config: { path: 'modules' } },
        { id: 'n3', type: 'output_display', label: 'Extracted Value', x: 480, y: 50, config: {} }
      ],
      connections: [
        { from: 'n1', to: 'n2' },
        { from: 'n2', to: 'n3' }
      ]
    },
    {
      id: 'wf-sample-3',
      name: 'Date Difference & Days Countdown',
      desc: 'Compares target milestone date with today and computes exact elapsed or remaining days.',
      nodes: [
        { id: 'n1', type: 'input_date', label: 'Target Date', x: 40, y: 50, config: { value: '2027-01-01' } },
        { id: 'n2', type: 'date_diff', label: 'Days Remaining', x: 260, y: 50, config: {} },
        { id: 'n3', type: 'output_display', label: 'Countdown Result', x: 480, y: 50, config: {} }
      ],
      connections: [
        { from: 'n1', to: 'n2' },
        { from: 'n2', to: 'n3' }
      ]
    }
  ];

  const AutomationStudioModule = {
    workflows: [],
    activeWorkflow: null,
    selectedNodeId: null,
    executionLog: [],

    init() {
      this.loadStorage();
      this.bindEvents();
      this.renderWorkflowPresets();
      if (this.workflows.length > 0) {
        this.loadWorkflow(this.workflows[0].id);
      }
    },

    loadStorage() {
      this.workflows = storage.get('omnia_automation_workflows', SAMPLE_WORKFLOWS);
    },

    saveStorage() {
      storage.set('omnia_automation_workflows', this.workflows);
    },

    bindEvents() {
      // Execute Workflow
      document.getElementById('auto-run-btn')?.addEventListener('click', () => {
        this.executeActiveWorkflow();
      });

      // Add Node button
      document.getElementById('auto-add-node-btn')?.addEventListener('click', () => {
        const typeSelect = document.getElementById('auto-node-type-select');
        const type = typeSelect ? typeSelect.value : 'input_text';
        this.addNode(type);
      });

      // New Workflow button
      document.getElementById('auto-new-wf-btn')?.addEventListener('click', () => {
        this.createNewWorkflow();
      });

      // Save Workflow button
      document.getElementById('auto-save-wf-btn')?.addEventListener('click', () => {
        this.saveStorage();
        storage.showToast('Workflow saved locally', 'success');
      });

      // Export / Import
      document.getElementById('auto-export-btn')?.addEventListener('click', () => {
        this.exportWorkflows();
      });
      document.getElementById('auto-import-input')?.addEventListener('change', (e) => {
        this.importWorkflows(e);
      });

      // Inspector Apply Button
      document.getElementById('auto-apply-config-btn')?.addEventListener('click', () => {
        this.applyNodeConfiguration();
      });

      // Delete Node Button
      document.getElementById('auto-del-node-btn')?.addEventListener('click', () => {
        if (this.selectedNodeId) {
          this.deleteNode(this.selectedNodeId);
        }
      });
    },

    renderWorkflowPresets() {
      const container = document.getElementById('auto-presets-list');
      if (!container) return;

      container.innerHTML = this.workflows.map(wf => `
        <button type="button" class="auto-wf-item w-full p-2.5 rounded-xl text-left border border-white/5 hover:border-indigo-500/30 transition flex flex-col space-y-1 ${this.activeWorkflow?.id === wf.id ? 'bg-indigo-600/20 border-indigo-500/50' : 'bg-slate-900/60 hover:bg-slate-800'}" data-wfid="${wf.id}">
          <span class="text-xs font-bold text-slate-100 truncate">${this.escapeHtml(wf.name)}</span>
          <span class="text-[11px] text-slate-400 line-clamp-1">${this.escapeHtml(wf.desc || '')}</span>
        </button>
      `).join('');

      container.querySelectorAll('.auto-wf-item').forEach(btn => {
        btn.addEventListener('click', () => {
          const id = btn.getAttribute('data-wfid');
          this.loadWorkflow(id);
        });
      });
    },

    loadWorkflow(id) {
      const wf = this.workflows.find(w => w.id === id);
      if (!wf) return;

      this.activeWorkflow = JSON.parse(JSON.stringify(wf)); // deep clone
      this.selectedNodeId = null;

      const titleEl = document.getElementById('auto-active-title');
      const descEl = document.getElementById('auto-active-desc');
      if (titleEl) titleEl.textContent = wf.name;
      if (descEl) descEl.textContent = wf.desc || 'Visual Node Workflow';

      this.renderWorkflowPresets();
      this.renderCanvas();
      this.renderInspector();
    },

    renderCanvas() {
      const canvasEl = document.getElementById('auto-workflow-canvas');
      if (!canvasEl || !this.activeWorkflow) return;

      const { nodes, connections } = this.activeWorkflow;

      // Render nodes as interactive DOM cards inside canvas container
      canvasEl.innerHTML = nodes.map(node => {
        const isSelected = node.id === this.selectedNodeId;
        const meta = this.getNodeMeta(node.type);

        return `
          <div id="node-${node.id}" class="auto-node absolute p-3 rounded-2xl glass-card border transition cursor-pointer select-none w-52 space-y-2 shadow-xl ${isSelected ? 'border-indigo-400 ring-2 ring-indigo-500/30 bg-slate-900' : 'border-white/10 hover:border-white/20'}" style="left: ${node.x}px; top: ${node.y}px;" data-nodeid="${node.id}">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-1.5 overflow-hidden">
                <span class="text-xs">${meta.icon}</span>
                <span class="text-xs font-bold text-slate-100 truncate">${this.escapeHtml(node.label || meta.label)}</span>
              </div>
              <span class="w-2 h-2 rounded-full ${meta.badgeColor}"></span>
            </div>
            <div class="text-[11px] text-slate-400 border-t border-white/5 pt-1.5 flex items-center justify-between font-mono">
              <span class="text-[10px] uppercase text-indigo-400 font-bold">${meta.category}</span>
              <span class="node-status text-slate-500 text-[10px]">Ready</span>
            </div>
          </div>
        `;
      }).join('');

      // Draw SVG connection paths between nodes
      this.drawSvgConnections(canvasEl, nodes, connections);

      // Node selection listeners
      canvasEl.querySelectorAll('.auto-node').forEach(nodeEl => {
        nodeEl.addEventListener('click', (e) => {
          e.stopPropagation();
          const id = nodeEl.getAttribute('data-nodeid');
          this.selectedNodeId = id;
          this.renderCanvas();
          this.renderInspector();
        });
      });
    },

    drawSvgConnections(canvasEl, nodes, connections) {
      let svg = canvasEl.querySelector('#auto-connections-svg');
      if (!svg) {
        svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.id = 'auto-connections-svg';
        svg.setAttribute('class', 'absolute inset-0 w-full h-full pointer-events-none z-0');
        canvasEl.insertBefore(svg, canvasEl.firstChild);
      }
      svg.innerHTML = '';

      connections.forEach(conn => {
        const fromNode = nodes.find(n => n.id === conn.from);
        const toNode = nodes.find(n => n.id === conn.to);
        if (!fromNode || !toNode) return;

        const x1 = fromNode.x + 208; // right edge of node
        const y1 = fromNode.y + 40;  // middle height
        const x2 = toNode.x;         // left edge of target node
        const y2 = toNode.y + 40;

        const dx = Math.abs(x2 - x1) * 0.5;
        const d = `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;

        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', d);
        path.setAttribute('stroke', '#6366f1');
        path.setAttribute('stroke-width', '2.5');
        path.setAttribute('fill', 'none');
        path.setAttribute('stroke-dasharray', '4 2');
        svg.appendChild(path);
      });
    },

    renderInspector() {
      const panel = document.getElementById('auto-inspector-panel');
      const emptyNotice = document.getElementById('auto-inspector-empty');
      const configContainer = document.getElementById('auto-config-fields');

      if (!this.selectedNodeId || !this.activeWorkflow) {
        if (panel) panel.classList.add('hidden');
        if (emptyNotice) emptyNotice.classList.remove('hidden');
        return;
      }

      const node = this.activeWorkflow.nodes.find(n => n.id === this.selectedNodeId);
      if (!node) return;

      if (panel) panel.classList.remove('hidden');
      if (emptyNotice) emptyNotice.classList.add('hidden');

      const nameInput = document.getElementById('auto-config-label');
      if (nameInput) nameInput.value = node.label;

      if (configContainer) {
        configContainer.innerHTML = this.renderNodeConfigInputs(node);
      }
    },

    renderNodeConfigInputs(node) {
      switch (node.type) {
        case 'input_text':
          return `
            <div class="space-y-1">
              <label class="text-[11px] font-semibold text-slate-300">Default Text Input</label>
              <textarea id="cfg-val" rows="3" class="w-full px-2.5 py-1.5 rounded-xl bg-slate-900 border border-white/10 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono">${this.escapeHtml(node.config.value || '')}</textarea>
            </div>
          `;
        case 'input_json':
          return `
            <div class="space-y-1">
              <label class="text-[11px] font-semibold text-slate-300">JSON Payload</label>
              <textarea id="cfg-val" rows="4" class="w-full px-2.5 py-1.5 rounded-xl bg-slate-900 border border-white/10 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono">${this.escapeHtml(node.config.value || '{}')}</textarea>
            </div>
          `;
        case 'json_extract':
          return `
            <div class="space-y-1">
              <label class="text-[11px] font-semibold text-slate-300">Property Key / Path</label>
              <input type="text" id="cfg-path" value="${this.escapeHtml(node.config.path || '')}" placeholder="e.g. status, modules" class="w-full px-2.5 py-1.5 rounded-xl bg-slate-900 border border-white/10 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono">
            </div>
          `;
        case 'input_date':
          return `
            <div class="space-y-1">
              <label class="text-[11px] font-semibold text-slate-300">Target Date (YYYY-MM-DD)</label>
              <input type="date" id="cfg-val" value="${this.escapeHtml(node.config.value || '')}" class="w-full px-2.5 py-1.5 rounded-xl bg-slate-900 border border-white/10 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono">
            </div>
          `;
        default:
          return '<p class="text-xs text-slate-500 italic">This node executes automated transformation without manual parameters.</p>';
      }
    },

    applyNodeConfiguration() {
      if (!this.selectedNodeId || !this.activeWorkflow) return;
      const node = this.activeWorkflow.nodes.find(n => n.id === this.selectedNodeId);
      if (!node) return;

      const labelInput = document.getElementById('auto-config-label');
      if (labelInput) node.label = labelInput.value.trim() || node.label;

      const valInput = document.getElementById('cfg-val');
      if (valInput) node.config.value = valInput.value;

      const pathInput = document.getElementById('cfg-path');
      if (pathInput) node.config.path = pathInput.value.trim();

      this.renderCanvas();
      storage.showToast('Node configuration updated', 'success');
    },

    addNode(type) {
      if (!this.activeWorkflow) return;
      const meta = this.getNodeMeta(type);

      const offset = (this.activeWorkflow.nodes.length * 30) % 200;
      const newNode = {
        id: 'n-' + Date.now(),
        type,
        label: meta.label,
        x: 100 + offset,
        y: 100 + offset,
        config: {}
      };

      this.activeWorkflow.nodes.push(newNode);

      // Connect automatically to previous node if linear
      if (this.activeWorkflow.nodes.length > 1) {
        const prev = this.activeWorkflow.nodes[this.activeWorkflow.nodes.length - 2];
        this.activeWorkflow.connections.push({ from: prev.id, to: newNode.id });
      }

      this.selectedNodeId = newNode.id;
      this.renderCanvas();
      this.renderInspector();
      storage.showToast(`Added ${meta.label} node`, 'info');
    },

    deleteNode(id) {
      if (!this.activeWorkflow) return;
      this.activeWorkflow.nodes = this.activeWorkflow.nodes.filter(n => n.id !== id);
      this.activeWorkflow.connections = this.activeWorkflow.connections.filter(c => c.from !== id && c.to !== id);
      this.selectedNodeId = null;
      this.renderCanvas();
      this.renderInspector();
      storage.showToast('Node deleted', 'info');
    },

    async executeActiveWorkflow() {
      if (!this.activeWorkflow || this.activeWorkflow.nodes.length === 0) {
        storage.showToast('No workflow nodes to run', 'warning');
        return;
      }

      const runBtn = document.getElementById('auto-run-btn');
      const logContainer = document.getElementById('auto-exec-logs');
      if (runBtn) {
        runBtn.disabled = true;
        runBtn.innerHTML = '<span class="w-3 h-3 rounded-full border-2 border-white border-t-transparent animate-spin inline-block"></span> Executing...';
      }

      this.executionLog = [];
      const dataStore = {};

      const addLog = (msg, status = 'info') => {
        this.executionLog.push({ time: new Date().toLocaleTimeString(), msg, status });
        if (logContainer) {
          logContainer.innerHTML = this.executionLog.map(l => `
            <div class="text-xs font-mono flex items-start gap-2">
              <span class="text-slate-500">${l.time}</span>
              <span class="${l.status === 'success' ? 'text-emerald-400 font-bold' : l.status === 'error' ? 'text-rose-400 font-bold' : 'text-slate-300'}">${this.escapeHtml(l.msg)}</span>
            </div>
          `).join('');
        }
      };

      addLog(`[START] Running workflow: ${this.activeWorkflow.name}`);

      try {
        const { nodes, connections } = this.activeWorkflow;

        // Execute nodes sequentially following connection order
        for (let i = 0; i < nodes.length; i++) {
          const node = nodes[i];
          const nodeEl = document.getElementById(`node-${node.id}`);
          const statusSpan = nodeEl?.querySelector('.node-status');

          if (nodeEl) nodeEl.classList.add('border-indigo-400', 'bg-indigo-600/20');
          if (statusSpan) { statusSpan.textContent = 'Running'; statusSpan.className = 'node-status text-amber-400 font-bold'; }

          await new Promise(r => setTimeout(r, 250)); // Visual execution trace

          // Resolve incoming data from predecessor connections
          const incoming = connections.filter(c => c.to === node.id);
          let inputData = null;
          if (incoming.length > 0) {
            inputData = dataStore[incoming[0].from];
          }

          // Compute node output
          let outputData = null;
          switch (node.type) {
            case 'input_text':
              outputData = node.config.value || 'Hello OMNIA';
              addLog(`[Input] Read ${outputData.length} characters of text`);
              break;

            case 'input_json':
              outputData = JSON.parse(node.config.value || '{}');
              addLog(`[Input JSON] Parsed ${Object.keys(outputData).length} top-level keys`);
              break;

            case 'input_date':
              outputData = node.config.value || new Date().toISOString().split('T')[0];
              addLog(`[Input Date] Received target date ${outputData}`);
              break;

            case 'text_stats': {
              const text = String(inputData || '');
              const words = text.trim() ? text.trim().split(/\s+/).length : 0;
              const chars = text.length;
              const readingMin = (words / 200).toFixed(1);
              outputData = `Words: ${words} | Characters: ${chars} | Est. Reading Time: ${readingMin} min`;
              addLog(`[Transform] Computed text statistics: ${outputData}`);
              break;
            }

            case 'json_extract': {
              const obj = typeof inputData === 'object' ? inputData : JSON.parse(inputData || '{}');
              const key = node.config.path || '';
              outputData = obj[key] !== undefined ? obj[key] : 'Field not found';
              addLog(`[Transform] Extracted property '${key}' -> ${JSON.stringify(outputData)}`);
              break;
            }

            case 'date_diff': {
              const target = new Date(inputData || node.config.value);
              const now = new Date();
              const diffDays = Math.ceil((target - now) / (1000 * 60 * 60 * 24));
              outputData = `${Math.abs(diffDays)} days ${diffDays >= 0 ? 'remaining until' : 'elapsed since'} ${target.toDateString()}`;
              addLog(`[Transform] Calculated date delta: ${outputData}`);
              break;
            }

            case 'output_display': {
              outputData = inputData;
              const formatted = typeof inputData === 'object' ? JSON.stringify(inputData, null, 2) : String(inputData);
              addLog(`[SUCCESS Output] ${formatted}`, 'success');
              storage.showToast(`Workflow Result: ${formatted.slice(0, 50)}...`, 'success');
              break;
            }

            default:
              outputData = inputData;
          }

          dataStore[node.id] = outputData;

          if (nodeEl) nodeEl.classList.remove('bg-indigo-600/20');
          if (statusSpan) { statusSpan.textContent = 'Completed'; statusSpan.className = 'node-status text-emerald-400 font-bold'; }
        }

        addLog(`[COMPLETED] Workflow finished all ${nodes.length} nodes successfully.`, 'success');

      } catch (err) {
        addLog(`[ERROR] Workflow failed: ${err.message}`, 'error');
        storage.showToast(`Workflow error: ${err.message}`, 'error');
      } finally {
        if (runBtn) {
          runBtn.disabled = false;
          runBtn.innerHTML = '<span>▶ Run Workflow</span>';
        }
      }
    },

    createNewWorkflow() {
      const name = `Workflow ${this.workflows.length + 1}`;

      const newWf = {
        id: 'wf-' + Date.now(),
        name,
        desc: 'Custom user-created automation flow',
        nodes: [
          { id: 'n1', type: 'input_text', label: 'Input Text', x: 50, y: 50, config: { value: 'OMNIA platform' } },
          { id: 'n2', type: 'output_display', label: 'Output Display', x: 300, y: 50, config: {} }
        ],
        connections: [
          { from: 'n1', to: 'n2' }
        ]
      };

      this.workflows.unshift(newWf);
      this.saveStorage();
      this.loadWorkflow(newWf.id);
      storage.showToast('Created new workflow', 'success');
    },

    exportWorkflows() {
      const json = JSON.stringify(this.workflows, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `omnia-workflows-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      storage.showToast('Workflows exported as JSON', 'success');
    },

    importWorkflows(event) {
      const file = event.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target.result);
          if (Array.isArray(data)) {
            this.workflows = data;
            this.saveStorage();
            if (this.workflows.length > 0) this.loadWorkflow(this.workflows[0].id);
            storage.showToast('Workflows imported successfully', 'success');
          }
        } catch (err) {
          storage.showToast('Invalid workflow JSON file', 'error');
        }
      };
      reader.readAsText(file);
    },

    getNodeMeta(type) {
      switch (type) {
        case 'input_text': return { label: 'Text Input', icon: '📝', category: 'Input', badgeColor: 'bg-emerald-400' };
        case 'input_json': return { label: 'JSON Input', icon: '📦', category: 'Input', badgeColor: 'bg-emerald-400' };
        case 'input_date': return { label: 'Date Input', icon: '📅', category: 'Input', badgeColor: 'bg-emerald-400' };
        case 'text_stats': return { label: 'Text Analyzer', icon: '📊', category: 'Transform', badgeColor: 'bg-indigo-400' };
        case 'json_extract': return { label: 'JSON Extractor', icon: '🔍', category: 'Transform', badgeColor: 'bg-indigo-400' };
        case 'date_diff': return { label: 'Date Difference', icon: '⏳', category: 'Transform', badgeColor: 'bg-indigo-400' };
        case 'output_display': return { label: 'Display Output', icon: '🖥️', category: 'Output', badgeColor: 'bg-amber-400' };
        default: return { label: 'Operation', icon: '⚙️', category: 'Node', badgeColor: 'bg-slate-400' };
      }
    },

    escapeHtml(str) {
      if (!str) return '';
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    }
  };

  window.Omnia.automationStudio = AutomationStudioModule;
})();
