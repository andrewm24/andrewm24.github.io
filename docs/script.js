// Strip stray branch or merge conflict text that can appear in the DOM
const strayWalker = document.createTreeWalker(
  document.documentElement,
  NodeFilter.SHOW_TEXT
);
const strayPattern = /(codex\/|<<<<<<<|=======|>>>>>>)/i;
let strayNode;
while ((strayNode = strayWalker.nextNode())) {
  if (strayPattern.test(strayNode.textContent)) {
    strayNode.textContent = '';
  }
}

// Timer logic
let workDuration = 25 * 60;
let breakDuration = 5 * 60;
let duration = workDuration;
let totalMs = duration * 1000;
let remaining = duration;
let startTime;
let rafId = null;
let paused = true;
let isBreak = false;

const timeEl = document.getElementById('time');
const progressBar = document.querySelector('#progress .bar');
const circumference = 2 * Math.PI * 45;
progressBar.style.strokeDasharray = `${circumference}px`;

const startBtn = document.getElementById('start');
const pauseBtn = document.getElementById('pause');
const resetBtn = document.getElementById('reset');
const workInput = document.getElementById('work-duration');
const breakInput = document.getElementById('break-duration');
const totalFocusEl = document.getElementById('total-focus');
const sessionCountEl = document.getElementById('session-count');
const xpEl = document.getElementById('xp');

let totalFocus = parseInt(localStorage.getItem('total-focus'), 10) || 0;
let sessionCount = parseInt(localStorage.getItem('session-count'), 10) || 0;

// Load persistent Pokémon data
const pokemonXP = JSON.parse(localStorage.getItem('pokemonXP') || '{}');
const capturedPokemon = JSON.parse(localStorage.getItem('capturedPokemon') || '[]');
let partnerPokemonId = localStorage.getItem('partnerPokemonId');
let pokemonData = [];

function renderStats() {
  if (totalFocusEl) totalFocusEl.textContent = totalFocus;
  if (sessionCountEl) sessionCountEl.textContent = sessionCount;
  if (xpEl) {
    const xp = pokemonXP[partnerPokemonId] || 0;
    xpEl.textContent = xp;
  }
}

function populateDropdown(select, defaultValue) {
  for (let i = 1; i <= 60; i++) {
    const option = document.createElement('option');
    option.value = i;
    option.textContent = i;
    select.appendChild(option);
  }
  select.value = defaultValue;
}

populateDropdown(workInput, 25);
populateDropdown(breakInput, 5);

// Load saved durations or fall back to defaults
const savedWork = parseInt(localStorage.getItem('work-duration'), 10);
const savedBreak = parseInt(localStorage.getItem('break-duration'), 10);
if (!isNaN(savedWork)) {
  workDuration = savedWork * 60;
  workInput.value = savedWork;
}
if (!isNaN(savedBreak)) {
  breakDuration = savedBreak * 60;
  breakInput.value = savedBreak;
}
duration = workDuration;
remaining = duration;
totalMs = duration * 1000;

function updateDisplay(secRemaining) {
  const mins = String(Math.floor(secRemaining / 60)).padStart(2, '0');
  const secs = String(secRemaining % 60).padStart(2, '0');
  timeEl.textContent = `${mins}:${secs}`;
}

