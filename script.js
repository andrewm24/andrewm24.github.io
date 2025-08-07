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

let totalFocus = parseInt(localStorage.getItem('total-focus'), 10) || 0;
let sessionCount = parseInt(localStorage.getItem('session-count'), 10) || 0;

function renderStats() {
  if (totalFocusEl) totalFocusEl.textContent = totalFocus;
  if (sessionCountEl) sessionCountEl.textContent = sessionCount;
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
    timeEl.classList.add('tick');
    setTimeout(() => timeEl.classList.remove('tick'), 150);
  }

  if (progress < 1) {
    rafId = requestAnimationFrame(frame);
  } else {
    paused = true;
    timeEl.classList.add('complete');
    if (!isBreak) {
      trainActivePokemon();
      capturePokemon();
      totalFocus += workDuration / 60;
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
      if (file.size > 5 * 1024 * 1024) {
        throw new Error('File too large');
      }
      media = await readFileAsDataURL(file);
      mediaType = file.type;
    } else {
      const existing = JSON.parse(localStorage.getItem('journal-' + date) || '{}');
      media = existing.media;
      mediaType = existing.mediaType;
    }

    const entryObj = { text, media, mediaType };
    localStorage.setItem('journal-' + date, JSON.stringify(entryObj));
    afterSave(date);
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
  const keys = Object.keys(localStorage)
    .filter(k => k.startsWith('journal-'))
    .sort()
    .reverse();
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
  });
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
    localStorage.removeItem('journal-' + entry.dataset.date);
    entry.remove();
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
const capturedEl = document.getElementById('captured');
let captured = JSON.parse(localStorage.getItem('captured-pokemon') || '[]').map(p => ({
  id: p.id || null,
  name: p.name,
  sprite: p.sprite,
  xp: p.xp || 0,
  level: p.level || 1
}));
let activePokemonIndex = parseInt(localStorage.getItem('active-pokemon-index'), 10);
if (isNaN(activePokemonIndex)) activePokemonIndex = null;
renderCaptured();
updateRunner();

capturedEl.addEventListener('click', e => {
  const img = e.target.closest('img');
  if (!img) return;
  const index = parseInt(img.dataset.index, 10);
  if (isNaN(index)) return;
  setActivePokemon(index);
});

async function capturePokemon() {
  try {
    let data, species;
    do {
      const id = Math.floor(Math.random() * 151) + 1;
      const speciesRes = await fetch(`https://pokeapi.co/api/v2/pokemon-species/${id}`);
      species = await speciesRes.json();
      if (species.evolves_from_species) continue;
      const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${id}`);
      data = await res.json();
      break;
    } while (true);
    const pokemon = {
      id: data.id,
      name: data.name,
      sprite: data.sprites.front_default,
      xp: 0,
      level: 1
    };
    captured.push(pokemon);
    localStorage.setItem('captured-pokemon', JSON.stringify(captured));
    renderCaptured();
    showToast(`You caught ${pokemon.name}!`);
    if (activePokemonIndex === null) {
      setActivePokemon(captured.length - 1);
    }
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(`You caught ${pokemon.name}!`);
    }
  } catch (e) {
    console.error('Could not capture Pokémon', e);
  }
}

function trainActivePokemon() {
  if (activePokemonIndex === null) return;
  const p = captured[activePokemonIndex];
  if (!p) return;
  p.xp += 10;
  p.level = Math.floor(p.xp / 100) + 1;
  localStorage.setItem('captured-pokemon', JSON.stringify(captured));
  renderCaptured();
  showToast(`${p.name} gained 10 XP!`);
}

function showToast(message) {
  const div = document.createElement('div');
  div.className = 'capture-toast';
  div.textContent = message;
  document.body.appendChild(div);
  setTimeout(() => div.remove(), 3000);
}

function renderCaptured() {
  if (!capturedEl) return;
  capturedEl.innerHTML = '';
  captured.forEach((p, index) => {
    const wrapper = document.createElement('div');
    wrapper.className = 'pokemon';
    if (index === activePokemonIndex) wrapper.classList.add('active');
    const img = document.createElement('img');
    img.src = p.sprite;
    img.alt = p.name;
    img.title = p.name;
    img.dataset.index = index;
    const level = document.createElement('span');
    level.className = 'level';
    level.textContent = 'Lv. ' + p.level;
    wrapper.appendChild(img);
    wrapper.appendChild(level);
    capturedEl.appendChild(wrapper);
  });
}

function setActivePokemon(index) {
  activePokemonIndex = index;
  localStorage.setItem('active-pokemon-index', index);
  updateRunner();
  renderCaptured();
}

function updateRunner() {
  if (!runnerImg) return;
  const p = captured[activePokemonIndex];
  runnerImg.src = p ? p.sprite : 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/25.png';
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
