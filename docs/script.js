// Firebase and Firestore imports
import {
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword
} from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js';
import {
  doc,
  setDoc,
  getDoc,
  getDocs,
  collection,
  addDoc,
  query,
  orderBy,
  limit,
  increment,
  serverTimestamp,
  runTransaction
} from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js';
import { auth, db } from './firebase-init.js';

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

let currentUser = null; // Firebase auth user
let sessionKey = null; // Cached journal encryption key

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
const sessionGoalInput = document.getElementById('session-goal');
const timeWrapper = document.getElementById('time-wrapper');
const totalFocusEl = document.getElementById('total-focus');
const sessionCountEl = document.getElementById('session-count');
const xpEl = document.getElementById('xp');
const streakEl = document.getElementById('streak');

let totalFocus = parseInt(localStorage.getItem('total-focus'), 10) || 0;
let sessionCount = parseInt(localStorage.getItem('session-count'), 10) || 0;
let streak = parseInt(localStorage.getItem('streak'), 10) || 0;
let lastFocusDate = localStorage.getItem('last-focus-date');

// Load persistent Pokémon data
const pokemonXP = JSON.parse(localStorage.getItem('pokemonXP') || '{}');
const capturedPokemon = JSON.parse(localStorage.getItem('capturedPokemon') || '[]');
let partnerPokemonId = localStorage.getItem('partnerPokemonId');
let pokemonData = [];

const pokemonSources = JSON.parse(localStorage.getItem('pokemonSources') || '{}');
const badgeDefs = {
  firstPomodoro: 'First Pomodoro',
  threeDayStreak: '3-Day Streak',
  hundredMinutes: '100 Minutes Total',
  firstJournal: 'First Journal Entry',
  fullyEvolved: 'Fully Evolved Pokémon',
  nightOwl: 'Night Owl'
};
let badges = JSON.parse(localStorage.getItem('badges') || '{}');
const xpLog = JSON.parse(localStorage.getItem('xpLog') || '[]');

const dailyGoalInput = document.getElementById('daily-goal');
if (dailyGoalInput) dailyGoalInput.value = parseInt(localStorage.getItem('dailyGoal'), 10) || 60;
const goalBar = document.getElementById('goal-bar');
const goalPercent = document.getElementById('goal-percent');
const goalModal = document.getElementById('goal-modal');
const goalClose = document.getElementById('goal-close');
const heatmapEl = document.getElementById('heatmap');
const moodSelector = document.getElementById('mood-selector');
const moodChartEl = document.getElementById('moodChart');
const tagFilter = document.getElementById('tag-filter');
const exportDataBtn = document.getElementById('export-data');
const trainerCardBtn = document.getElementById('open-trainer-card');
const trainerCardModal = document.getElementById('trainer-card-modal');
const badgeGrid = document.getElementById('badge-grid');
const xpLogBtn = document.getElementById('open-xp-log');
const xpLogModal = document.getElementById('xp-log-modal');
const xpLogList = document.getElementById('xp-log-list');
const themeSelect = document.getElementById('theme-select');

let selectedMood = null;

// Fetch focus statistics from Firestore for the signed-in user
async function getFocusStats(range = 30) {
  if (!currentUser) {
    const local = JSON.parse(localStorage.getItem('focusStats') || '{}');
    return local;
  }
  const statsRef = collection(db, 'users', currentUser.uid, 'stats');
  const q = query(statsRef, orderBy('__name__'), limit(range));
  const snap = await getDocs(q);
  const stats = {};
  snap.forEach(d => (stats[d.id] = d.data().minutes || 0));
  return stats;
}

// Atomically store focused minutes and append to the XP log
async function saveFocusMinutes(date, mins) {
  if (currentUser) {
    const statsRef = doc(db, 'users', currentUser.uid, 'stats', date);
    await setDoc(
      statsRef,
      { minutes: increment(mins), sessions: increment(1), xpGained: increment(mins) },
      { merge: true }
    );
    await addDoc(collection(db, 'users', currentUser.uid, 'xpLog'), {
      delta: mins,
      reason: 'focus',
      timestamp: serverTimestamp()
    });
    await gainXp(partnerPokemonId, mins);
  } else {
    const stats = JSON.parse(localStorage.getItem('focusStats') || '{}');
    stats[date] = (stats[date] || 0) + mins;
    localStorage.setItem('focusStats', JSON.stringify(stats));
  }
  renderGoal();
  renderHeatmap();
  const stats = await getFocusStats(7);
  renderFocusChart(stats);
  renderStatsSummary(stats);
  streak = await getStreak();
  renderStats();
}

