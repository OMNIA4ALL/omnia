/**
 * OMNIA 2.0 - Division 24: Web Accessibility & Website Quality Inspector
 * WCAG accessibility compliance scanner, heading hierarchy, meta tags, and audit reports.
 */
(function() {
  window.Omnia = window.Omnia || {};
  const storage = window.Omnia.storage || {
    showToast(m, t) { console.log(m, t); }
  };

  const SAMPLE_HTML_TESTS = {
    inaccessible: `<!DOCTYPE html>
<html>
<head>
  <!-- Missing title and viewport -->
</head>
<body>
  <div class="header">
    <img src="logo.png">
    <a href="#">click here</a>
  </div>
  <h3>Welcome to Our Store</h3> <!-- Skipped H1 and H2 -->
  <p>Buy our products now.</p>
  <img src="product.jpg" alt="image of product">
  <form>
    <input type="text" placeholder="Your Name"> <!-- Missing label -->
    <input type="email" placeholder="Email">
    <button type="submit"></button> <!-- Empty button -->
  </form>
  <a href="https://example.com" target="_blank">read more</a>
</body>
</html>`,
    accessible: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Accessible Web Application - OMNIA Standards</title>
</head>
<body>
  <header>
    <nav aria-label="Main Navigation">
      <a href="/">Home</a>
      <a href="/about">About Us</a>
    </nav>
  </header>
  <main>
    <h1>Modern Digital Operating Environment</h1>
    <p>Discover scientific tools, developer environments, and planetary intelligence.</p>
    <img src="overview.png" alt="Architectural diagram showing OMNIA modules and utilities">
    <form>
      <label for="user-email">Email Address</label>
      <input type="email" id="user-email" name="email" required>
      <button type="submit">Subscribe to Updates</button>
    </form>
  </main>
  <footer>
    <p>&copy; 2026 OMNIA Platform</p>
  </footer>
</body>
</html>`
  };

  const WebInspectorModule = {
    lastAudit: null,

    init() {
      this.bindEvents();
    },

    bindEvents() {
      // Run audit button
      document.getElementById('web-inspect-run-btn')?.addEventListener('click', () => {
        this.runAudit();
      });

      // Sample presets
      document.getElementById('web-load-inaccessible-btn')?.addEventListener('click', () => {
        const area = document.getElementById('web-html-input');
        if (area) {
          area.value = SAMPLE_HTML_TESTS.inaccessible;
          this.switchInspectMode('html');
          storage.showToast('Loaded Inaccessible Sample Page HTML', 'info');
        }
      });

      document.getElementById('web-load-accessible-btn')?.addEventListener('click', () => {
        const area = document.getElementById('web-html-input');
        if (area) {
          area.value = SAMPLE_HTML_TESTS.accessible;
          this.switchInspectMode('html');
          storage.showToast('Loaded High-Compliance Accessible Sample', 'info');
        }
      });

      // Input mode tabs: URL vs Direct HTML
      document.getElementById('web-mode-url-btn')?.addEventListener('click', () => {
        this.switchInspectMode('url');
      });
      document.getElementById('web-mode-html-btn')?.addEventListener('click', () => {
        this.switchInspectMode('html');
      });

      // Export report buttons
      document.getElementById('web-export-json-btn')?.addEventListener('click', () => {
        this.exportReport('json');
      });
      document.getElementById('web-export-txt-btn')?.addEventListener('click', () => {
        this.exportReport('txt');
      });
    },

    switchInspectMode(mode) {
      const urlBtn = document.getElementById('web-mode-url-btn');
      const htmlBtn = document.getElementById('web-mode-html-btn');
      const urlBox = document.getElementById('web-url-input-box');
      const htmlBox = document.getElementById('web-html-input-box');

      if (mode === 'url') {
        urlBtn?.classList.add('bg-indigo-600', 'text-white');
        urlBtn?.classList.remove('bg-slate-800', 'text-slate-400');
        htmlBtn?.classList.remove('bg-indigo-600', 'text-white');
        htmlBtn?.classList.add('bg-slate-800', 'text-slate-400');
        urlBox?.classList.remove('hidden');
        htmlBox?.classList.add('hidden');
      } else {
        htmlBtn?.classList.add('bg-indigo-600', 'text-white');
        htmlBtn?.classList.remove('bg-slate-800', 'text-slate-400');
        urlBtn?.classList.remove('bg-indigo-600', 'text-white');
        urlBtn?.classList.add('bg-slate-800', 'text-slate-400');
        htmlBox?.classList.remove('hidden');
        urlBox?.classList.add('hidden');
      }
    },

    async runAudit() {
      const isHtmlMode = !document.getElementById('web-html-input-box')?.classList.contains('hidden');
      let htmlString = '';
      let targetLabel = '';

      const runBtn = document.getElementById('web-inspect-run-btn');
      if (runBtn) {
        runBtn.disabled = true;
        runBtn.innerHTML = '<span class="w-3 h-3 rounded-full border-2 border-white border-t-transparent animate-spin inline-block"></span> Auditing...';
      }

      try {
        if (isHtmlMode) {
          const area = document.getElementById('web-html-input');
          htmlString = (area?.value || '').trim();
          targetLabel = 'Pasted HTML Document';
          if (!htmlString) {
            storage.showToast('Please paste HTML code to inspect', 'warning');
            return;
          }
        } else {
          const urlInput = document.getElementById('web-url-input');
          let url = (urlInput?.value || '').trim();
          if (!url) {
            storage.showToast('Please enter a website URL', 'warning');
            return;
          }
          if (!url.startsWith('http://') && !url.startsWith('https://')) {
            url = 'https://' + url;
            if (urlInput) urlInput.value = url;
          }
          targetLabel = url;

          // Attempt client fetch with CORS fallback
          try {
            const res = await fetch(url);
            htmlString = await res.text();
          } catch (corsErr) {
            // Inform user about browser CORS boundary and switch to assisted HTML inspection
            const area = document.getElementById('web-html-input');
            if (area && !area.value.trim()) {
              area.value = SAMPLE_HTML_TESTS.inaccessible;
            }
            this.switchInspectMode('html');
            storage.showToast('Direct URL was blocked by browser CORS. Loaded assisted HTML inspector instead.', 'info');
            return;
          }
        }

        // Parse HTML into a DOM tree for inspection
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlString, 'text/html');

        const findings = this.evaluateRules(doc, htmlString);
        this.lastAudit = {
          target: targetLabel,
          date: new Date().toISOString(),
          score: findings.score,
          summary: findings.summary,
          issues: findings.issues
        };

        this.renderAuditResults(this.lastAudit);
        storage.showToast(`Audit complete: Score ${findings.score}%`, 'success');

      } catch (err) {
        console.error('[Web Inspector] Audit error:', err);
        storage.showToast('Failed to complete audit inspection', 'error');
      } finally {
        if (runBtn) {
          runBtn.disabled = false;
          runBtn.innerHTML = '<span>🔍 Analyze Accessibility & Quality</span>';
        }
      }
    },

    evaluateRules(doc, rawHtml) {
      const issues = [];
      let totalWeight = 100;
      let penalty = 0;

      // Rule 1: Document Language (<html lang="...">)
      const htmlEl = doc.querySelector('html');
      const langAttr = htmlEl ? htmlEl.getAttribute('lang') : null;
      if (!langAttr) {
        issues.push({
          type: 'error',
          cat: 'Standards',
          title: 'Missing Document Language Attribute',
          desc: 'The root <html> element is missing a "lang" attribute (e.g. <html lang="en">). Screen readers rely on this to pronounce content accurately.',
          fix: 'Add lang="en" (or your target language code) to your <html> tag.'
        });
        penalty += 10;
      } else {
        issues.push({ type: 'pass', cat: 'Standards', title: 'Document Language Declared', desc: `Target language is declared as "${langAttr}".` });
      }

      // Rule 2: Document Title (<title>)
      const titleEl = doc.querySelector('title');
      const titleText = titleEl ? titleEl.textContent.trim() : '';
      if (!titleText) {
        issues.push({
          type: 'error',
          cat: 'SEO & Nav',
          title: 'Missing Document <title>',
          desc: 'The document lacks a <title> element in the <head>. Titles are crucial for screen readers, tab identification, and search engines.',
          fix: 'Add a descriptive <title>Page Name - Website</title> inside <head>.'
        });
        penalty += 12;
      } else if (titleText.length < 10) {
        issues.push({
          type: 'warning',
          cat: 'SEO & Nav',
          title: 'Document Title Is Too Short',
          desc: `Current title "${titleText}" is very brief (${titleText.length} chars). Descriptive titles typically range between 15-60 characters.`,
          fix: 'Expand the title with clear contextual keywords.'
        });
        penalty += 4;
      } else {
        issues.push({ type: 'pass', cat: 'SEO & Nav', title: 'Descriptive Page Title Found', desc: `Title: "${titleText}" (${titleText.length} chars).` });
      }

      // Rule 3: Viewport Meta Tag
      const viewport = doc.querySelector('meta[name="viewport"]');
      if (!viewport) {
        issues.push({
          type: 'warning',
          cat: 'Responsive',
          title: 'Missing Responsive Viewport Meta Tag',
          desc: 'The page lacks a <meta name="viewport" content="width=device-width, initial-scale=1.0"> tag, causing poor display on mobile browsers.',
          fix: 'Add <meta name="viewport" content="width=device-width, initial-scale=1.0"> inside <head>.'
        });
        penalty += 8;
      } else {
        issues.push({ type: 'pass', cat: 'Responsive', title: 'Responsive Viewport Configured', desc: 'Viewport meta tag is properly set for mobile devices.' });
      }

      // Rule 4: Image Alt Text
      const images = Array.from(doc.querySelectorAll('img'));
      let missingAltCount = 0;
      let redundantAltCount = 0;

      images.forEach(img => {
        if (!img.hasAttribute('alt')) {
          missingAltCount++;
        } else {
          const alt = img.getAttribute('alt').toLowerCase();
          if (alt.startsWith('image of') || alt.startsWith('picture of') || alt.startsWith('photo of')) {
            redundantAltCount++;
          }
        }
      });

      if (missingAltCount > 0) {
        issues.push({
          type: 'error',
          cat: 'Accessibility',
          title: `${missingAltCount} Image(s) Missing Alternative Text`,
          desc: 'Images without an "alt" attribute cannot be communicated to screen reader users.',
          fix: 'Add descriptive alt="Description of image" or alt="" if strictly decorative.'
        });
        penalty += Math.min(20, missingAltCount * 6);
      } else if (images.length > 0) {
        issues.push({ type: 'pass', cat: 'Accessibility', title: 'All Images Have Alt Attributes', desc: `Checked ${images.length} image(s).` });
      }

      if (redundantAltCount > 0) {
        issues.push({
          type: 'notice',
          cat: 'Accessibility',
          title: `${redundantAltCount} Image(s) Have Redundant Alt Phrasing`,
          desc: 'Screen readers already announce image elements as graphics. Words like "image of" or "photo of" are redundant.',
          fix: 'Remove "image of" or "photo of" prefixes from alt attributes.'
        });
        penalty += 3;
      }

      // Rule 5: Heading Structure & H1 Uniqueness
      const h1s = doc.querySelectorAll('h1');
      if (h1s.length === 0) {
        issues.push({
          type: 'error',
          cat: 'Structure',
          title: 'Missing Main Heading (<h1>)',
          desc: 'The page does not contain an <h1> element. Every webpage should have one distinct primary heading.',
          fix: 'Add a prominent <h1> heading describing the page purpose.'
        });
        penalty += 12;
      } else if (h1s.length > 1) {
        issues.push({
          type: 'warning',
          cat: 'Structure',
          title: 'Multiple <h1> Headings Found',
          desc: `Found ${h1s.length} <h1> tags. While valid in HTML5, having a single <h1> heading per page provides clearer outline hierarchy.`,
          fix: 'Consider reserving <h1> for the main title and using <h2> for sub-sections.'
        });
        penalty += 4;
      } else {
        issues.push({ type: 'pass', cat: 'Structure', title: 'Single Primary <h1> Present', desc: `Found: "${h1s[0].textContent.trim().slice(0, 40)}..."` });
      }

      // Check for skipped heading levels
      const allHeadings = Array.from(doc.querySelectorAll('h1, h2, h3, h4, h5, h6'));
      let skippedHeading = false;
      for (let i = 0; i < allHeadings.length - 1; i++) {
        const levelCurrent = parseInt(allHeadings[i].tagName[1], 10);
        const levelNext = parseInt(allHeadings[i + 1].tagName[1], 10);
        if (levelNext > levelCurrent + 1) {
          skippedHeading = true;
          break;
        }
      }
      if (skippedHeading) {
        issues.push({
          type: 'warning',
          cat: 'Structure',
          title: 'Skipped Heading Levels Detected',
          desc: 'The document heading hierarchy jumps over levels (for example, from <h1> directly to <h3> without an <h2>).',
          fix: 'Maintain sequential heading depth without skipping levels.'
        });
        penalty += 6;
      }

      // Rule 6: Form Labeling
      const inputs = Array.from(doc.querySelectorAll('input:not([type="hidden"]):not([type="submit"]):not([type="button"]), textarea, select'));
      let unlabeledInputs = 0;
      inputs.forEach(input => {
        const id = input.getAttribute('id');
        const hasAria = input.hasAttribute('aria-label') || input.hasAttribute('aria-labelledby');
        const hasLabel = id && doc.querySelector(`label[for="${id}"]`);
        const wrappedLabel = input.closest('label');
        if (!hasAria && !hasLabel && !wrappedLabel) {
          unlabeledInputs++;
        }
      });

      if (unlabeledInputs > 0) {
        issues.push({
          type: 'error',
          cat: 'Forms',
          title: `${unlabeledInputs} Form Input(s) Missing Accessible Labels`,
          desc: 'Inputs without associated <label> elements or aria-label attributes cannot be clearly understood by assistive devices.',
          fix: 'Pair inputs with <label for="inputId">Label</label> or provide aria-label.'
        });
        penalty += Math.min(18, unlabeledInputs * 6);
      } else if (inputs.length > 0) {
        issues.push({ type: 'pass', cat: 'Forms', title: 'All Form Inputs Are Accessible', desc: `Checked ${inputs.length} form field(s).` });
      }

      // Rule 7: Link Text Clarity
      const links = Array.from(doc.querySelectorAll('a'));
      let vagueLinks = 0;
      links.forEach(a => {
        const txt = a.textContent.trim().toLowerCase();
        if (txt === 'click here' || txt === 'read more' || txt === 'more' || txt === 'link' || txt === 'here') {
          vagueLinks++;
        }
      });

      if (vagueLinks > 0) {
        issues.push({
          type: 'warning',
          cat: 'Links',
          title: `${vagueLinks} Link(s) With Ambiguous Text`,
          desc: 'Generic anchor labels like "click here" or "read more" provide zero context when screen reader users navigate by links list.',
          fix: 'Use specific descriptive text such as "Read our privacy policy" instead of "click here".'
        });
        penalty += Math.min(10, vagueLinks * 3);
      } else if (links.length > 0) {
        issues.push({ type: 'pass', cat: 'Links', title: 'Descriptive Link Anchors', desc: `Inspected ${links.length} anchor element(s).` });
      }

      // Calculate score
      const finalScore = Math.max(0, Math.min(100, Math.round(totalWeight - penalty)));

      return {
        score: finalScore,
        summary: {
          errors: issues.filter(i => i.type === 'error').length,
          warnings: issues.filter(i => i.type === 'warning').length,
          notices: issues.filter(i => i.type === 'notice').length,
          passes: issues.filter(i => i.type === 'pass').length
        },
        issues
      };
    },

    renderAuditResults(audit) {
      const resultsContainer = document.getElementById('web-results-container');
      const scoreBadge = document.getElementById('web-score-badge');
      const scoreCircle = document.getElementById('web-score-value');
      const summaryBox = document.getElementById('web-summary-badges');
      const issuesList = document.getElementById('web-issues-list');

      resultsContainer?.classList.remove('hidden');

      if (scoreCircle) scoreCircle.textContent = audit.score;
      if (scoreBadge) {
        let text = 'Compliant';
        let cls = 'text-emerald-400 bg-emerald-500/20 border-emerald-500/30';
        if (audit.score < 50) { text = 'Needs Critical Work'; cls = 'text-rose-400 bg-rose-500/20 border-rose-500/30'; }
        else if (audit.score < 80) { text = 'Needs Improvement'; cls = 'text-amber-400 bg-amber-500/20 border-amber-500/30'; }

        scoreBadge.textContent = text;
        scoreBadge.className = `px-2.5 py-1 rounded-full text-xs font-mono font-bold border ${cls}`;
      }

      if (summaryBox) {
        summaryBox.innerHTML = `
          <div class="px-3 py-1.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs font-mono font-bold text-rose-300">
            ${audit.summary.errors} Error${audit.summary.errors === 1 ? '' : 's'}
          </div>
          <div class="px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs font-mono font-bold text-amber-300">
            ${audit.summary.warnings} Warning${audit.summary.warnings === 1 ? '' : 's'}
          </div>
          <div class="px-3 py-1.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-xs font-mono font-bold text-indigo-300">
            ${audit.summary.notices} Notice${audit.summary.notices === 1 ? '' : 's'}
          </div>
          <div class="px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs font-mono font-bold text-emerald-300">
            ${audit.summary.passes} Passed
          </div>
        `;
      }

      if (issuesList) {
        issuesList.innerHTML = audit.issues.map(issue => {
          let badgeCls = 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
          let badgeLabel = 'PASS';
          if (issue.type === 'error') { badgeCls = 'bg-rose-500/20 text-rose-300 border-rose-500/30'; badgeLabel = 'ERROR'; }
          else if (issue.type === 'warning') { badgeCls = 'bg-amber-500/20 text-amber-300 border-amber-500/30'; badgeLabel = 'WARN'; }
          else if (issue.type === 'notice') { badgeCls = 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30'; badgeLabel = 'INFO'; }

          return `
            <div class="p-4 rounded-2xl glass-card border border-white/5 space-y-2">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <span class="px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${badgeCls}">${badgeLabel}</span>
                  <span class="text-xs font-bold text-slate-100">${this.escapeHtml(issue.title)}</span>
                </div>
                <span class="text-[10px] font-mono text-slate-500 uppercase">${this.escapeHtml(issue.cat)}</span>
              </div>
              <p class="text-xs text-slate-400 leading-relaxed">${this.escapeHtml(issue.desc)}</p>
              ${issue.fix ? `
                <div class="mt-2 p-2.5 rounded-xl bg-slate-900 border border-white/5 text-[11px] text-slate-300">
                  <span class="text-indigo-400 font-bold">Recommended Remediation:</span> ${this.escapeHtml(issue.fix)}
                </div>
              ` : ''}
            </div>
          `;
        }).join('');
      }

      resultsContainer.scrollIntoView({ behavior: 'smooth' });
    },

    exportReport(format) {
      if (!this.lastAudit) {
        storage.showToast('Please run an audit first before exporting', 'warning');
        return;
      }

      let content = '';
      let mime = 'text/plain';
      let ext = 'txt';

      if (format === 'json') {
        content = JSON.stringify(this.lastAudit, null, 2);
        mime = 'application/json';
        ext = 'json';
      } else {
        content = `=====================================================
OMNIA 2.0 - Web Accessibility & Quality Audit Report
Target: ${this.lastAudit.target}
Date: ${new Date(this.lastAudit.date).toLocaleString()}
Overall Score: ${this.lastAudit.score}/100
=====================================================

Summary:
- Errors: ${this.lastAudit.summary.errors}
- Warnings: ${this.lastAudit.summary.warnings}
- Notices: ${this.lastAudit.summary.notices}
- Compliant Checks: ${this.lastAudit.summary.passes}

Detailed Audit Findings:
`;
        this.lastAudit.issues.forEach((issue, idx) => {
          content += `\n[${issue.type.toUpperCase()}] ${issue.title} (${issue.cat})\n${issue.desc}\n`;
          if (issue.fix) content += `Fix: ${issue.fix}\n`;
        });
      }

      const blob = new Blob([content], { type: mime });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `omnia-audit-report-${Date.now()}.${ext}`;
      a.click();
      URL.revokeObjectURL(url);
      storage.showToast(`Exported audit report (.${ext})`, 'success');
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

  window.Omnia.webInspector = WebInspectorModule;
})();
