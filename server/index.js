import express from 'express';
import cors from 'cors';
import multer from 'multer';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { db, formatRow } from './db.js';
import { CATEGORIES, isValidCategory, computeOverallScore, validateRatings } from './categories.js';
import { analyzePhoto, analyzeConfigured } from './analyze.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadsDir = path.join(__dirname, 'uploads');
fs.mkdirSync(uploadsDir, { recursive: true });

const app = express();
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(uploadsDir));

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '';
    const name = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, name);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('이미지 파일만 업로드할 수 있습니다.'));
    }
    cb(null, true);
  },
});

function deletePhotoFile(photoPath) {
  if (!photoPath) return;
  const filePath = path.join(uploadsDir, path.basename(photoPath));
  fs.unlink(filePath, () => {});
}

// 분석용 업로드는 디스크에 남길 이유가 없다 — 분석에만 쓰고 버린다.
const analyzeUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('이미지 파일만 업로드할 수 있습니다.'));
    }
    cb(null, true);
  },
});

app.get('/api/categories', (req, res) => {
  res.json(CATEGORIES);
});

app.get('/api/analyze/status', (req, res) => {
  res.json({ available: analyzeConfigured() });
});

app.post('/api/analyze', analyzeUpload.single('photo'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: '사진을 첨부해주세요.' });

  const { result, usage, error, status } = await analyzePhoto({
    buffer: req.file.buffer,
    mimeType: req.file.mimetype,
    hint: typeof req.body.hint === 'string' ? req.body.hint.trim().slice(0, 100) : '',
  });

  if (error) return res.status(status).json({ error });
  res.json({ ...result, usage });
});

app.get('/api/drinks', (req, res) => {
  const { category, favorite } = req.query;
  const clauses = [];
  const params = [];

  if (category && category !== 'all') {
    if (!isValidCategory(category)) return res.status(400).json({ error: '잘못된 카테고리입니다.' });
    clauses.push('category = ?');
    params.push(category);
  }
  if (favorite === 'true') {
    clauses.push('is_favorite = 1');
  }

  let query = 'SELECT * FROM drinks';
  if (clauses.length) query += ' WHERE ' + clauses.join(' AND ');
  query += ' ORDER BY created_at DESC';

  const rows = db.prepare(query).all(...params);
  res.json(rows.map(formatRow));
});

app.get('/api/drinks/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM drinks WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: '기록을 찾을 수 없습니다.' });
  res.json(formatRow(row));
});

app.post('/api/drinks', upload.single('photo'), (req, res) => {
  const { name, category, memo, description } = req.body;

  if (!name || !name.trim()) return res.status(400).json({ error: '술 이름을 입력해주세요.' });
  if (!isValidCategory(category)) return res.status(400).json({ error: '잘못된 카테고리입니다.' });

  let ratings;
  try {
    ratings = JSON.parse(req.body.ratings || '{}');
  } catch {
    return res.status(400).json({ error: '평점 형식이 올바르지 않습니다.' });
  }

  const ratingError = validateRatings(category, ratings);
  if (ratingError) return res.status(400).json({ error: ratingError });

  const overallScore = computeOverallScore(category, ratings);
  const photoPath = req.file ? `/uploads/${req.file.filename}` : null;
  const createdAt = new Date().toISOString();

  const info = db
    .prepare(
      `INSERT INTO drinks (name, category, photo_path, memo, description, ratings, overall_score, is_favorite, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?)`
    )
    .run(name.trim(), category, photoPath, memo || '', description || '', JSON.stringify(ratings), overallScore, createdAt);

  const row = db.prepare('SELECT * FROM drinks WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json(formatRow(row));
});

app.patch('/api/drinks/:id', upload.single('photo'), (req, res) => {
  const existing = db.prepare('SELECT * FROM drinks WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: '기록을 찾을 수 없습니다.' });

  const category = req.body.category || existing.category;
  if (!isValidCategory(category)) return res.status(400).json({ error: '잘못된 카테고리입니다.' });

  let ratings = JSON.parse(existing.ratings);
  if (req.body.ratings) {
    try {
      ratings = JSON.parse(req.body.ratings);
    } catch {
      return res.status(400).json({ error: '평점 형식이 올바르지 않습니다.' });
    }
  }

  const ratingError = validateRatings(category, ratings);
  if (ratingError) return res.status(400).json({ error: ratingError });

  const overallScore = computeOverallScore(category, ratings);
  const name = req.body.name !== undefined ? req.body.name.trim() : existing.name;
  const memo = req.body.memo !== undefined ? req.body.memo : existing.memo;
  const description = req.body.description !== undefined ? req.body.description : existing.description;

  let photoPath = existing.photo_path;
  if (req.file) {
    deletePhotoFile(existing.photo_path);
    photoPath = `/uploads/${req.file.filename}`;
  }

  db.prepare(
    `UPDATE drinks SET name = ?, category = ?, photo_path = ?, memo = ?, description = ?, ratings = ?, overall_score = ? WHERE id = ?`
  ).run(name, category, photoPath, memo, description, JSON.stringify(ratings), overallScore, req.params.id);

  const row = db.prepare('SELECT * FROM drinks WHERE id = ?').get(req.params.id);
  res.json(formatRow(row));
});

app.patch('/api/drinks/:id/favorite', (req, res) => {
  const existing = db.prepare('SELECT * FROM drinks WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: '기록을 찾을 수 없습니다.' });

  const next = existing.is_favorite ? 0 : 1;
  db.prepare('UPDATE drinks SET is_favorite = ? WHERE id = ?').run(next, req.params.id);
  res.json(formatRow({ ...existing, is_favorite: next }));
});

app.delete('/api/drinks/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM drinks WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: '기록을 찾을 수 없습니다.' });

  deletePhotoFile(existing.photo_path);
  db.prepare('DELETE FROM drinks WHERE id = ?').run(req.params.id);
  res.status(204).end();
});

// multer errors (e.g. file too large / wrong type) land here
app.use((err, req, res, next) => {
  if (err) return res.status(400).json({ error: err.message || '요청 처리 중 오류가 발생했습니다.' });
  next();
});

const clientDist = path.join(__dirname, '../client/dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) return next();
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Drinking server listening on http://localhost:${PORT}`);
});