let focusChart;

// Plot a chart of focused minutes using Chart.js
function renderFocusChart(stats) {
  const chartEl = document.getElementById('focusChart');
  if (!chartEl || typeof Chart === 'undefined') return;
  const labels = Object.keys(stats).sort().slice(-7);
  const data = labels.map(d => stats[d]);
  if (focusChart) focusChart.destroy();
  focusChart = new Chart(chartEl.getContext('2d'), {
    type: 'bar',
    data: {
      labels,
      datasets: [
        { label: 'Minutes', data, backgroundColor: 'rgba(255,99,132,0.8)' }
      ]
    },
    options: {
      plugins: { title: { display: true, text: 'Minutes Focused' } },
      scales: {
        x: { title: { display: true, text: 'Date' } },
        y: { beginAtZero: true, title: { display: true, text: 'Minutes' } }
      }
    }
  });
}

// Show total minutes, best day, and current streak
function renderStatsSummary(stats) {
  const summaryEl = document.getElementById('focus-summary');
  if (!summaryEl) return;
  const entries = Object.entries(stats);
  const total = entries.reduce((sum, [, v]) => sum + v, 0);
  let bestDay = 'N/A';
  let bestVal = 0;
  for (const [day, val] of entries) {
    if (val > bestVal) {
      bestVal = val;
      bestDay = day;
    }
  }
  const dates = Object.keys(stats).sort().reverse();
  let streakCount = 0;
  for (const d of dates) {
    if (stats[d] > 0) streakCount++;
    else break;
  }
  summaryEl.innerHTML = `
    <p>Total Minutes: ${total}</p>
    <p>Most Productive Day: ${bestDay}${bestVal ? ` (${bestVal} min)` : ''}</p>
    <p>Current Streak: ${streakCount} day${streakCount === 1 ? '' : 's'}</p>
  `;
}

async function renderStats() {
  if (totalFocusEl) totalFocusEl.textContent = totalFocus;
  if (sessionCountEl) sessionCountEl.textContent = sessionCount;
  if (xpEl) {
    let xp = pokemonXP[partnerPokemonId] || 0;
    if (currentUser && partnerPokemonId) {
      const snap = await getDoc(doc(db, 'users', currentUser.uid, 'pokedex', String(partnerPokemonId)));
      if (snap.exists()) xp = snap.data().xp || 0;
    }
    xpEl.textContent = xp;
  }
  if (streakEl) streakEl.textContent = streak;
}

function checkStreak() {
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  if (lastFocusDate !== today && lastFocusDate !== yesterday) {
    streak = 0;
    localStorage.setItem('streak', streak);
  }
}

