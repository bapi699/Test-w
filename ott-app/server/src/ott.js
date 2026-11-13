import { config } from './config.js';
import { getOtt, saveOtt, needsRefresh } from './db.js';
import { fetchOttInfo } from './gemini.js';

/**
 * Background queue: Gemini calls dheere-dheere (limited concurrency) chalti hain,
 * taaki list turant TMDB data ke saath dikh jaye aur OTT info baad mein bhar jaye.
 */
const queue = [];            // movies waiting
const inFlight = new Map();  // tmdb_id -> Promise
const waiting = new Map();   // tmdb_id -> { promise, resolve }
const failedAt = new Map();  // tmdb_id -> epoch ms (error ke baad thoda ruk kar retry)
const FAIL_BACKOFF = 10 * 60 * 1000;
let active = 0;
let lastError = null;

export function geminiStatus() {
  return { lastError, queued: queue.length, active };
}

function isQueued(id) {
  return inFlight.has(id) || queue.some((m) => m.id === id);
}

export function isChecking(id) {
  return isQueued(id);
}

function pump() {
  while (active < config.geminiConcurrency && queue.length) {
    const movie = queue.shift();
    active++;
    const p = (async () => {
      try {
        const info = await fetchOttInfo(movie);
        saveOtt({
          tmdb_id: movie.id,
          title: movie.title,
          platform: info.platform,
          ott_date: info.ott_date,
          status: info.status,
          source_url: info.source_url,
          story_hinglish: info.story_hinglish,
        });
        failedAt.delete(movie.id);
        lastError = null;
        console.log(`[gemini] ${movie.title}: ${info.status} | ${info.platform || '-'} | ${info.ott_date || '-'} (queries: ${info._debug.queries.length}, sources: ${info._debug.sources})`);
      } catch (err) {
        // Gemini fail => app chalta rahe, bas yeh movie baad mein retry hogi
        failedAt.set(movie.id, Date.now());
        lastError = String(err?.message || err).slice(0, 300);
        console.warn(`[gemini] FAIL ${movie.title}: ${lastError}`);
      } finally {
        active--;
        inFlight.delete(movie.id);
        const w = waiting.get(movie.id);
        if (w) { waiting.delete(movie.id); w.resolve(); }
        pump();
      }
    })();
    inFlight.set(movie.id, p);
  }
}

/** Movie ko queue mein daalo agar cache ke hisaab se zaroori ho */
export function ensureOtt(movie, { priority = false } = {}) {
  if (!config.geminiApiKey) return;
  const row = getOtt(movie.id);
  if (!needsRefresh(row)) return;
  const lastFail = failedAt.get(movie.id);
  if (lastFail && Date.now() - lastFail < FAIL_BACKOFF) return;
  if (isQueued(movie.id)) {
    if (priority) {
      const i = queue.findIndex((m) => m.id === movie.id);
      if (i > 0) queue.unshift(...queue.splice(i, 1));
    }
    return;
  }
  priority ? queue.unshift(movie) : queue.push(movie);
  pump();
}

/** Detail page ke liye: thodi der tak result ka intezaar karo */
export async function waitForOtt(id, ms) {
  if (!isQueued(id)) return;
  let entry = waiting.get(id);
  if (!entry) {
    let resolve;
    const promise = new Promise((r) => (resolve = r));
    entry = { promise, resolve };
    waiting.set(id, entry);
  }
  await Promise.race([entry.promise, new Promise((r) => setTimeout(r, ms))]);
}

/** TMDB movie + cached OTT info ko jod kar API response banao */
export function withOtt(movie) {
  const row = getOtt(movie.id);
  return {
    ...movie,
    ott: row
      ? {
          platform: row.platform,
          ott_date: row.ott_date,
          status: row.status,
          source_url: row.source_url,
          checked_at: row.checked_at,
        }
      : null,
    story_hinglish: row?.story_hinglish || null,
    ott_checking: isChecking(movie.id),
  };
}
