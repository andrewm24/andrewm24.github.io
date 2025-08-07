// Simple Pokémon-themed Pomodoro timer and journal
const FOCUS_DURATION = 25 * 60; // 25 minutes
const BREAK_DURATION = 5 * 60;  // 5 minutes

let remaining = FOCUS_DURATION;
let timerType = 'focus';
let intervalId = null;
let endTime = null;

const timerDisplay = document.getElementById('timer-display');
const startBtn = document.getElementById('start');
const pauseBtn = document.getElementById('pause');
const resetBtn = document.getElementById('reset');
const sessionCountEl = document.getElementById('session-count');
const mascotEl = document.getElementById('mascot');
const journalEl = document.getElementById('journal');
const starterModal = document.getElementById('starter-modal');

// Load starter or show modal
const starterMap = {
  pikachu: '⚡',
  charmander: '🔥',
  squirtle: '💧',
  bulbasaur: '🌱'
};

function loadStarter() {
  const saved = localStorage.getItem('starter');
  if (saved && starterMap[saved]) {
    mascotEl.textContent = starterMap[saved];
  } else {
    starterModal.classList.remove('hidden');
  }
}

starterModal.addEventListener('click', e => {
  if (e.target.classList.contains('starter')) {
    const choice = e.target.getAttribute('data-pokemon');
    localStorage.setItem('starter', choice);
    mascotEl.textContent = starterMap[choice];
    starterModal.classList.add('hidden');
  }
});

loadStarter();

// Journal persistence
journalEl.value = localStorage.getItem('journal') || '';
journalEl.addEventListener('input', () => {
  localStorage.setItem('journal', journalEl.value);
});

// Session count persistence per day
function getTodayKey() {
  return 'sessions-' + new Date().toISOString().slice(0,10);
}

function loadSessions() {
  sessionCountEl.textContent = localStorage.getItem(getTodayKey()) || '0';
}

function incrementSessions() {
  const key = getTodayKey();
  const current = parseInt(localStorage.getItem(key) || '0', 10) + 1;
  localStorage.setItem(key, current);
  sessionCountEl.textContent = current;
}

loadSessions();

// Timer logic
function updateDisplay() {
  const minutes = String(Math.floor(remaining / 60)).padStart(2, '0');
  const seconds = String(remaining % 60).padStart(2, '0');
  timerDisplay.textContent = `${minutes}:${seconds}`;
}

function tick() {
  remaining = Math.max(0, Math.round((endTime - Date.now()) / 1000));
  updateDisplay();
  if (remaining <= 0) {
    clearInterval(intervalId);
    intervalId = null;
    mascotEl.classList.remove('running');
    if (timerType === 'focus') {
      incrementSessions();
      timerType = 'break';
      remaining = BREAK_DURATION;
      startTimer();
    } else {
      timerType = 'focus';
      remaining = FOCUS_DURATION;
    }
  }
}

function startTimer() {
  if (intervalId) return;
  endTime = Date.now() + remaining * 1000;
  intervalId = setInterval(tick, 1000);
  mascotEl.classList.add('running');
}

function pauseTimer() {
  if (!intervalId) return;
  clearInterval(intervalId);
  intervalId = null;
  remaining = Math.max(0, Math.round((endTime - Date.now()) / 1000));
  mascotEl.classList.remove('running');
}

function resetTimer() {
  clearInterval(intervalId);
  intervalId = null;
  timerType = 'focus';
  remaining = FOCUS_DURATION;
  updateDisplay();
  mascotEl.classList.remove('running');
}

startBtn.addEventListener('click', startTimer);
pauseBtn.addEventListener('click', pauseTimer);
resetBtn.addEventListener('click', resetTimer);

updateDisplay();
