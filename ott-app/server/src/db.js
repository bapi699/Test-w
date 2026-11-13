import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import { config } from './config.js';

fs.mkdirSync(path.dirname(config.dbPath), { recursive: true });

const db = new Database(config.dbPath);
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS ott_cache (
    tmdb_id        INTEGER PRIMARY KEY,
    title          TEXT,
    platform       TEXT,
    ott_date       TEXT,          -- YYYY-MM-DD ya NULL
    status         TEXT NOT NULL, -- confirmed | expected | unknown
    source_url     TEXT,
    story_hinglish TEXT,
    checked_at     INTEGER NOT NULL -- epoch ms
  )
`);

const getStmt = db.prepare('SELECT * FROM ott_cache WHERE tmdb_id = ?');
const upsertStmt = db.prepare(`
  INSERT INTO ott_cache (tmdb_id, title, platform, ott_date, status, source_url, story_hinglish, checked_at)
  VALUES (@tmdb_id, @title, @platform, @ott_date, @status, @source_url, @story_hinglish, @checked_at)
  ON CONFLICT(tmdb_id) DO UPDATE SET
    title = excluded.title,
    platform = excluded.platform,
    ott_date = excluded.ott_date,
    status = excluded.status,
    source_url = excluded.source_url,
    story_hinglish = COALESCE(excluded.story_hinglish, ott_cache.story_hinglish),
    checked_at = excluded.checked_at
`);

export function getOtt(tmdbId) {
  return getStmt.get(tmdbId) || null;
}

export function saveOtt(row) {
  upsertStmt.run({ story_hinglish: null, ...row, checked_at: Date.now() });
}

/**
 * Cache rule:
 *  - "confirmed" => kabhi dobara search nahi
 *  - "expected" / "unknown" => 24 ghante baad dobara check
 */
export function needsRefresh(row) {
  if (!row) return true;
  if (row.status === 'confirmed') return false;
  return Date.now() - row.checked_at > config.recheckHours * 60 * 60 * 1000;
}