function updateStreak() {
  const today = new Date().toISOString().split('T')[0];
  if (lastFocusDate === today) return;
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  if (lastFocusDate === yesterday) {
    streak += 1;
  } else {
    streak = 1;
  }
  lastFocusDate = today;
  localStorage.setItem('streak', streak);
  localStorage.setItem('last-focus-date', lastFocusDate);
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
populateDropdown(sessionGoalInput, 1);

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
const savedGoal = parseInt(localStorage.getItem('session-goal'), 10);
if (!isNaN(savedGoal)) {
  sessionGoalInput.value = savedGoal;
}
duration = workDuration;
remaining = duration;
totalMs = duration * 1000;

checkStreak();
renderStats();
getFocusStats(7).then(stats => {
  renderFocusChart(stats);
  renderStatsSummary(stats);
});
renderGoal();
renderHeatmap();
renderMoodChart();
populateTags();
applyTheme();
scheduleReminder();

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
      gainXp(partnerPokemonId, 10);
      const gained = workDuration / 60;
      totalFocus += gained;
      sessionCount += 1;
      localStorage.setItem('total-focus', totalFocus);
      localStorage.setItem('session-count', sessionCount);
      updateStreak();
      checkBadges();
      if (new Date().getHours() >= 0 && new Date().getHours() < 6)
        awardBadge('nightOwl');
      renderStats();
      const today = new Date().toISOString().split('T')[0];
      saveFocusMinutes(today, gained);
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
function updateBallAppearance() {
  const count = parseInt(sessionGoalInput.value, 10) || 1;
  timeWrapper.classList.remove('great-ball', 'ultra-ball', 'master-ball');
  if (count >= 4) {
    timeWrapper.classList.add('master-ball');
  } else if (count >= 3) {
    timeWrapper.classList.add('ultra-ball');
  } else if (count >= 2) {
    timeWrapper.classList.add('great-ball');
  }
}
sessionGoalInput.addEventListener('change', () => {
  localStorage.setItem('session-goal', sessionGoalInput.value);
  updateBallAppearance();
});

updateDisplay(remaining);
renderStats();
updateBallAppearance();

// Journal logic
const entryDate = document.getElementById('entry-date');
const entryText = document.getElementById('entry-text');
const entryMedia = document.getElementById('entry-media');
const entryTags = document.getElementById('entry-tags');
const saveEntry = document.getElementById('save-entry');
const entriesEl = document.getElementById('entries');
const mediaPreview = document.getElementById('media-preview');
const uploadProgress = document.getElementById('upload-progress');
const errorEl = document.getElementById('error');
const searchJournal = document.getElementById('search-journal');
const exportJournal = document.getElementById('export-journal');
const importJournalBtn = document.getElementById('import-journal');
const importFileInput = document.getElementById('import-file');
const wordCountEl = document.getElementById('word-count');

function today() {
  return new Date().toISOString().split('T')[0];
}

entryDate.value = today();
loadEntry();
entryDate.addEventListener('change', loadEntry);

function updateWordCount() {
  const words = entryText.value.trim().split(/\s+/).filter(Boolean).length;
  wordCountEl.textContent = `${words} word${words !== 1 ? 's' : ''}`;
}

function saveDraft() {
  const draft = { text: entryText.value, tags: entryTags.value };
  localStorage.setItem('draft-' + entryDate.value, JSON.stringify(draft));
}

function loadEntry() {
  const date = entryDate.value;
  const saved = localStorage.getItem('journal-' + date);
  const draft = localStorage.getItem('draft-' + date);
  let data = null;
  if (saved) {
    try {
      data = JSON.parse(saved);
    } catch {
      data = { text: saved };
    }
  } else if (draft) {
    try {
      data = JSON.parse(draft);
    } catch {
      data = { text: draft };
    }
  }
  entryText.value = data?.text || '';
  entryTags.value = Array.isArray(data?.tags)
    ? data.tags.join(', ')
    : data?.tags || '';
  selectedMood = data?.mood || null;
  Array.from(moodSelector?.children || []).forEach(el =>
    el.classList.toggle('active', el.dataset.mood === selectedMood)
  );
  entryMedia.value = '';
  mediaPreview.innerHTML = '';
  mediaPreview.classList.remove('show');
  if (data?.media) {
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
  updateWordCount();
}

entryText.addEventListener('input', () => {
  updateWordCount();
  saveDraft();
});

entryTags.addEventListener('input', saveDraft);

saveEntry.addEventListener('click', async () => {
  const date = entryDate.value;
  const text = entryText.value.trim();
  const tags = entryTags.value
    .split(',')
    .map(t => t.trim())
    .filter(Boolean);
  const file = entryMedia.files[0];
  errorEl.textContent = '';
  if (!date || (!text && !file)) return;

  let media;
  try {
    if (file) {
      if (file.type.startsWith('video') || file.size > 5 * 1024 * 1024) {
        if (!authToken && currentUser) throw new Error('Login required for large files');
        media = await uploadMedia(file);
      } else {
        media = await readFileAsDataURL(file);
      }
    } else {
      const existing = JSON.parse(localStorage.getItem('journal-' + date) || '{}');
      media = existing.media;
    }
    await saveJournalEntry(date, text, selectedMood, tags, media ? [media] : []);
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

importJournalBtn?.addEventListener('click', () => importFileInput?.click());

importFileInput?.addEventListener('change', () => {
  const file = importFileInput.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const data = JSON.parse(e.target.result);
      if (data && typeof data === 'object') {
        Object.entries(data).forEach(([date, entry]) => {
          localStorage.setItem('journal-' + date, JSON.stringify(entry));
        });
        showToast('Journal imported');
        renderEntries();
      }
    } catch {
      showToast('Import failed');
    }
  };
  reader.readAsText(file);
  importFileInput.value = '';
});

function uploadMedia(file) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', API_BASE + '/api/upload');
    if (authToken) xhr.setRequestHeader('Authorization', 'Bearer ' + authToken);

    xhr.upload.onprogress = e => {
      if (e.lengthComputable) {
        uploadProgress.max = e.total;
        uploadProgress.value = e.loaded;
        uploadProgress.classList.add('show');
      }
    };

    xhr.onload = () => {
      uploadProgress.classList.remove('show');
      if (xhr.status === 200) {
        try {
          const data = JSON.parse(xhr.responseText);
          resolve(data.url);
        } catch {
          reject(new Error('Upload failed'));
        }
      } else {
        const msg = xhr.status === 413 ? 'File too large' : 'Upload failed';
        reject(new Error(msg));
      }
    };

    xhr.onerror = () => {
      uploadProgress.classList.remove('show');
      reject(new Error('Upload failed'));
    };

    const form = new FormData();
    form.append('media', file);
    xhr.send(form);
  });
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
  entryTags.value = '';
  entryMedia.value = '';
  mediaPreview.innerHTML = '';
  mediaPreview.classList.remove('show');
  uploadProgress.value = 0;
  uploadProgress.classList.remove('show');
  localStorage.removeItem('draft-' + date);
  updateWordCount();
  selectedMood = null;
  Array.from(moodSelector?.children || []).forEach(el =>
    el.classList.remove('active')
  );
  renderEntries();
  renderMoodChart();
  populateTags();
  const saved = entriesEl.querySelector(`.entry[data-date="${date}"]`);
  if (saved) saved.classList.add('expanded');
}

