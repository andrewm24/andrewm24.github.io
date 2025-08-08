const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// Serve static frontend files from ../docs so the site loads when the
// Express server is run directly (e.g. during local development).
const docsPath = path.join(__dirname, '..', 'docs');
app.use(express.static(docsPath));

// Database setup
const db = new sqlite3.Database(path.join(__dirname, 'database.sqlite3'));
db.run('CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT UNIQUE, password TEXT)');

const SECRET = process.env.JWT_SECRET || 'supersecret';

// User registration
app.post('/api/register', (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) return res.status(400).json({ error: 'Missing fields' });
  const hash = bcrypt.hashSync(password, 10);
  const stmt = db.prepare('INSERT INTO users (username, password) VALUES (?, ?)');
  stmt.run(username, hash, err => {
    if (err) return res.status(409).json({ error: 'User exists' });
    res.json({ status: 'ok' });
  });
});

// User login
app.post('/api/login', (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) return res.status(400).json({ error: 'Missing fields' });
  db.get('SELECT * FROM users WHERE username = ?', username, (err, row) => {
    if (err || !row) return res.status(401).json({ error: 'Invalid credentials' });
    const match = bcrypt.compareSync(password, row.password);
    if (!match) return res.status(401).json({ error: 'Invalid credentials' });
    const token = jwt.sign({ id: row.id, username: row.username }, SECRET, { expiresIn: '7d' });
    res.json({ token });
  });
});

// Auth middleware
function auth(req, res, next) {
  const header = req.headers['authorization'] || '';
  const token = header.replace('Bearer ', '');
  try {
    const payload = jwt.verify(token, SECRET);
    req.user = payload;
    next();
  } catch (e) {
    res.status(401).json({ error: 'Unauthorized' });
  }
}

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, 'uploads');
fs.mkdirSync(uploadDir, { recursive: true });

// File upload setup using multer streaming to disk
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  }
});
// Allow larger video uploads (up to 500 MB) so daily vlogs can be saved
const upload = multer({ storage, limits: { fileSize: 500 * 1024 * 1024 } });

// Return a clear error when the file exceeds the limit
app.use((err, req, res, next) => {
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ error: 'File too large' });
  }
  next(err);
});

// Media upload endpoint
app.post('/api/upload', auth, upload.single('media'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file' });
  const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
  res.json({ url: fileUrl });
});

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Fallback to index.html for the root path so visiting http://localhost:3000
// serves the PokéJournal app instead of a blank page.
app.get('/', (req, res) => {
  res.sendFile(path.join(docsPath, 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on ${PORT}`));