function frame(timestamp) {
  const elapsed = timestamp - startTime;
  const progress = Math.min(elapsed / totalMs, 1);
  const secRemaining = Math.ceil((totalMs - elapsed) / 1000);

  progressBar.style.strokeDashoffset = `${circumference * progress}px`;

  if (secRemaining !== remaining) {
    remaining = secRemaining;
    updateDisplay(remaining);
  }

  if (progress < 1) {
    rafId = requestAnimationFrame(frame);
  } else {
    paused = true;
    timeEl.classList.add('complete');
    if (!isBreak) {
      addXP(partnerPokemonId, 10);
      const gained = workDuration / 60;
      totalFocus += gained;
      sessionCount += 1;
      localStorage.setItem('total-focus', totalFocus);
      localStorage.setItem('session-count', sessionCount);
      renderStats();
      launchConfetti();
      isBreak = true;
      duration = breakDuration;
      remaining = duration;
      totalMs = duration * 1000;
      updateDisplay(remaining);
      progressBar.style.strokeDashoffset = '0px';
      timeEl.classList.remove('complete');
      startTime = performance.now();
      paused = false;
      rafId = requestAnimationFrame(frame);
    } else {
      isBreak = false;
      duration = workDuration;
      remaining = duration;
      totalMs = duration * 1000;
      updateDisplay(remaining);
      progressBar.style.strokeDashoffset = '0px';
      timeEl.classList.remove('complete');
    }
  }
}

startBtn.addEventListener('click', () => {
  if (!paused) return;
  paused = false;
  startTime = performance.now() - (duration - remaining) * 1000;
  rafId = requestAnimationFrame(frame);
});

pauseBtn.addEventListener('click', () => {
  if (paused) return;
  paused = true;
  cancelAnimationFrame(rafId);
});

resetBtn.addEventListener('click', () => {
  cancelAnimationFrame(rafId);
  paused = true;
  isBreak = false;
  duration = workDuration;
  remaining = duration;
  totalMs = duration * 1000;
  updateDisplay(remaining);
  progressBar.style.strokeDashoffset = '0px';
  timeEl.classList.remove('complete');
});

function applyDurations() {
  workDuration = Math.max(parseInt(workInput.value, 10) || 1, 1) * 60;
  breakDuration = Math.max(parseInt(breakInput.value, 10) || 1, 1) * 60;
  localStorage.setItem('work-duration', workInput.value);
  localStorage.setItem('break-duration', breakInput.value);
  if (!isBreak) {
    duration = workDuration;
  } else {
    duration = breakDuration;
  }
  remaining = duration;
  totalMs = duration * 1000;
  updateDisplay(remaining);
  progressBar.style.strokeDashoffset = '0px';
  cancelAnimationFrame(rafId);
  paused = true;
  timeEl.classList.remove('complete');
}

workInput.addEventListener('change', applyDurations);
breakInput.addEventListener('change', applyDurations);

updateDisplay(remaining);
renderStats();

// Journal logic
const entryDate = document.getElementById('entry-date');
const entryText = document.getElementById('entry-text');
const entryMedia = document.getElementById('entry-media');
const saveEntry = document.getElementById('save-entry');
const entriesEl = document.getElementById('entries');
const mediaPreview = document.getElementById('media-preview');
const errorEl = document.getElementById('error');
const searchJournal = document.getElementById('search-journal');
const exportJournal = document.getElementById('export-journal');

function today() {
  return new Date().toISOString().split('T')[0];
}

entryDate.value = today();

saveEntry.addEventListener('click', async () => {
  const date = entryDate.value;
  const text = entryText.value.trim();
  const file = entryMedia.files[0];
  errorEl.textContent = '';
  if (!date || (!text && !file)) return;

  let media, mediaType;
  try {
    if (file) {
      if (file.type.startsWith('video') || file.size > 5 * 1024 * 1024) {
        media = await uploadMedia(file);
        mediaType = file.type;
      } else {
        media = await readFileAsDataURL(file);
        mediaType = file.type;
      }
    } else {
      const existing = JSON.parse(localStorage.getItem('journal-' + date) || '{}');
      media = existing.media;
      mediaType = existing.mediaType;
    }

    const entryObj = { text, media, mediaType };
    localStorage.setItem('journal-' + date, JSON.stringify(entryObj));
    afterSave(date);
    addXP(partnerPokemonId, 5);
  } catch (err) {
    errorEl.textContent = 'Could not save media: ' + err.message;
  }
});

