export default class Question {
  constructor(quiz, container, onQuizEnd) {
    this.quiz = quiz;
    this.container = container;
    this.onQuizEnd = onQuizEnd;
    this.questionData = quiz.getCurrentQuestion();
    this.index = quiz.currentQuestionIndex;
    this.question = this.decodeHtml(this.questionData.question);
    this.correctAnswer = this.decodeHtml(this.questionData.correct_answer);
    this.category = this.decodeHtml(this.questionData.category);
    this.wrongAnswers = this.questionData.incorrect_answers.map(answer => this.decodeHtml(answer));
    this.allAnswers = this.shuffleAnswers();
    this.answered = false;
    this.timerInterval = null;
    this.timeRemaining = 15;
    this.keyHandler = event => this.handleKeydown(event);
  }

  decodeHtml(value) {
    const doc = new DOMParser().parseFromString(value, 'text/html');
    return doc.documentElement.textContent;
  }

  escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  }

  shuffleAnswers() {
    const answers = [...this.wrongAnswers, this.correctAnswer];
    for (let index = answers.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(Math.random() * (index + 1));
      [answers[index], answers[swapIndex]] = [answers[swapIndex], answers[index]];
    }
    return answers;
  }

  getProgress() { return Math.round(((this.index + 1) / this.quiz.numberOfQuestions) * 100); }

  displayQuestion() {
    const difficultyIcon = { easy: 'fa-face-smile', medium: 'fa-face-meh', hard: 'fa-skull' }[this.quiz.difficulty] || 'fa-gauge-high';
    const answers = this.allAnswers.map((answer, index) => `<button class="answer-btn" type="button" data-answer-index="${index}" data-answer="${this.escapeHtml(answer)}"><span class="answer-key">${index + 1}</span><span class="answer-text">${this.escapeHtml(answer)}</span></button>`).join('');
    this.container.innerHTML = `<article class="game-card question-card" aria-live="polite">
      <div class="xp-bar-container"><div class="xp-bar-header"><span class="xp-label"><i class="fa-solid fa-bolt"></i> Progress</span><span class="xp-value">Question ${this.index + 1}/${this.quiz.numberOfQuestions}</span></div><div class="xp-bar"><div class="xp-bar-fill" style="width:${this.getProgress()}%"></div></div></div>
      <div class="stats-row"><div class="stat-badge category"><i class="fa-solid fa-bookmark"></i><span>${this.escapeHtml(this.category)}</span></div><div class="stat-badge difficulty ${this.quiz.difficulty}"><i class="fa-solid ${difficultyIcon}"></i><span>${this.quiz.difficulty}</span></div><div class="stat-badge timer"><i class="fa-solid fa-stopwatch"></i><span class="timer-value">${this.timeRemaining}</span>s</div><div class="stat-badge counter"><i class="fa-solid fa-gamepad"></i><span>${this.index + 1}/${this.quiz.numberOfQuestions}</span></div></div>
      <h2 class="question-text">${this.escapeHtml(this.question)}</h2>
      <div class="answers-grid">${answers}</div>
      <p class="keyboard-hint"><i class="fa-regular fa-keyboard"></i> Press 1-${this.allAnswers.length} to select</p>
      <div class="score-panel"><div class="score-item"><div class="score-item-label">Score</div><div class="score-item-value">${this.quiz.score}</div></div></div>
    </article>`;
    this.addEventListeners();
    this.startTimer();
  }

  addEventListeners() {
    this.container.addEventListener('click', this.clickHandler = event => {
      const button = event.target.closest('.answer-btn');
      if (button && this.container.contains(button)) this.checkAnswer(button);
    });
    document.addEventListener('keydown', this.keyHandler);
  }

  removeEventListeners() {
    document.removeEventListener('keydown', this.keyHandler);
    if (this.clickHandler) this.container.removeEventListener('click', this.clickHandler);
  }

  handleKeydown(event) {
    if (this.answered || event.altKey || event.ctrlKey || event.metaKey || /INPUT|TEXTAREA|SELECT/.test(event.target.tagName)) return;
    if (/^[1-4]$/.test(event.key)) {
      const button = this.container.querySelectorAll('.answer-btn')[Number(event.key) - 1];
      if (button) { event.preventDefault(); this.checkAnswer(button); }
    }
  }

  startTimer() {
    const timerBadge = this.container.querySelector('.stat-badge.timer');
    const timerValue = this.container.querySelector('.timer-value');
    this.timerInterval = window.setInterval(() => {
      this.timeRemaining -= 1;
      timerValue.textContent = this.timeRemaining;
      if (this.timeRemaining <= 5) timerBadge.classList.add('warning');
      if (this.timeRemaining <= 0) {
        this.stopTimer();
        this.handleTimeUp();
      }
    }, 1000);
  }

  stopTimer() {
    if (this.timerInterval !== null) window.clearInterval(this.timerInterval);
    this.timerInterval = null;
  }

  handleTimeUp() {
    if (this.answered) return;
    this.answered = true;
    this.removeEventListeners();
    this.container.querySelectorAll('.answer-btn').forEach(button => button.classList.add('disabled'));
    this.highlightCorrectAnswer();
    this.showTimeUp();
    this.animateQuestion();
  }

  showTimeUp() {
    const message = document.createElement('div');
    message.className = 'time-up-message';
    message.innerHTML = '<i class="fa-solid fa-clock"></i> TIME\'S UP!';
    this.container.querySelector('.question-card').append(message);
  }

  checkAnswer(choiceElement) {
    if (this.answered) return;
    this.answered = true;
    this.stopTimer();
    this.removeEventListeners();
    const selectedAnswer = this.allAnswers[Number(choiceElement.dataset.answerIndex)];
    const isCorrect = selectedAnswer === this.correctAnswer;
    if (isCorrect) {
      choiceElement.classList.add('correct');
      this.quiz.incrementScore();
      this.playSound(true);
    } else {
      choiceElement.classList.add('wrong');
      this.highlightCorrectAnswer();
      this.playSound(false);
    }
    this.container.querySelectorAll('.answer-btn').forEach(button => {
      if (button !== choiceElement) button.classList.add('disabled');
    });
    this.container.querySelector('.score-item-value').textContent = this.quiz.score;
    this.animateQuestion();
  }

  highlightCorrectAnswer() {
    this.container.querySelectorAll('.answer-btn').forEach(button => {
      const answer = this.allAnswers[Number(button.dataset.answerIndex)];
      if (answer === this.correctAnswer) button.classList.add('correct-reveal');
    });
  }

  playSound(correct) {
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return;
      const context = new AudioContextClass();
      const notes = correct ? [660, 880] : [240, 180];
      notes.forEach((frequency, index) => {
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        const start = context.currentTime + index * 0.12;
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(frequency, start);
        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.exponentialRampToValueAtTime(0.12, start + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.17);
        oscillator.connect(gain);
        gain.connect(context.destination);
        oscillator.start(start);
        oscillator.stop(start + 0.18);
      });
      window.setTimeout(() => context.close(), 500);
    } catch { /* Sound is a nonessential enhancement. */ }
  }

  animateQuestion() {
    window.setTimeout(() => {
      const card = this.container.querySelector('.question-card');
      if (card) card.classList.add('exit');
      window.setTimeout(() => this.getNextQuestion(), 400);
    }, 1100);
  }

  getNextQuestion() {
    if (this.quiz.nextQuestion()) {
      new Question(this.quiz, this.container, this.onQuizEnd).displayQuestion();
    } else {
      this.stopTimer();
      this.removeEventListeners();
      this.onQuizEnd(this.quiz.endQuiz());
    }
  }
}