function renderEntries() {
  entriesEl.innerHTML = '';
  const term = searchJournal ? searchJournal.value.toLowerCase() : '';
  const tagSel = tagFilter ? tagFilter.value : '';
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
    const tags = data.tags || [];
    if (
      (term &&
        !text.toLowerCase().includes(term) &&
        !formatDate(date).toLowerCase().includes(term) &&
        !tags.some(t => t.toLowerCase().includes(term))) ||
      (tagSel && !tags.includes(tagSel))
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

    if (data.mood) {
      const moodEl = document.createElement('div');
      moodEl.className = 'mood';
      moodEl.textContent = data.mood;
      entry.appendChild(moodEl);
    }

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

    if (tags.length) {
      const tagWrap = document.createElement('div');
      tagWrap.className = 'tags';
      tags.forEach(t => {
        const span = document.createElement('span');
        span.textContent = t;
        tagWrap.appendChild(span);
      });
      entry.appendChild(tagWrap);
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
    entryTags.value = (data.tags || []).join(', ');
    selectedMood = data.mood || null;
    Array.from(moodSelector?.children || []).forEach(el =>
      el.classList.toggle('active', el.dataset.mood === selectedMood)
    );
    updateWordCount();
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

// XP log helper
function logXP(amount, cause) {
  xpLog.push({ time: new Date().toISOString(), amount, cause });
  localStorage.setItem('xpLog', JSON.stringify(xpLog));
}

function renderXPLog() {
  if (!xpLogList) return;
  xpLogList.innerHTML = '';
  xpLog
    .slice()
    .reverse()
    .forEach(e => {
      const div = document.createElement('div');
      div.textContent = `${e.time} - ${e.cause}: +${e.amount} XP`;
      xpLogList.appendChild(div);
    });
}

function renderBadges() {
  if (!badgeGrid) return;
  badgeGrid.innerHTML = '';
  Object.keys(badgeDefs).forEach(id => {
    const div = document.createElement('div');
    div.className = 'badge' + (badges[id] ? ' earned' : '');
    div.textContent = badgeDefs[id];
    badgeGrid.appendChild(div);
  });
}

function awardBadge(id) {
  if (badges[id]) return;
  badges[id] = true;
  localStorage.setItem('badges', JSON.stringify(badges));
  showToast(`Badge earned: ${badgeDefs[id]}`);
  renderBadges();
}

function checkBadges() {
  if (sessionCount === 1) awardBadge('firstPomodoro');
  if (streak >= 3) awardBadge('threeDayStreak');
  if (totalFocus >= 100) awardBadge('hundredMinutes');
  if (getLevel(pokemonXP[partnerPokemonId] || 0) >= 10)
    awardBadge('fullyEvolved');
}

function renderGoal() {
  if (!dailyGoalInput) return;
  const goal = parseInt(dailyGoalInput.value, 10) || 60;
  localStorage.setItem('dailyGoal', goal);
  const today = new Date().toISOString().split('T')[0];
  const progress = getFocusStats()[today] || 0;
  const pct = Math.min((progress / goal) * 100, 100);
  goalBar.style.width = pct + '%';
  goalPercent.textContent = Math.floor(pct) + '%';
  if (progress >= goal && localStorage.getItem('goalBonusDate') !== today) {
    gainXp(partnerPokemonId, 50);
    localStorage.setItem('goalBonusDate', today);
    goalModal.classList.remove('hidden');
  }
}

function renderHeatmap() {
  if (!heatmapEl) return;
  const stats = getFocusStats();
  const today = new Date();
  heatmapEl.innerHTML = '';
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today.getTime() - i * 86400000)
      .toISOString()
      .split('T')[0];
    const val = stats[d] || 0;
    const box = document.createElement('div');
    box.className = 'heat-box';
    box.style.opacity = Math.min(val / 60, 1);
    heatmapEl.appendChild(box);
  }
}

let moodChart;
function renderMoodChart() {
  if (!moodChartEl || typeof Chart === 'undefined') return;
  const keys = Object.keys(localStorage)
    .filter(k => k.startsWith('journal-'))
    .sort()
    .slice(-7);
  const labels = [];
  const data = [];
  keys.forEach(k => {
    const date = k.replace('journal-', '');
    const entry = JSON.parse(localStorage.getItem(k) || '{}');
    if (entry.mood) {
      labels.push(date);
      data.push(moodValue(entry.mood));
    }
  });
  if (moodChart) moodChart.destroy();
  moodChart = new Chart(moodChartEl.getContext('2d'), {
    type: 'line',
    data: { labels, datasets: [{ label: 'Mood', data }] },
    options: {
      scales: {
        y: {
          min: 1,
          max: 5,
          ticks: {
            callback: v => moodFromValue(v)
          }
        }
      }
    }
  });
}

function moodValue(m) {
  return ['😠', '☹️', '😐', '🙂', '😄'].indexOf(m) + 1;
}
function moodFromValue(v) {
  return ['😠', '☹️', '😐', '🙂', '😄'][v - 1];
}

function populateTags() {
  if (!tagFilter) return;
  const tags = new Set();
  Object.keys(localStorage)
    .filter(k => k.startsWith('journal-'))
    .forEach(k => {
      const entry = JSON.parse(localStorage.getItem(k) || '{}');
      (entry.tags || []).forEach(t => tags.add(t));
    });
  const current = tagFilter.value;
  tagFilter.innerHTML = '<option value="">All Tags</option>';
  Array.from(tags).forEach(t => {
    const opt = document.createElement('option');
    opt.value = t;
    opt.textContent = t;
    tagFilter.appendChild(opt);
  });
  tagFilter.value = current;
}

function applyTheme() {
  if (!themeSelect) return;
  const theme = themeSelect.value || localStorage.getItem('theme') || 'fire';
  document.body.className = document.body.className.replace(/theme-\w+/g, '');
  document.body.classList.add('theme-' + theme);
  themeSelect.value = theme;
  localStorage.setItem('theme', theme);
}

function checkReminder() {
  const today = new Date().toISOString().split('T')[0];
  if ((getFocusStats()[today] || 0) === 0) {
    alert('No focus yet today! Keep your streak going!');
  }
  scheduleReminder();
}

function scheduleReminder() {
  const now = new Date();
  const target = new Date();
  target.setHours(20, 0, 0, 0);
  let delay = target - now;
  if (delay < 0) delay += 86400000;
  setTimeout(checkReminder, delay);
}

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
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const emailLoginBtn = document.getElementById('email-login');
const emailRegisterBtn = document.getElementById('email-register');
const googleLoginBtn = document.getElementById('google-login');
const skipLoginBtn = document.getElementById('skip-login');
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
const API_BASE =
  localStorage.getItem('apiBase') ||
  (window.location.hostname === 'localhost' ? '' : 'http://localhost:3000');

function updateUserInfo() {
  const display = username || currentUser?.displayName || '';
  if (display) userNameEl.textContent = display;
  trainerNameEl.textContent = trainer ? ` - ${TRAINERS[trainer]?.name || ''}` : '';
  if (display || trainer) userInfo.classList.remove('hidden');
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

// Increment a Pokémon's XP in Firestore and recompute its level
async function gainXp(id, amount) {
  if (!id) return;
  if (currentUser) {
    const ref = doc(db, 'users', currentUser.uid, 'pokedex', String(id));
    await runTransaction(db, async tx => {
      const snap = await tx.get(ref);
      const data = snap.exists() ? snap.data() : { xp: 0, level: 1, capturedAt: Date.now(), sessionsContributed: 0 };
      const newXp = (data.xp || 0) + amount;
      const newLevel = Math.min(10, Math.floor(newXp / 50) + 1);
      tx.set(ref, { xp: newXp, level: newLevel, capturedAt: data.capturedAt, sessionsContributed: (data.sessionsContributed || 0) + 1 }, { merge: true });
    });
  } else {
    pokemonXP[id] = (pokemonXP[id] || 0) + amount;
    localStorage.setItem('pokemonXP', JSON.stringify(pokemonXP));
  }
  updatePartnerDisplay();
  renderPokedex();
  checkCapture();
  checkBadges();
}

// Persist the chosen partner Pokémon
async function setPartner(id) {
  partnerPokemonId = id;
  if (currentUser) {
    await setDoc(doc(db, 'users', currentUser.uid, 'settings', 'app'), { partnerPokemonId: id }, { merge: true });
  } else {
    localStorage.setItem('partnerPokemonId', partnerPokemonId);
  }
  ensureStarterCaptured();
  updatePartnerDisplay();
}

// Retrieve or create the user's encryption salt
async function getUserSalt() {
  const settingsRef = doc(db, 'users', currentUser.uid, 'settings', 'app');
  const snap = await getDoc(settingsRef);
  let data = snap.data() || {};
  if (!data.salt) {
    const saltBytes = crypto.getRandomValues(new Uint8Array(16));
    data.salt = btoa(String.fromCharCode(...saltBytes));
    await setDoc(settingsRef, { salt: data.salt }, { merge: true });
  }
  return Uint8Array.from(atob(data.salt), c => c.charCodeAt(0));
}

// Derive and cache a session encryption key from a passphrase
async function getSessionKey() {
  if (sessionKey) return sessionKey;
  const passphrase = prompt('Enter journal passphrase');
  if (!passphrase) throw new Error('Passphrase required');
  const salt = await getUserSalt();
  const keyMaterial = await crypto.subtle.importKey('raw', new TextEncoder().encode(passphrase), 'PBKDF2', false, ['deriveKey']);
  sessionKey = await crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
  return sessionKey;
}

// Encrypt and persist a journal entry
async function saveJournalEntry(date, plaintext, mood, tags, mediaRefs = []) {
  if (currentUser) {
    const key = await getSessionKey();
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const cipherBuf = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(plaintext));
    const cipher = btoa(String.fromCharCode(...new Uint8Array(cipherBuf)));
    await setDoc(
      doc(db, 'users', currentUser.uid, 'journal', date),
      { cipher, iv: btoa(String.fromCharCode(...iv)), saltVersion: 1, mood, tags, mediaRefs },
      { merge: true }
    );
    await addDoc(collection(db, 'users', currentUser.uid, 'xpLog'), {
      delta: 5,
      reason: 'journal',
      timestamp: serverTimestamp()
    });
    await gainXp(partnerPokemonId, 5);
  } else {
    const entryObj = { text: plaintext, mood, tags, media: mediaRefs[0] };
    localStorage.setItem('journal-' + date, JSON.stringify(entryObj));
    gainXp(partnerPokemonId, 5);
  }
  afterSave(date);
  awardBadge('firstJournal');
}

// Decrypt a journal entry document when viewing
async function decryptJournalEntry(docSnap) {
  const data = docSnap.data();
  const key = await getSessionKey();
  const iv = Uint8Array.from(atob(data.iv), c => c.charCodeAt(0));
  const cipher = Uint8Array.from(atob(data.cipher), c => c.charCodeAt(0));
  const plainBuf = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, cipher);
  return new TextDecoder().decode(plainBuf);
}

