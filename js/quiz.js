const API_URL = 'https://opentdb.com/api.php';
const SCORE_STORAGE_KEY = 'quizHighScores';

export default class Quiz {
  constructor(category, difficulty, numberOfQuestions, playerName) {
    this.category = category;
    this.difficulty = difficulty;
    this.numberOfQuestions = numberOfQuestions;
    this.playerName = playerName || 'Player';
    this.score = 0;
    this.questions = [];
    this.currentQuestionIndex = 0;
  }

  buildApiUrl() {
    const params = new URLSearchParams({
      amount: String(this.numberOfQuestions),
      difficulty: this.difficulty
    });
    if (this.category) params.set('category', this.category);
    return `${API_URL}?${params}`;
  }

  async getQuestions() {
    const response = await fetch(this.buildApiUrl());
    if (!response.ok) throw new Error('Could not connect to the quiz service. Please try again.');
    const data = await response.json();
    if (data.response_code === 1) throw new Error('Not enough questions match those settings. Try a different category or fewer questions.');
    if (data.response_code !== 0 || !data.results?.length) throw new Error('No questions were returned. Please try again.');
    this.questions = data.results;
    this.numberOfQuestions = this.questions.length;
    return this.questions;
  }

  incrementScore() { this.score += 1; }
  getCurrentQuestion() { return this.questions[this.currentQuestionIndex] ?? null; }
  nextQuestion() {
    this.currentQuestionIndex += 1;
    return !this.isComplete();
  }
  isComplete() { return this.currentQuestionIndex >= this.questions.length; }
  getScorePercentage() {
    return this.questions.length ? Math.round((this.score / this.questions.length) * 100) : 0;
  }

  getHighScores() {
    try {
      const saved = JSON.parse(localStorage.getItem(SCORE_STORAGE_KEY) || '[]');
      return Array.isArray(saved) ? saved : [];
    } catch {
      return [];
    }
  }

  isHighScore() {
    const scores = this.getHighScores();
    return scores.length < 10 || this.getScorePercentage() > (scores[scores.length - 1]?.percentage ?? -1);
  }

  saveHighScore() {
    const scores = this.getHighScores();
    scores.push({
      name: this.playerName,
      score: this.score,
      total: this.questions.length,
      percentage: this.getScorePercentage(),
      difficulty: this.difficulty,
      date: new Date().toISOString()
    });
    scores.sort((a, b) => b.percentage - a.percentage || b.score - a.score);
    try { localStorage.setItem(SCORE_STORAGE_KEY, JSON.stringify(scores.slice(0, 10))); } catch { /* Storage may be disabled. */ }
  }

  endQuiz() {
    const percentage = this.getScorePercentage();
    const newRecord = this.isHighScore();
    if (newRecord) this.saveHighScore();
    const highScores = this.getHighScores();
    const rows = highScores.slice(0, 5).map((entry, index) => {
      const medal = ['gold', 'silver', 'bronze'][index] || '';
      return `<li class="leaderboard-item ${medal}"><span class="leaderboard-rank">#${index + 1}</span><span class="leaderboard-name">${this.escapeHtml(entry.name)}</span><span class="leaderboard-score">${entry.percentage}%</span></li>`;
    }).join('');

    return `<section class="game-card results-card" aria-live="polite">
      <h2 class="results-title">Quiz Complete!</h2>
      <p class="results-score-display">${this.score}/${this.questions.length}</p>
      <p class="results-percentage">${percentage}% Accuracy</p>
      ${newRecord ? '<div class="new-record-badge"><i class="fa-solid fa-star"></i> New High Score!</div>' : ''}
      <div class="leaderboard"><h4 class="leaderboard-title"><i class="fa-solid fa-trophy"></i> Leaderboard</h4>
        ${rows ? `<ul class="leaderboard-list">${rows}</ul>` : '<p class="leaderboard-empty">Play a round to start the leaderboard.</p>'}
      </div>
      <div class="action-buttons"><button class="btn-restart" type="button"><i class="fa-solid fa-rotate-right"></i> Play Again</button></div>
    </section>`;
  }

  escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  }
}
