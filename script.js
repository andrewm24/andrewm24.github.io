// Timer logic
const duration = 25 * 60; // 25 minutes
let remaining = duration;
let timerId = null;

const timeEl = document.getElementById('zhong-time');
const startBtn = document.getElementById('zhong-start');
const pauseBtn = document.getElementById('zhong-pause');
const resetBtn = document.getElementById('zhong-reset');

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
const entryDate = document.getElementById('zhong-entry-date');
const entryText = document.getElementById('zhong-entry-text');
const saveEntry = document.getElementById('zhong-save-entry');
const entriesEl = document.getElementById('zhong-entries');

function today() {
  return new Date().toISOString().split('T')[0];
}

entryDate.value = today();

saveEntry.addEventListener('click', () => {
  const date = entryDate.value;
  const text = entryText.value.trim();
  if (!date || !text) return;
  localStorage.setItem('journal-' + date, text);
  entryText.value = '';
  renderEntries();
});

function renderEntries() {
  entriesEl.innerHTML = '';
  const keys = Object.keys(localStorage)
    .filter(k => k.startsWith('journal-'))
    .sort()
    .reverse();
  keys.forEach(key => {
    const date = key.replace('journal-', '');
    const text = localStorage.getItem(key) || '';
    const entry = document.createElement('div');
    entry.className = 'entry';
    entry.dataset.date = date;

    const title = document.createElement('h3');
    title.textContent = formatDate(date);
    entry.appendChild(title);

    const preview = document.createElement('p');
    preview.className = 'preview';
    preview.textContent = text.slice(0, 100) + (text.length > 100 ? '…' : '');
    entry.appendChild(preview);

    const full = document.createElement('p');
    full.className = 'full';
    full.textContent = text;
    entry.appendChild(full);

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
    entryText.value = localStorage.getItem('journal-' + entry.dataset.date) || '';
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