// Calculate consecutive days with recorded focus
async function getStreak() {
  const stats = await getFocusStats(30);
  const dates = Object.keys(stats).sort().reverse();
  let count = 0;
  for (const d of dates) {
    if (stats[d] > 0) count++;
    else break;
  }
  return count;
}

// Move local guest data into Firestore once the user logs in
async function migrateGuestDataToCloud() {
  if (!currentUser) return;
  if (localStorage.getItem('guestSynced')) return;
  const stats = JSON.parse(localStorage.getItem('focusStats') || '{}');
  for (const [date, mins] of Object.entries(stats)) {
    const ref = doc(db, 'users', currentUser.uid, 'stats', date);
    const snap = await getDoc(ref);
    if (!snap.exists()) await setDoc(ref, { minutes: mins, sessions: 0, xpGained: 0 });
  }
  const keys = Object.keys(localStorage).filter(k => k.startsWith('journal-'));
  for (const key of keys) {
    const date = key.replace('journal-', '');
    const data = JSON.parse(localStorage.getItem(key));
    if (data?.text) await saveJournalEntry(date, data.text, data.mood, data.tags || [], data.media ? [data.media] : []);
  }
  const pokes = JSON.parse(localStorage.getItem('pokemonXP') || '{}');
  for (const [id, xp] of Object.entries(pokes)) {
    await setDoc(doc(db, 'users', currentUser.uid, 'pokedex', id), { xp, level: getLevel(xp), capturedAt: Date.now() }, { merge: true });
  }
  localStorage.setItem('guestSynced', '1');
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
  const src = pokemonSources[id] || { pomodoros: 0, journals: 0, goal: 0 };
  modalXp.textContent = `XP: ${xp} (Pomodoros: ${src.pomodoros}, Journals: ${src.journals}, Goals: ${src.goal})`;
  const next = levelThreshold(level + 1);
  const cur = levelThreshold(level);
  const progress = Math.min((xp - cur) / (next - cur), 1);
  modalXpBar.style.width = progress * 100 + '%';
  setPartnerBtn.dataset.id = id;
  pokemonModal.classList.remove('hidden');
}