entryMedia.addEventListener('change', () => {
  const file = entryMedia.files[0];
  mediaPreview.innerHTML = '';
  mediaPreview.classList.remove('show');
  if (!file) return;
  const url = URL.createObjectURL(file);
  let el;
  if (file.type.startsWith('video')) {
    el = document.createElement('video');
    el.controls = true;
  } else {
    el = document.createElement('img');
    el.alt = 'Selected media preview';
  }
  el.src = url;
  mediaPreview.appendChild(el);
  mediaPreview.classList.add('show');
});

searchJournal?.addEventListener('input', renderEntries);

exportJournal?.addEventListener('click', () => {
  const keys = Object.keys(localStorage).filter(k => k.startsWith('journal-'));
  if (keys.length === 0) {
    showToast('No entries to export');
    return;
  }
  const entries = {};
  keys.forEach(key => {
    const date = key.replace('journal-', '');
    const raw = localStorage.getItem(key) || '';
    try {
      entries[date] = JSON.parse(raw);
    } catch (e) {
      entries[date] = { text: raw };
    }
  });
  const blob = new Blob([JSON.stringify(entries, null, 2)], {
    type: 'application/json'
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'journal.json';
  a.click();
  URL.revokeObjectURL(url);
});

async function uploadMedia(file) {
  const form = new FormData();
  form.append('media', file);
  const headers = authToken ? { Authorization: 'Bearer ' + authToken } : {};
  const res = await fetch('/api/upload', { method: 'POST', body: form, headers });
  if (!res.ok) throw new Error('Upload failed');
  const data = await res.json();
  return data.url;
}

function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function afterSave(date) {
  entryText.value = '';
  entryMedia.value = '';
  mediaPreview.innerHTML = '';
  mediaPreview.classList.remove('show');
  renderEntries();
  const saved = entriesEl.querySelector(`.entry[data-date="${date}"]`);
  if (saved) saved.classList.add('expanded');
}

function renderEntries() {
  entriesEl.innerHTML = '';
  const term = searchJournal ? searchJournal.value.toLowerCase() : '';
  const keys = Object.keys(localStorage)
    .filter(k => k.startsWith('journal-'))
    .sort()
    .reverse();
  let shown = 0;
  keys.forEach(key => {
    const date = key.replace('journal-', '');
    const raw = localStorage.getItem(key) || '';
    let data;
    try {
      data = JSON.parse(raw);
    } catch (e) {
      data = { text: raw };
    }
    const text = data.text || '';
    const media = data.media;
    const mediaType = data.mediaType;
    if (
      term &&
      !text.toLowerCase().includes(term) &&
      !formatDate(date).toLowerCase().includes(term)
    ) {
      return;
    }

    const entry = document.createElement('div');
    entry.className = 'entry';
    entry.dataset.date = date;

    const title = document.createElement('h3');
    title.textContent = formatDate(date);
    entry.appendChild(title);

    const preview = document.createElement('p');
    preview.className = 'preview';
    preview.textContent = text
      ? text.slice(0, 100) + (text.length > 100 ? '…' : '')
      : '[Media]';
    entry.appendChild(preview);

    const full = document.createElement('p');
    full.className = 'full';
    full.textContent = text;
    entry.appendChild(full);

    if (media) {
      const mediaWrap = document.createElement('div');
      mediaWrap.className = 'media';
      let mediaEl;
      if (mediaType && mediaType.startsWith('video')) {
        mediaEl = document.createElement('video');
        mediaEl.controls = true;
        const source = document.createElement('source');
        source.src = media;
        source.type = mediaType || 'video/mp4';
        mediaEl.appendChild(source);
      } else {
        mediaEl = document.createElement('img');
        mediaEl.alt = 'Journal media';
        mediaEl.src = media;
      }
      mediaWrap.appendChild(mediaEl);
      entry.appendChild(mediaWrap);
    }

    const actions = document.createElement('div');
    actions.className = 'actions';
    const edit = document.createElement('button');
    edit.textContent = 'Edit';
    edit.className = 'edit';
    const del = document.createElement('button');
    del.textContent = 'Delete';
    del.className = 'delete';
    actions.appendChild(edit);
    actions.appendChild(del);
    entry.appendChild(actions);

    entriesEl.appendChild(entry);
    shown++;
  });
  if (shown === 0) {
    const empty = document.createElement('p');
    empty.textContent = 'No entries found.';
    entriesEl.appendChild(empty);
  }
}

entriesEl.addEventListener('click', e => {
  const entry = e.target.closest('.entry');
  if (!entry) return;

  if (e.target.classList.contains('edit')) {
    entryDate.value = entry.dataset.date;
    const raw = localStorage.getItem('journal-' + entry.dataset.date) || '';
    let data;
    try {
      data = JSON.parse(raw);
    } catch (err) {
      data = { text: raw };
    }
    entryText.value = data.text || '';
    entryText.focus();
    entryMedia.value = '';
    mediaPreview.innerHTML = '';
    mediaPreview.classList.remove('show');
    if (data.media) {
      let el;
      if (data.mediaType && data.mediaType.startsWith('video')) {
        el = document.createElement('video');
        el.controls = true;
        const source = document.createElement('source');
        source.src = data.media;
        source.type = data.mediaType || 'video/mp4';
        el.appendChild(source);
      } else {
        el = document.createElement('img');
        el.src = data.media;
        el.alt = 'Journal media';
      }
      mediaPreview.appendChild(el);
      mediaPreview.classList.add('show');
    }
  } else if (e.target.classList.contains('delete')) {
    if (confirm('Delete this entry?')) {
      localStorage.removeItem('journal-' + entry.dataset.date);
      entry.remove();
      showToast('Entry deleted');
    }
  } else {
    entry.classList.toggle('expanded');
  }
});

function formatDate(str) {
  const d = new Date(str + 'T00:00:00');
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
}

renderEntries();

function launchConfetti() {
  for (let i = 0; i < 20; i++) {
    const div = document.createElement('div');
    div.className = 'confetti';
    div.style.left = Math.random() * 100 + 'vw';
    div.style.background = `hsl(${Math.random() * 360},100%,50%)`;
    document.body.appendChild(div);
    setTimeout(() => div.remove(), 3000);
  }
}

const runnerImg = document.getElementById('background-pokemon');
const starterModal = document.getElementById('starter-modal');
const loginModal = document.getElementById('login-modal');
const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');
const loginBtn = document.getElementById('login-btn');
const registerBtn = document.getElementById('register-btn');
const trainerModal = document.getElementById('trainer-modal');
const userInfo = document.getElementById('user-info');
const userNameEl = document.getElementById('user-name');
const trainerNameEl = document.getElementById('trainer-name');
const openPokedexBtn = document.getElementById('open-pokedex');
const pokedexModal = document.getElementById('pokedex-modal');
const pokemonGrid = document.getElementById('pokemon-grid');
const pokemonModal = document.getElementById('pokemon-modal');
const modalName = document.getElementById('modal-name');
const modalSprite = document.getElementById('modal-sprite');
const modalType = document.getElementById('modal-type');
const modalDesc = document.getElementById('modal-desc');
const modalLevel = document.getElementById('modal-level');
const modalXp = document.getElementById('modal-xp');
const modalXpBar = document.getElementById('modal-xp-bar');
const setPartnerBtn = document.getElementById('set-partner');
const partnerDisplay = document.getElementById('partner-display');
const partnerSprite = document.getElementById('partner-sprite');
const partnerNameEl = document.getElementById('partner-name');
const partnerLevelEl = document.getElementById('partner-level');
const partnerXpBar = document.getElementById('partner-xp-bar');

const TRAINERS = {
  red: { name: 'Red' },
  leaf: { name: 'Leaf' },
  ethan: { name: 'Ethan' }
};

let username = localStorage.getItem('username') || '';
let trainer = localStorage.getItem('trainer') || '';
let authToken = localStorage.getItem('token') || '';

function updateUserInfo() {
  if (username) userNameEl.textContent = username;
  trainerNameEl.textContent = trainer ? ` - ${TRAINERS[trainer]?.name || ''}` : '';
  if (username || trainer) userInfo.classList.remove('hidden');
}

function levelThreshold(level) {
  return 25 * (level - 1) * level;
}

function getLevel(xp) {
  let level = 1;
  while (level < 10 && xp >= levelThreshold(level + 1)) level++;
  return level;
}

function totalXP() {
  return Object.values(pokemonXP).reduce((a, b) => a + b, 0);
}

function ensureStarterCaptured() {
  if (partnerPokemonId && !capturedPokemon.includes(parseInt(partnerPokemonId, 10))) {
    capturedPokemon.push(parseInt(partnerPokemonId, 10));
    localStorage.setItem('capturedPokemon', JSON.stringify(capturedPokemon));
  }
}

function addXP(id, amount) {
  if (!id) return;
  pokemonXP[id] = (pokemonXP[id] || 0) + amount;
  localStorage.setItem('pokemonXP', JSON.stringify(pokemonXP));
  updatePartnerDisplay();
  renderPokedex();
  checkCapture();
}

function checkCapture() {
  const nextIndex = capturedPokemon.length;
  if (!pokemonData.length || nextIndex >= pokemonData.length) return;
  const threshold = (nextIndex + 1) * 100;
  if (totalXP() >= threshold) {
    const next = pokemonData[nextIndex];
    capturedPokemon.push(next.id);
    localStorage.setItem('capturedPokemon', JSON.stringify(capturedPokemon));
    showToast(`You caught ${next.name}!`);
    renderPokedex();
    if (!partnerPokemonId) {
      partnerPokemonId = String(next.id);
      localStorage.setItem('partnerPokemonId', partnerPokemonId);
      updatePartnerDisplay();
    }
  }
}

function renderPokedex() {
  if (!pokemonGrid) return;
  pokemonGrid.innerHTML = '';
  capturedPokemon.forEach(id => {
    const data = pokemonData.find(p => p.id === id);
    if (!data) return;
    const card = document.createElement('div');
    card.className = 'pokemon-card';
    const img = document.createElement('img');
    img.src = data.sprite;
    img.alt = data.name;
    card.appendChild(img);
    const label = document.createElement('span');
    label.textContent = data.name;
    card.appendChild(label);
    card.addEventListener('click', () => openPokemonModal(id));
    pokemonGrid.appendChild(card);
  });
}

function openPokemonModal(id) {
  const data = pokemonData.find(p => p.id === id);
  if (!data) return;
  const xp = pokemonXP[id] || 0;
  const level = getLevel(xp);
  modalName.textContent = data.name;
  modalSprite.src = data.sprite;
  modalType.textContent = `Type: ${data.type}`;
  modalDesc.textContent = data.description;
  modalLevel.textContent = `Level: ${level}`;
  modalXp.textContent = `XP: ${xp}`;
  const next = levelThreshold(level + 1);
  const cur = levelThreshold(level);
  const progress = Math.min((xp - cur) / (next - cur), 1);
  modalXpBar.style.width = progress * 100 + '%';
  setPartnerBtn.dataset.id = id;
  pokemonModal.classList.remove('hidden');
}

function updatePartnerDisplay() {
  if (!partnerPokemonId) {
    partnerDisplay.classList.add('hidden');
    return;
  }
  const data = pokemonData.find(p => p.id === parseInt(partnerPokemonId, 10));
  if (!data) return;
  const xp = pokemonXP[partnerPokemonId] || 0;
  const level = getLevel(xp);
  partnerSprite.src = data.sprite;
  partnerNameEl.textContent = data.name;
  partnerLevelEl.textContent = 'Lv. ' + level;
  const next = levelThreshold(level + 1);
  const cur = levelThreshold(level);
  const progress = Math.min((xp - cur) / (next - cur), 1);
  partnerXpBar.style.width = progress * 100 + '%';
  partnerDisplay.classList.remove('hidden');
  renderStats();
}

function showToast(message) {
  const div = document.createElement('div');
  div.className = 'capture-toast';
  div.textContent = message;
  document.body.appendChild(div);
  setTimeout(() => div.remove(), 3000);
}

function initModals() {
  if (!username) {
    loginModal?.classList.remove('hidden');
  } else if (!trainer) {
    trainerModal?.classList.remove('hidden');
  } else if (!partnerPokemonId) {
    starterModal?.classList.remove('hidden');
  }
}

registerBtn?.addEventListener('click', async () => {
  const name = usernameInput.value.trim();
  const pass = passwordInput.value;
  if (!name || !pass) return;
  const res = await fetch('/api/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: name, password: pass })
  });
  if (res.ok) {
    showToast('Registered! Please log in.');
  } else {
    showToast('Registration failed');
  }
});

loginBtn?.addEventListener('click', async () => {
  const name = usernameInput.value.trim();
  const pass = passwordInput.value;
  if (!name || !pass) return;
  const res = await fetch('/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: name, password: pass })
  });
  const data = await res.json().catch(() => ({}));
  if (res.ok && data.token) {
    authToken = data.token;
    localStorage.setItem('token', authToken);
    username = name;
    localStorage.setItem('username', name);
    loginModal.classList.add('hidden');
    updateUserInfo();
    initModals();
  } else {
    showToast('Login failed');
  }
});

