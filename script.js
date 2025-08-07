function sha256(message) {
  const msgBuffer = new TextEncoder().encode(message);
  return crypto.subtle.digest('SHA-256', msgBuffer).then(hashBuffer => {
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  });
}

function loadEntries() {
  const data = localStorage.getItem('entries');
  return data ? JSON.parse(data) : {};
}

function saveEntries(entries) {
  localStorage.setItem('entries', JSON.stringify(entries));
}

function renderTimeline() {
  const timeline = document.getElementById('timeline');
  timeline.innerHTML = '';
  const entries = loadEntries();
  const dates = Object.keys(entries).sort().reverse();
  dates.forEach(date => {
    const entry = entries[date];
    const div = document.createElement('div');
    div.className = 'entry';
    div.id = `entry-${date}`;
    div.innerHTML = `<h3>${date} ${entry.mood || ''}</h3><p>${entry.text || ''}</p>`;
    if (entry.photo) {
      const img = document.createElement('img');
      img.src = entry.photo;
      div.appendChild(img);
    }
    if (entry.video) {
      const video = document.createElement('video');
      video.src = entry.video;
      video.controls = true;
      div.appendChild(video);
    }
    timeline.appendChild(div);
  });
}

function showModal(id) {
  document.getElementById(id).style.display = 'flex';
}

function hideModal(id) {
  document.getElementById(id).style.display = 'none';
}

document.addEventListener('DOMContentLoaded', () => {
  const passwordHash = localStorage.getItem('passwordHash');
  const authTitle = document.getElementById('auth-title');
  const authBtn = document.getElementById('auth-btn');
  const authModal = document.getElementById('auth');

  if (!passwordHash) {
    showModal('auth');
    authBtn.onclick = async () => {
      const pwd = document.getElementById('password').value;
      if (!pwd) return;
      const hash = await sha256(pwd);
      localStorage.setItem('passwordHash', hash);
      hideModal('auth');
      renderTimeline();
    };
  } else {
    authTitle.textContent = 'Enter Password';
    authBtn.textContent = 'Login';
    showModal('auth');
    authBtn.onclick = async () => {
      const pwd = document.getElementById('password').value;
      const hash = await sha256(pwd);
      if (hash === passwordHash) {
        hideModal('auth');
        renderTimeline();
      } else {
        alert('Incorrect password');
      }
    };
  }

  document.getElementById('new-entry').onclick = () => {
    document.getElementById('entry-text').value = '';
    document.getElementById('entry-photo').value = '';
    document.getElementById('entry-video').value = '';
    document.getElementById('entry-mood').value = '';
    showModal('entry-modal');
  };

  document.getElementById('cancel-entry').onclick = () => hideModal('entry-modal');

  document.getElementById('save-entry').onclick = () => {
    const text = document.getElementById('entry-text').value;
    const mood = document.getElementById('entry-mood').value;
    const photoFile = document.getElementById('entry-photo').files[0];
    const videoFile = document.getElementById('entry-video').files[0];
    const date = new Date().toISOString().slice(0,10);
    const entries = loadEntries();

    function save(photo, video) {
      entries[date] = { text, mood, photo, video };
      saveEntries(entries);
      hideModal('entry-modal');
      renderTimeline();
    }

    const readerPhoto = new FileReader();
    const readerVideo = new FileReader();

    readerPhoto.onload = e => {
      const photoData = photoFile ? e.target.result : null;
      readerVideo.onload = ev => {
        const videoData = videoFile ? ev.target.result : null;
        save(photoData, videoData);
      };
      if (videoFile) readerVideo.readAsDataURL(videoFile); else readerVideo.onload({target:{result:null}});
    };
    if (photoFile) readerPhoto.readAsDataURL(photoFile); else readerPhoto.onload({target:{result:null}});
  };

  document.getElementById('export').onclick = () => {
    const data = JSON.stringify(loadEntries());
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'dailyvlog.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  document.getElementById('calendar').onchange = e => {
    const id = `entry-${e.target.value}`;
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({behavior:'smooth'});
  };

  document.getElementById('theme-toggle').onclick = () => {
    document.body.classList.toggle('dark');
  };
});
