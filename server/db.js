import Database from 'better-sqlite3';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = process.env.DB_PATH || path.join(__dirname, 'drinking.db');

export const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS drinks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    photo_path TEXT,
    memo TEXT,
    ratings TEXT NOT NULL,
    overall_score REAL NOT NULL,
    is_favorite INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
  )
`);

// 기존 DB에는 description 컬럼이 없으므로 있을 때만 건너뛴다.
const columns = db.prepare('PRAGMA table_info(drinks)').all().map((c) => c.name);
if (!columns.includes('description')) {
  db.exec('ALTER TABLE drinks ADD COLUMN description TEXT');
}

export function formatRow(row) {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    photoUrl: row.photo_path || null,
    memo: row.memo || '',
    description: row.description || '',
    ratings: JSON.parse(row.ratings),
    overallScore: row.overall_score,
    isFavorite: !!row.is_favorite,
    createdAt: row.created_at,
  };
}
