// Timer logic
const duration = 25 * 60; // 25 minutes
let remaining = duration;
let timerId = null;

const timeEl = document.getElementById('time');
const progressBar = document.querySelector('#progress .bar');
const circumference = 2 * Math.PI * 45;
progressBar.style.strokeDasharray = circumference;

const startBtn = document.getElementById('start');
const pauseBtn = document.getElementById('pause');
const resetBtn = document.getElementById('reset');

function updateDisplay() {
  const mins = String(Math.floor(remaining / 60)).padStart(2, '0');
  const secs = String(remaining % 60).padStart(2, '0');
  timeEl.textContent = `${mins}:${secs}`;
  const progress = remaining / duration;
  progressBar.style.strokeDashoffset = circumference * (1 - progress);
}

function tick() {
  if (remaining > 0) {
    remaining--;
    updateDisplay();
    timeEl.classList.add('tick');
    setTimeout(() => timeEl.classList.remove('tick'), 500);
    if (remaining === 0) {
      timeEl.classList.add('complete');
    }
  } else {
    clearInterval(timerId);
    timerId = null;
  }
}

startBtn.addEventListener('click', () => {
  if (timerId) return;
  timerId = setInterval(tick, 1000);
});

pauseBtn.addEventListener('click', () => {
  clearInterval(timerId);
  timerId = null;
});

resetBtn.addEventListener('click', () => {
  clearInterval(timerId);
  timerId = null;
  remaining = duration;
  updateDisplay();
  timeEl.classList.remove('complete');
});

updateDisplay();

// Journal logic
const entryDate = document.getElementById('entry-date');
const entryText = document.getElementById('entry-text');
const entryMedia = document.getElementById('entry-media');
const saveEntry = document.getElementById('save-entry');
const entriesEl = document.getElementById('entries');

function today() {
  return new Date().toISOString().split('T')[0];
}

entryDate.value = today();

saveEntry.addEventListener('click', async () => {
  const date = entryDate.value;
  const text = entryText.value.trim();
  const file = entryMedia.files[0];
  if (!date || (!text && !file)) return;

  let media, mediaType;
  if (file) {
    media = await readFileAsDataURL(file);
    mediaType = file.type;
  } else {
    const existing = JSON.parse(localStorage.getItem('journal-' + date) || '{}');
    media = existing.media;
    mediaType = existing.mediaType;
  }

  const entryObj = { text, media, mediaType };
  localStorage.setItem('journal-' + date, JSON.stringify(entryObj));
  afterSave();
});

function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function afterSave() {
  entryText.value = '';
  entryMedia.value = '';
  renderEntries();
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
      } else {
        mediaEl = document.createElement('img');
      }
      mediaEl.src = media;
      mediaWrap.appendChild(mediaEl);
      entry.appendChild(mediaWrap);
    }

    const edit = document.createElement('button');
    edit.textContent = 'Edit';
    edit.className = 'edit';
    entry.appendChild(edit);

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
  } else {
    entry.classList.toggle('expanded');
  }
});

function formatDate(str) {
  const d = new Date(str + 'T00:00:00');
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
}

renderEntries();