trainerModal?.addEventListener('click', e => {
  const btn = e.target.closest('[data-id]');
  if (!btn) return;
  trainer = btn.dataset.id;
  localStorage.setItem('trainer', trainer);
  trainerModal.classList.add('hidden');
  updateUserInfo();
  initModals();
});

starterModal?.addEventListener('click', e => {
  const img = e.target.closest('img[data-id]');
  if (!img) return;
  const id = parseInt(img.dataset.id, 10);
  partnerPokemonId = String(id);
  localStorage.setItem('partnerPokemonId', partnerPokemonId);
  ensureStarterCaptured();
  starterModal.classList.add('hidden');
  updatePartnerDisplay();
});

openPokedexBtn?.addEventListener('click', () => {
  pokedexModal.classList.remove('hidden');
  renderPokedex();
});

pokedexModal?.addEventListener('click', e => {
  if (e.target === pokedexModal) pokedexModal.classList.add('hidden');
});

pokemonModal?.addEventListener('click', e => {
  if (e.target === pokemonModal) pokemonModal.classList.add('hidden');
});

setPartnerBtn?.addEventListener('click', () => {
  const id = setPartnerBtn.dataset.id;
  partnerPokemonId = id;
  localStorage.setItem('partnerPokemonId', partnerPokemonId);
  ensureStarterCaptured();
  updatePartnerDisplay();
  pokemonModal.classList.add('hidden');
});

fetch('pokemon-data.json')
  .then(r => r.json())
  .then(data => {
    pokemonData = data;
    ensureStarterCaptured();
    renderPokedex();
    updatePartnerDisplay();
    updateRunner();
    updateUserInfo();
    initModals();
  });

function updateRunner() {
  if (!runnerImg) return;
  const data = pokemonData.find(p => p.id === parseInt(partnerPokemonId, 10));
  runnerImg.src = data ? data.sprite : 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/25.png';
}

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js');
  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (refreshing) return;
    refreshing = true;
    window.location.reload();
  });
}

if ('Notification' in window && Notification.permission === 'default') {
  Notification.requestPermission();
}