async function updatePartnerDisplay() {
  if (!partnerPokemonId) {
    partnerDisplay.classList.add('hidden');
    return;
  }
  const data = pokemonData.find(p => p.id === parseInt(partnerPokemonId, 10));
  if (!data) return;
  let xp = pokemonXP[partnerPokemonId] || 0;
  if (currentUser) {
    const snap = await getDoc(doc(db, 'users', currentUser.uid, 'pokedex', String(partnerPokemonId)));
    if (snap.exists()) xp = snap.data().xp || 0;
  }
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
  if (!currentUser && !username) {
    loginModal?.classList.remove('hidden');
  } else if (!trainer) {
    trainerModal?.classList.remove('hidden');
  } else if (!partnerPokemonId) {
    starterModal?.classList.remove('hidden');
  }
}

googleLoginBtn?.addEventListener('click', async () => {
  try {
    await signInWithPopup(auth, new GoogleAuthProvider());
  } catch {
    showToast('Google login failed');
  }
});

emailRegisterBtn?.addEventListener('click', async () => {
  const email = emailInput.value.trim();
  const pass = passwordInput.value;
  if (!email || !pass) return;
  try {
    await createUserWithEmailAndPassword(auth, email, pass);
  } catch {
    showToast('Registration failed');
  }
});

