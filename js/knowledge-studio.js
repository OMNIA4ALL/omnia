/**
 * OMNIA 2.0 - Division 20: Knowledge & Revision Studio
 * Spaced repetition flashcards (SM-2 algorithm), quiz generation, topic mastery analytics, and JSON deck import/export.
 */
(function() {
  window.Omnia = window.Omnia || {};
  const storage = window.Omnia.storage || {
    get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch(e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch(e) {} },
    showToast(m, t) { console.log(m, t); }
  };

  const DEFAULT_DECKS = [
    {
      id: 'deck-physics',
      title: 'Physics Fundamentals',
      subject: 'Physics',
      desc: 'Classical mechanics, thermodynamics, gravitation, and optics.',
      cards: [
        { id: 'p1', q: "What is Newton's Second Law of Motion?", a: 'Force equals mass multiplied by acceleration (F = m · a).', interval: 1, ease: 2.5, reps: 0, nextReview: Date.now() },
        { id: 'p2', q: 'What is the speed of light in a vacuum?', a: 'Approximately 299,792,458 meters per second (c ≈ 3 × 10⁸ m/s).', interval: 1, ease: 2.5, reps: 0, nextReview: Date.now() },
        { id: 'p3', q: 'State the First Law of Thermodynamics.', a: 'Energy cannot be created or destroyed; it can only change forms (ΔU = Q - W).', interval: 1, ease: 2.5, reps: 0, nextReview: Date.now() },
        { id: 'p4', q: 'What phenomenon causes light to bend when entering a denser medium?', a: 'Refraction, governed by Snell’s Law (n₁·sin θ₁ = n₂·sin θ₂).', interval: 1, ease: 2.5, reps: 0, nextReview: Date.now() },
        { id: 'p5', q: 'What is the escape velocity from Earth’s surface?', a: 'Approximately 11.186 km/s (or ~40,270 km/h).', interval: 1, ease: 2.5, reps: 0, nextReview: Date.now() }
      ]
    },
    {
      id: 'deck-chem',
      title: 'Chemistry & Elements',
      subject: 'Chemistry',
      desc: 'Atomic structure, periodic trends, chemical bonding, and stoichiometry.',
      cards: [
        { id: 'c1', q: 'What is Avogadro’s constant?', a: 'Approximately 6.02214076 × 10²³ elementary entities per mole.', interval: 1, ease: 2.5, reps: 0, nextReview: Date.now() },
        { id: 'c2', q: 'What is the most electronegative element on the periodic table?', a: 'Fluorine (F), with a Pauling electronegativity value of 3.98.', interval: 1, ease: 2.5, reps: 0, nextReview: Date.now() },
        { id: 'c3', q: 'Define an amphoteric substance.', a: 'A molecule or ion that can react both as an acid and as a base (e.g., water, H₂O).', interval: 1, ease: 2.5, reps: 0, nextReview: Date.now() },
        { id: 'c4', q: 'Which quantum number dictates the shape of an atomic orbital?', a: 'The azimuthal (angular momentum) quantum number (l).', interval: 1, ease: 2.5, reps: 0, nextReview: Date.now() }
      ]
    },
    {
      id: 'deck-cs',
      title: 'Computer Science & Algorithms',
      subject: 'Computer Science',
      desc: 'Data structures, asymptotic complexity, sorting, and graphs.',
      cards: [
        { id: 'cs1', q: 'What is the average and worst-case time complexity of Merge Sort?', a: 'O(n log n) in best, average, and worst cases.', interval: 1, ease: 2.5, reps: 0, nextReview: Date.now() },
        { id: 'cs2', q: 'What fundamental data structure operates under LIFO (Last-In, First-Out)?', a: 'A Stack.', interval: 1, ease: 2.5, reps: 0, nextReview: Date.now() },
        { id: 'cs3', q: 'Explain the difference between BFS and DFS.', a: 'BFS explores vertex neighbors level by level using a queue; DFS explores branches to maximum depth using recursion or a stack.', interval: 1, ease: 2.5, reps: 0, nextReview: Date.now() },
        { id: 'cs4', q: 'What guarantees O(log n) lookups in self-balancing binary search trees?', a: 'Balancing invariants such as height limits (AVL) or color balance properties (Red-Black).', interval: 1, ease: 2.5, reps: 0, nextReview: Date.now() }
      ]
    }
  ];

  const KnowledgeStudioModule = {
    decks: [],
    stats: { reviewedTotal: 0, quizAttempts: 0, correctAnswers: 0, weakTopics: {} },
    activeDeckId: null,
    currentCardIndex: 0,
    isCardFlipped: false,
    quizState: null,

    init() {
      this.loadStorage();
      this.bindEvents();
      this.renderDecksList();
      this.renderStats();
    },

    loadStorage() {
      this.decks = storage.get('omnia_knowledge_decks', DEFAULT_DECKS);
      this.stats = storage.get('omnia_knowledge_stats', { reviewedTotal: 0, quizAttempts: 0, correctAnswers: 0, weakTopics: {} });
    },

    saveStorage() {
      storage.set('omnia_knowledge_decks', this.decks);
      storage.set('omnia_knowledge_stats', this.stats);
    },

    bindEvents() {
      // Create Deck modal
      document.getElementById('know-create-deck-btn')?.addEventListener('click', () => {
        document.getElementById('know-deck-modal')?.classList.remove('hidden');
      });
      document.getElementById('know-deck-modal-close')?.addEventListener('click', () => {
        document.getElementById('know-deck-modal')?.classList.add('hidden');
      });
      document.getElementById('know-save-deck-btn')?.addEventListener('click', () => {
        this.saveNewDeck();
      });

      // Add Card modal
      document.getElementById('know-add-card-btn')?.addEventListener('click', () => {
        if (!this.activeDeckId) {
          storage.showToast('Select a deck first to add cards', 'warning');
          return;
        }
        document.getElementById('know-card-modal')?.classList.remove('hidden');
      });
      document.getElementById('know-card-modal-close')?.addEventListener('click', () => {
        document.getElementById('know-card-modal')?.classList.add('hidden');
      });
      document.getElementById('know-save-card-btn')?.addEventListener('click', () => {
        this.saveNewCard();
      });

      // Card Flip action
      const flashcardEl = document.getElementById('know-flashcard-inner');
      flashcardEl?.addEventListener('click', () => {
        this.toggleCardFlip();
      });

      // SRS Rating Buttons
      document.getElementById('know-rate-diff')?.addEventListener('click', () => this.rateCard('hard'));
      document.getElementById('know-rate-med')?.addEventListener('click', () => this.rateCard('good'));
      document.getElementById('know-rate-easy')?.addEventListener('click', () => this.rateCard('easy'));

      // Card navigation buttons
      document.getElementById('know-prev-card')?.addEventListener('click', () => this.prevCard());
      document.getElementById('know-next-card')?.addEventListener('click', () => this.nextCard());

      // Quiz mode buttons
      document.getElementById('know-start-mcq-btn')?.addEventListener('click', () => this.startQuiz('mcq'));
      document.getElementById('know-start-tf-btn')?.addEventListener('click', () => this.startQuiz('tf'));
      document.getElementById('know-start-sa-btn')?.addEventListener('click', () => this.startQuiz('sa'));

      // Export / Import
      document.getElementById('know-export-decks-btn')?.addEventListener('click', () => this.exportDecks());
      document.getElementById('know-import-file-input')?.addEventListener('change', (e) => this.importDecks(e));

      // Subject filter buttons
      document.querySelectorAll('.know-subject-filter').forEach(btn => {
        btn.addEventListener('click', () => {
          document.querySelectorAll('.know-subject-filter').forEach(b => {
            b.classList.remove('bg-indigo-600', 'text-white');
            b.classList.add('bg-slate-800', 'text-slate-400');
          });
          btn.classList.remove('bg-slate-800', 'text-slate-400');
          btn.classList.add('bg-indigo-600', 'text-white');
          const sub = btn.getAttribute('data-sub') || 'All';
          this.renderDecksList(sub);
        });
      });
    },

    renderDecksList(filterSub = 'All') {
      const container = document.getElementById('know-decks-container');
      if (!container) return;

      let list = this.decks;
      if (filterSub !== 'All') {
        list = list.filter(d => d.subject === filterSub);
      }

      if (list.length === 0) {
        container.innerHTML = '<div class="p-8 text-center text-xs text-slate-500 glass-card rounded-2xl">No decks found in this category</div>';
        return;
      }

      container.innerHTML = list.map(d => {
        const isSelected = d.id === this.activeDeckId;
        const totalCards = d.cards.length;
        const dueCards = d.cards.filter(c => (c.nextReview || 0) <= Date.now()).length;

        return `
          <div class="glass-card p-4 rounded-2xl border transition cursor-pointer flex flex-col justify-between space-y-3 ${isSelected ? 'border-indigo-500 bg-indigo-500/10' : 'border-white/10 hover:border-white/20'}" data-deck-id="${d.id}">
            <div class="space-y-1.5">
              <div class="flex items-center justify-between text-xs">
                <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">${this.escapeHtml(d.subject)}</span>
                <span class="text-[10px] font-mono ${dueCards > 0 ? 'text-amber-400' : 'text-slate-500'}">${dueCards} due review</span>
              </div>
              <h3 class="text-sm font-bold text-slate-100">${this.escapeHtml(d.title)}</h3>
              <p class="text-xs text-slate-400 line-clamp-2">${this.escapeHtml(d.desc || '')}</p>
            </div>

            <div class="pt-2 border-t border-white/5 flex items-center justify-between text-xs">
              <span class="text-slate-500 font-mono text-[11px]">${totalCards} card${totalCards === 1 ? '' : 's'}</span>
              <div class="flex items-center gap-1">
                <button type="button" class="know-open-deck-btn px-2.5 py-1 rounded-lg bg-indigo-600 text-white font-semibold text-[11px] hover:bg-indigo-500 transition" data-deck-id="${d.id}">Study</button>
                <button type="button" class="know-del-deck-btn p-1 text-slate-500 hover:text-rose-400" data-deck-id="${d.id}" title="Delete Deck">✕</button>
              </div>
            </div>
          </div>
        `;
      }).join('');

      container.querySelectorAll('.know-open-deck-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const id = btn.getAttribute('data-deck-id');
          this.selectDeck(id);
        });
      });

      container.querySelectorAll('[data-deck-id]').forEach(card => {
        card.addEventListener('click', () => {
          const id = card.getAttribute('data-deck-id');
          this.selectDeck(id);
        });
      });

      container.querySelectorAll('.know-del-deck-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const id = btn.getAttribute('data-deck-id');
          this.deleteDeck(id);
        });
      });

      // Default select first deck if none selected
      if (!this.activeDeckId && this.decks.length > 0) {
        this.selectDeck(this.decks[0].id);
      }
    },

    selectDeck(id) {
      this.activeDeckId = id;
      this.currentCardIndex = 0;
      this.isCardFlipped = false;

      const deck = this.decks.find(d => d.id === id);
      if (!deck) return;

      const titleEl = document.getElementById('know-active-deck-title');
      const subEl = document.getElementById('know-active-deck-sub');
      if (titleEl) titleEl.textContent = deck.title;
      if (subEl) subEl.textContent = `${deck.subject} • ${deck.cards.length} cards total`;

      this.renderDecksList();
      this.displayCurrentCard();
    },

    displayCurrentCard() {
      const deck = this.decks.find(d => d.id === this.activeDeckId);
      const flashcard = document.getElementById('know-flashcard-inner');
      const frontEl = document.getElementById('know-card-front');
      const backEl = document.getElementById('know-card-back');
      const progEl = document.getElementById('know-card-progress');

      if (!deck || deck.cards.length === 0) {
        if (frontEl) frontEl.innerHTML = '<span class="text-slate-400 text-sm">No cards in this deck. Click "+ Add Flashcard" above to get started.</span>';
        if (backEl) backEl.innerHTML = '';
        if (progEl) progEl.textContent = '0 / 0';
        return;
      }

      if (this.currentCardIndex >= deck.cards.length) this.currentCardIndex = 0;
      const card = deck.cards[this.currentCardIndex];

      this.isCardFlipped = false;
      if (flashcard) flashcard.classList.remove('flipped');

      if (frontEl) {
        frontEl.innerHTML = `
          <div class="space-y-3">
            <span class="text-[10px] font-bold uppercase tracking-wider text-indigo-400">Question</span>
            <p class="text-sm font-semibold text-slate-100 leading-relaxed">${this.escapeHtml(card.q)}</p>
            <div class="text-[11px] text-slate-500 pt-3">Click card to reveal answer ↻</div>
          </div>
        `;
      }

      if (backEl) {
        backEl.innerHTML = `
          <div class="space-y-3">
            <span class="text-[10px] font-bold uppercase tracking-wider text-emerald-400">Answer</span>
            <p class="text-sm text-slate-200 leading-relaxed">${this.escapeHtml(card.a)}</p>
            <div class="pt-3 border-t border-white/5 flex items-center justify-between text-[11px] text-slate-400 font-mono">
              <span>Reps: ${card.reps || 0}</span>
              <span>Interval: ${card.interval || 1}d</span>
            </div>
          </div>
        `;
      }

      if (progEl) progEl.textContent = `${this.currentCardIndex + 1} / ${deck.cards.length}`;
    },

    toggleCardFlip() {
      this.isCardFlipped = !this.isCardFlipped;
      const inner = document.getElementById('know-flashcard-inner');
      if (inner) {
        inner.classList.toggle('flipped', this.isCardFlipped);
      }
    },

    /**
     * SM-2 Spaced Repetition Scheduling Algorithm
     * Rating: 'hard' (q=3), 'good' (q=4), 'easy' (q=5)
     */
    rateCard(rating) {
      const deck = this.decks.find(d => d.id === this.activeDeckId);
      if (!deck || deck.cards.length === 0) return;

      const card = deck.cards[this.currentCardIndex];
      let quality = 4;
      if (rating === 'hard') quality = 3;
      if (rating === 'easy') quality = 5;

      // SM-2 calculation
      let { reps = 0, ease = 2.5, interval = 1 } = card;

      if (quality >= 3) {
        if (reps === 0) interval = 1;
        else if (reps === 1) interval = 6;
        else interval = Math.round(interval * ease);
        reps++;
      } else {
        reps = 0;
        interval = 1;
      }

      ease = ease + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
      if (ease < 1.3) ease = 1.3;

      card.reps = reps;
      card.ease = parseFloat(ease.toFixed(2));
      card.interval = interval;
      card.nextReview = Date.now() + interval * 86400000;

      // Stats
      this.stats.reviewedTotal++;
      this.saveStorage();
      this.renderStats();

      storage.showToast(`Card scheduled for review in ${interval} day(s)`, 'info');
      this.nextCard();
    },

    nextCard() {
      const deck = this.decks.find(d => d.id === this.activeDeckId);
      if (!deck || deck.cards.length === 0) return;
      this.currentCardIndex = (this.currentCardIndex + 1) % deck.cards.length;
      this.displayCurrentCard();
    },

    prevCard() {
      const deck = this.decks.find(d => d.id === this.activeDeckId);
      if (!deck || deck.cards.length === 0) return;
      this.currentCardIndex = (this.currentCardIndex - 1 + deck.cards.length) % deck.cards.length;
      this.displayCurrentCard();
    },

    saveNewDeck() {
      const titleInput = document.getElementById('know-new-deck-title');
      const subSelect = document.getElementById('know-new-deck-sub');
      const descInput = document.getElementById('know-new-deck-desc');

      const title = (titleInput?.value || '').trim();
      const subject = subSelect?.value || 'Physics';
      const desc = (descInput?.value || '').trim();

      if (!title) {
        storage.showToast('Please enter a deck title', 'warning');
        return;
      }

      const newDeck = {
        id: 'deck-' + Date.now(),
        title,
        subject,
        desc,
        cards: []
      };

      this.decks.push(newDeck);
      this.saveStorage();
      this.selectDeck(newDeck.id);

      if (titleInput) titleInput.value = '';
      if (descInput) descInput.value = '';
      document.getElementById('know-deck-modal')?.classList.add('hidden');
      storage.showToast('New flashcard deck created', 'success');
    },

    saveNewCard() {
      const deck = this.decks.find(d => d.id === this.activeDeckId);
      if (!deck) return;

      const qInput = document.getElementById('know-new-card-q');
      const aInput = document.getElementById('know-new-card-a');

      const q = (qInput?.value || '').trim();
      const a = (aInput?.value || '').trim();

      if (!q || !a) {
        storage.showToast('Both Question and Answer are required', 'warning');
        return;
      }

      deck.cards.push({
        id: 'c-' + Date.now(),
        q,
        a,
        reps: 0,
        ease: 2.5,
        interval: 1,
        nextReview: Date.now()
      });

      this.saveStorage();
      this.displayCurrentCard();

      if (qInput) qInput.value = '';
      if (aInput) aInput.value = '';
      document.getElementById('know-card-modal')?.classList.add('hidden');
      storage.showToast('Flashcard added to deck', 'success');
    },

    deleteDeck(id) {
      this.decks = this.decks.filter(d => d.id !== id);
      this.saveStorage();
      this.activeDeckId = this.decks.length > 0 ? this.decks[0].id : null;
      this.renderDecksList();
      if (this.activeDeckId) this.selectDeck(this.activeDeckId);
      storage.showToast('Deck deleted', 'info');
    },

    startQuiz(mode) {
      const deck = this.decks.find(d => d.id === this.activeDeckId);
      if (!deck || deck.cards.length < 2) {
        storage.showToast('Need at least 2 cards in the deck to start a quiz', 'warning');
        return;
      }

      const modal = document.getElementById('know-quiz-modal');
      const container = document.getElementById('know-quiz-container');
      if (!modal || !container) return;

      modal.classList.remove('hidden');
      document.getElementById('know-quiz-modal-close')?.addEventListener('click', () => {
        modal.classList.add('hidden');
      });

      this.quizState = {
        mode,
        deckId: deck.id,
        cards: [...deck.cards].sort(() => Math.random() - 0.5),
        currentIndex: 0,
        score: 0
      };

      this.renderNextQuizQuestion();
    },

    renderNextQuizQuestion() {
      const container = document.getElementById('know-quiz-container');
      if (!container || !this.quizState) return;

      const { cards, currentIndex, score, mode } = this.quizState;
      if (currentIndex >= cards.length) {
        // Quiz completed
        this.finishQuiz();
        return;
      }

      const currentCard = cards[currentIndex];
      const progPercent = Math.round((currentIndex / cards.length) * 100);

      let questionHtml = `
        <div class="space-y-4">
          <div class="flex items-center justify-between text-xs text-slate-400">
            <span>Question ${currentIndex + 1} of ${cards.length}</span>
            <span>Score: ${score}</span>
          </div>
          <div class="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
            <div class="bg-indigo-500 h-full transition-all duration-300" style="width: ${progPercent}%"></div>
          </div>
          <div class="p-4 rounded-2xl bg-slate-900 border border-white/5 space-y-2">
            <h4 class="text-sm font-bold text-slate-100">${this.escapeHtml(currentCard.q)}</h4>
          </div>
      `;

      if (mode === 'mcq') {
        // Generate 4 options: 1 correct + 3 random distractors from other cards
        const allAnswers = this.decks.flatMap(d => d.cards.map(c => c.a)).filter(a => a !== currentCard.a);
        const distractors = allAnswers.sort(() => Math.random() - 0.5).slice(0, 3);
        const options = [currentCard.a, ...distractors].sort(() => Math.random() - 0.5);

        questionHtml += `
          <div class="space-y-2 pt-2">
            ${options.map((opt, i) => `
              <button type="button" class="quiz-option-btn w-full p-3 rounded-xl bg-slate-800 hover:bg-indigo-600 text-left text-xs text-slate-200 transition font-medium border border-white/5" data-val="${this.escapeHtml(opt)}">
                <span class="font-mono text-indigo-400 mr-2">${String.fromCharCode(65 + i)}.</span> ${this.escapeHtml(opt)}
              </button>
            `).join('')}
          </div>
        `;
      } else if (mode === 'tf') {
        const isTrue = Math.random() > 0.5;
        const shownAnswer = isTrue ? currentCard.a : (cards[(currentIndex + 1) % cards.length]?.a || 'None');
        questionHtml += `
          <div class="p-3 rounded-xl bg-slate-800/60 text-xs text-slate-300">
            <span class="font-bold text-slate-400">Proposed Answer:</span> ${this.escapeHtml(shownAnswer)}
          </div>
          <div class="grid grid-cols-2 gap-3 pt-3">
            <button type="button" class="quiz-tf-btn p-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs" data-choice="${isTrue ? 'true' : 'false'}">✓ True</button>
            <button type="button" class="quiz-tf-btn p-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs" data-choice="${isTrue ? 'false' : 'true'}">✕ False</button>
          </div>
        `;
      } else {
        // Short Answer
        questionHtml += `
          <div class="space-y-2 pt-2">
            <input type="text" id="quiz-sa-input" placeholder="Type your answer here..." class="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-white/10 text-xs text-white focus:outline-none focus:border-indigo-500">
            <button type="button" id="quiz-sa-submit" class="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold">Submit Answer</button>
          </div>
        `;
      }

      questionHtml += '</div>';
      container.innerHTML = questionHtml;

      // Event handlers
      if (mode === 'mcq') {
        container.querySelectorAll('.quiz-option-btn').forEach(btn => {
          btn.addEventListener('click', () => {
            const picked = btn.getAttribute('data-val');
            this.handleQuizAnswer(picked === currentCard.a, currentCard);
          });
        });
      } else if (mode === 'tf') {
        container.querySelectorAll('.quiz-tf-btn').forEach(btn => {
          btn.addEventListener('click', () => {
            const choice = btn.getAttribute('data-choice');
            this.handleQuizAnswer(choice === 'true', currentCard);
          });
        });
      } else {
        const saSubmit = document.getElementById('quiz-sa-submit');
        const saInput = document.getElementById('quiz-sa-input');
        const checkSa = () => {
          const val = (saInput?.value || '').trim().toLowerCase();
          const target = currentCard.a.toLowerCase();
          const match = val.length > 2 && target.includes(val);
          this.handleQuizAnswer(match, currentCard);
        };
        saSubmit?.addEventListener('click', checkSa);
        saInput?.addEventListener('keydown', (e) => { if (e.key === 'Enter') checkSa(); });
      }
    },

    handleQuizAnswer(isCorrect, card) {
      if (!this.quizState) return;
      if (isCorrect) {
        this.quizState.score++;
        storage.showToast('Correct!', 'success');
      } else {
        storage.showToast(`Incorrect: ${card.a}`, 'warning');
        // Record weak topic
        const deck = this.decks.find(d => d.id === this.activeDeckId);
        const topic = deck?.subject || 'General';
        this.stats.weakTopics[topic] = (this.stats.weakTopics[topic] || 0) + 1;
      }

      this.quizState.currentIndex++;
      setTimeout(() => this.renderNextQuizQuestion(), 300);
    },

    finishQuiz() {
      const container = document.getElementById('know-quiz-container');
      if (!container || !this.quizState) return;

      const { score, cards } = this.quizState;
      const pct = Math.round((score / cards.length) * 100);

      this.stats.quizAttempts++;
      this.stats.correctAnswers += score;
      this.saveStorage();
      this.renderStats();

      container.innerHTML = `
        <div class="py-6 text-center space-y-4">
          <span class="text-4xl">${pct >= 70 ? '🏆' : '📚'}</span>
          <h3 class="text-base font-bold text-slate-100">Quiz Completed!</h3>
          <p class="text-xs text-slate-300">You scored <strong class="text-indigo-400 font-bold">${score}</strong> out of ${cards.length} (${pct}%)</p>
          <button type="button" id="quiz-finish-close-btn" class="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-500">Back to Knowledge Studio</button>
        </div>
      `;

      document.getElementById('quiz-finish-close-btn')?.addEventListener('click', () => {
        document.getElementById('know-quiz-modal')?.classList.add('hidden');
      });
    },

    renderStats() {
      const totalRev = document.getElementById('know-stat-reviewed');
      const quizAtt = document.getElementById('know-stat-quizzes');
      const weakEl = document.getElementById('know-weak-topics');

      if (totalRev) totalRev.textContent = this.stats.reviewedTotal;
      if (quizAtt) quizAtt.textContent = this.stats.quizAttempts;

      if (weakEl) {
        const entries = Object.entries(this.stats.weakTopics).sort((a, b) => b[1] - a[1]);
        if (entries.length === 0) {
          weakEl.textContent = 'None identified yet';
        } else {
          weakEl.textContent = entries.slice(0, 2).map(([k, v]) => `${k} (${v} mistakes)`).join(', ');
        }
      }
    },

    exportDecks() {
      const jsonStr = JSON.stringify(this.decks, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `omnia-knowledge-decks-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      storage.showToast('Knowledge decks exported to JSON', 'success');
    },

    importDecks(event) {
      const file = event.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const imported = JSON.parse(e.target.result);
          if (Array.isArray(imported)) {
            this.decks = imported;
            this.saveStorage();
            this.renderDecksList();
            storage.showToast('Decks imported successfully', 'success');
          } else {
            storage.showToast('Invalid deck file format', 'error');
          }
        } catch (err) {
          storage.showToast('Failed to parse JSON file', 'error');
        }
      };
      reader.readAsText(file);
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

  window.Omnia.knowledgeStudio = KnowledgeStudioModule;
})();
