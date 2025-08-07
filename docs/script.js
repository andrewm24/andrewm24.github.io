// Pokémon Pomodoro timer with journal and training mechanics

// ----- Duration selectors -----
const workSelect = document.getElementById('work-duration');
const breakSelect = document.getElementById('break-duration');

for (let i = 5; i <= 60; i += 5) {
  const optWork = document.createElement('option');
  optWork.value = i;
  optWork.textContent = `${i} min`;
  workSelect.appendChild(optWork);

  const optBreak = document.createElement('option');
  optBreak.value = i;
  optBreak.textContent = `${i} min`;
  breakSelect.appendChild(optBreak);
}

let focusDuration = parseInt(localStorage.getItem('focusDuration') || '25', 10);
let breakDuration = parseInt(localStorage.getItem('breakDuration') || '5', 10);
workSelect.value = focusDuration;
breakSelect.value = breakDuration;

workSelect.addEventListener('change', () => {
  focusDuration = parseInt(workSelect.value, 10);
  localStorage.setItem('focusDuration', focusDuration);
  if (timerType === 'focus' && !intervalId) {
    remaining = focusDuration * 60;
    updateDisplay();
  }
});

breakSelect.addEventListener('change', () => {
  breakDuration = parseInt(breakSelect.value, 10);
  localStorage.setItem('breakDuration', breakDuration);
  if (timerType === 'break' && !intervalId) {
    remaining = breakDuration * 60;
    updateDisplay();
  }
});

// ----- Timer setup -----
let remaining = focusDuration * 60;
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
const pokemonListEl = document.getElementById('pokemon-list');

// ----- Pokémon data -----
const basePokemon = [
  { name: 'pikachu', label: 'Pikachu', emoji: '⚡' },
  { name: 'charmander', label: 'Charmander', emoji: '🔥' },
  { name: 'squirtle', label: 'Squirtle', emoji: '💧' },
  { name: 'bulbasaur', label: 'Bulbasaur', emoji: '🌱' }
];

let pokemonData = JSON.parse(localStorage.getItem('pokemonData') || '{}');
let activePokemon = localStorage.getItem('activePokemon');

function savePokemon() {
  localStorage.setItem('pokemonData', JSON.stringify(pokemonData));
}

function updateMascot() {
  const entry = basePokemon.find(p => p.name === activePokemon);
  mascotEl.textContent = entry ? entry.emoji : '❓';
}

function renderPokedex() {
  pokemonListEl.innerHTML = '';
  basePokemon.forEach(p => {
    const li = document.createElement('li');
    li.className = 'pokemon';
    const details = document.createElement('div');
    details.className = 'details';
    details.innerHTML = `<span class="emoji">${p.emoji}</span> <span class="name">${p.label}</span>`;
    li.appendChild(details);

    const data = pokemonData[p.name];
    if (data) {
      const levelInfo = document.createElement('span');
      levelInfo.textContent = `Lv ${data.level} (${data.xp}/${data.level * 100})`;
      details.appendChild(levelInfo);
      if (activePokemon === p.name) {
        const badge = document.createElement('span');
        badge.className = 'badge';
        badge.textContent = 'Training';
        details.appendChild(badge);
      }
      const trainBtn = document.createElement('button');
      trainBtn.textContent = activePokemon === p.name ? 'Active' : 'Train';
      trainBtn.disabled = activePokemon === p.name;
      trainBtn.dataset.train = p.name;
      li.appendChild(trainBtn);
    } else {
      const captureBtn = document.createElement('button');
      captureBtn.textContent = 'Capture';
      captureBtn.dataset.capture = p.name;
      li.appendChild(captureBtn);
    }
    pokemonListEl.appendChild(li);
  });
}

pokemonListEl.addEventListener('click', e => {
  const { capture, train } = e.target.dataset;
  if (capture) {
    pokemonData[capture] = { xp: 0, level: 1 };
    savePokemon();
    if (!activePokemon) {
      activePokemon = capture;
      localStorage.setItem('activePokemon', activePokemon);
      updateMascot();
    }
    renderPokedex();
  } else if (train) {
    activePokemon = train;
    localStorage.setItem('activePokemon', activePokemon);
    updateMascot();
    renderPokedex();
  }
});

// ----- Starter selection -----
function loadStarter() {
  if (!activePokemon) {
    starterModal.classList.remove('hidden');
  } else {
    updateMascot();
    renderPokedex();
  }
}

starterModal.addEventListener('click', e => {
  if (e.target.classList.contains('starter')) {
    const choice = e.target.getAttribute('data-pokemon');
    if (!pokemonData[choice]) {
      pokemonData[choice] = { xp: 0, level: 1 };
      savePokemon();
    }
    activePokemon = choice;
    localStorage.setItem('activePokemon', activePokemon);
    updateMascot();
    renderPokedex();
    starterModal.classList.add('hidden');
  }
});

loadStarter();

// ----- Journal persistence -----
journalEl.value = localStorage.getItem('journal') || '';
journalEl.addEventListener('input', () => {
  localStorage.setItem('journal', journalEl.value);
});

// ----- Session count persistence per day -----
function getTodayKey() {
  return 'sessions-' + new Date().toISOString().slice(0, 10);
}

function loadSessions() {
  sessionCountEl.textContent = localStorage.getItem(getTodayKey()) || '0';
}

function incrementSessions() {
  const key = getTodayKey();
  const current = parseInt(localStorage.getItem(key) || '0', 10) + 1;
  localStorage.setItem(key, current);
  sessionCountEl.textContent = current;
  awardXP();
}

loadSessions();

// ----- XP and leveling -----
function awardXP() {
  if (!activePokemon) return;
  const mon = pokemonData[activePokemon];
  mon.xp += 10;
  while (mon.xp >= mon.level * 100) {
    mon.xp -= mon.level * 100;
    mon.level += 1;
  }
  savePokemon();
  renderPokedex();
}

// ----- Timer logic -----
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
      remaining = breakDuration * 60;
      startTimer();
    } else {
      timerType = 'focus';
      remaining = focusDuration * 60;
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
  remaining = focusDuration * 60;
  updateDisplay();
  mascotEl.classList.remove('running');
}

startBtn.addEventListener('click', startTimer);
pauseBtn.addEventListener('click', pauseTimer);
resetBtn.addEventListener('click', resetTimer);

updateDisplay();
renderPokedex();
