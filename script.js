// Timer logic
const duration = 25 * 60; // 25 minutes
let remaining = duration;
let timerId = null;

const timeEl = document.getElementById('time');
const startBtn = document.getElementById('start');
const pauseBtn = document.getElementById('pause');
const resetBtn = document.getElementById('reset');

function updateDisplay() {
  const mins = String(Math.floor(remaining / 60)).padStart(2, '0');
  const secs = String(remaining % 60).padStart(2, '0');
  timeEl.textContent = `${mins}:${secs}`;
}

function tick() {
  if (remaining > 0) {
    remaining--;
    updateDisplay();
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

saveEntry.addEventListener('click', () => {
  const date = entryDate.value;
  const text = entryText.value.trim();
  const file = entryMedia.files[0];
  if (!date || (!text && !file)) return;

  const existing = localStorage.getItem('journal-' + date);
  let existingMedia;
  let existingType;
  if (existing) {
    try {
      const parsed = JSON.parse(existing);
      existingMedia = parsed.media;
      existingType = parsed.mediaType;
    } catch (e) {}
  }

  if (file) {
    const reader = new FileReader();
    reader.onload = () => {
      const entryObj = { text, media: reader.result, mediaType: file.type };
      localStorage.setItem('journal-' + date, JSON.stringify(entryObj));
      afterSave();
    };
    reader.readAsDataURL(file);
  } else {
    const entryObj = { text, media: existingMedia, mediaType: existingType };
    localStorage.setItem('journal-' + date, JSON.stringify(entryObj));
    afterSave();
  }
});

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
