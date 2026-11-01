import Quiz from './quiz.js';
import Question from './question.js';

const quizOptionsForm = document.getElementById('quizOptions');
const playerNameInput = document.getElementById('playerName');
const categoryInput = document.getElementById('categoryMenu');
const difficultyOptions = document.getElementById('difficultyOptions');
const questionsNumberInput = document.getElementById('questionsNumber');
const startQuizBtn = document.getElementById('startQuiz');
const questionsContainer = document.getElementById('questionsContainer');

let currentQuiz = null;

function showLoading() {
  questionsContainer.innerHTML = '<div class="loading-overlay" role="status" aria-live="polite"><div class="loading-spinner"></div><p class="loading-text">Loading Questions...</p></div>';
}

function hideLoading() { questionsContainer.innerHTML = ''; }

function showError(message) {
  questionsContainer.innerHTML = `<section class="game-card error-card"><div class="error-icon"><i class="fa-solid fa-triangle-exclamation"></i></div><h3 class="error-title">Oops! Something went wrong</h3><p class="error-message"></p><button class="btn-play retry-btn" type="button"><i class="fa-solid fa-rotate-right"></i> Try Again</button></section>`;
  questionsContainer.querySelector('.error-message').textContent = message;
  questionsContainer.querySelector('.retry-btn').addEventListener('click', resetToStart);
}

function validateForm() {
  const number = Number(questionsNumberInput.value);
  if (!questionsNumberInput.value || !Number.isInteger(number)) return { isValid: false, error: 'Please enter a whole number of questions.' };
  if (number < 1) return { isValid: false, error: 'Choose at least 1 question.' };
  if (number > 50) return { isValid: false, error: 'You can choose up to 50 questions.' };
  return { isValid: true, error: null };
}

function showFormError(message) {
  document.querySelector('.form-error')?.remove();
  const error = document.createElement('div');
  error.className = 'form-error';
  error.setAttribute('role', 'alert');
  error.innerHTML = '<i class="fa-solid fa-circle-exclamation"></i> ';
  error.append(document.createTextNode(message));
  startQuizBtn.before(error);
  window.setTimeout(() => {
    error.classList.add('fade-out');
    window.setTimeout(() => error.remove(), 350);
  }, 3000);
}

function resetToStart() {
  questionsContainer.innerHTML = '';
  currentQuiz = null;
  quizOptionsForm.classList.remove('hidden');
  startQuizBtn.disabled = false;
}

async function startQuiz() {
  if (startQuizBtn.disabled) return;
  const validation = validateForm();
  if (!validation.isValid) { showFormError(validation.error); return; }

  currentQuiz = new Quiz(
    categoryInput.value,
    difficultyOptions.value,
    Number(questionsNumberInput.value),
    playerNameInput.value.trim() || 'Player'
  );
  quizOptionsForm.classList.add('hidden');
  startQuizBtn.disabled = true;
  showLoading();

  try {
    await currentQuiz.getQuestions();
    hideLoading();
    new Question(currentQuiz, questionsContainer, html => {
      questionsContainer.innerHTML = html;
      questionsContainer.querySelector('.btn-restart')?.addEventListener('click', resetToStart);
    }).displayQuestion();
  } catch (error) {
    showError(error instanceof Error ? error.message : 'Failed to load questions. Please try again.');
  }
}

startQuizBtn.addEventListener('click', startQuiz);
quizOptionsForm.addEventListener('submit', event => { event.preventDefault(); startQuiz(); });
questionsNumberInput.addEventListener('keydown', event => {
  if (event.key === 'Enter') { event.preventDefault(); startQuiz(); }
});