emailLoginBtn?.addEventListener('click', async () => {
  const email = emailInput.value.trim();
  const pass = passwordInput.value;
  if (!email || !pass) return;
  try {
    await signInWithEmailAndPassword(auth, email, pass);
  } catch {
    showToast('Login failed');
  }
});

// React to auth state changes and load Firestore-backed data
onAuthStateChanged(auth, async user => {
  currentUser = user;
  if (user) {
    username = user.displayName || user.email || '';
    loginModal?.classList.add('hidden');
    await migrateGuestDataToCloud();
    const settingsRef = doc(db, 'users', user.uid, 'settings', 'app');
    const snap = await getDoc(settingsRef);
    const data = snap.data() || {};
    partnerPokemonId = data.partnerPokemonId || partnerPokemonId;
    if (data.displayName) username = data.displayName;
    if (data.theme) applyTheme(data.theme);
    updateUserInfo();
    updatePartnerDisplay();
    const stats = await getFocusStats(7);
    renderFocusChart(stats);
    renderStatsSummary(stats);
    streak = await getStreak();
    renderStats();
  } else {
    currentUser = null;
    loginModal?.classList.remove('hidden');
  }
  initModals();
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
  setPartner(String(id));
  starterModal.classList.add('hidden');
});

openPokedexBtn?.addEventListener('click', () => {
  pokedexModal.classList.remove('hidden');
  renderPokedex();
});

trainerCardBtn?.addEventListener('click', () => {
  trainerCardModal.classList.remove('hidden');
  renderBadges();
});

trainerCardModal?.addEventListener('click', e => {
  if (e.target === trainerCardModal) trainerCardModal.classList.add('hidden');
});

xpLogBtn?.addEventListener('click', () => {
  renderXPLog();
  xpLogModal.classList.remove('hidden');
});

xpLogModal?.addEventListener('click', e => {
  if (e.target === xpLogModal) xpLogModal.classList.add('hidden');
});

goalClose?.addEventListener('click', () => goalModal.classList.add('hidden'));

dailyGoalInput?.addEventListener('change', renderGoal);
tagFilter?.addEventListener('change', renderEntries);
moodSelector?.addEventListener('click', e => {
  const span = e.target.closest('[data-mood]');
  if (!span) return;
  selectedMood = span.dataset.mood;
  Array.from(moodSelector.children).forEach(el =>
    el.classList.toggle('active', el === span)
  );
});

exportDataBtn?.addEventListener('click', () => {
  const zip = new JSZip();
  const stats = getFocusStats();
  const csv = 'date,minutes\n' +
    Object.entries(stats).map(([d, m]) => `${d},${m}`).join('\n');
  zip.file('focus.csv', csv);
  const entries = {};
  Object.keys(localStorage)
    .filter(k => k.startsWith('journal-'))
    .forEach(k => (entries[k.replace('journal-', '')] = JSON.parse(localStorage.getItem(k))));
  zip.file('journal.json', JSON.stringify(entries, null, 2));
  zip.generateAsync({ type: 'blob' }).then(blob => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'pokejournal.zip';
    a.click();
    URL.revokeObjectURL(url);
  });
});

themeSelect?.addEventListener('change', applyTheme);

pokedexModal?.addEventListener('click', e => {
  if (e.target === pokedexModal) pokedexModal.classList.add('hidden');
});

pokemonModal?.addEventListener('click', e => {
  if (e.target === pokemonModal) pokemonModal.classList.add('hidden');
});

setPartnerBtn?.addEventListener('click', () => {
  const id = setPartnerBtn.dataset.id;
  setPartner(id);
  pokemonModal.classList.add('hidden');
});

skipLoginBtn?.addEventListener('click', () => {
  username = 'Guest';
  localStorage.setItem('username', username);
  loginModal.classList.add('hidden');
  updateUserInfo();
  initModals();
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
