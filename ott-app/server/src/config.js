import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const here = path.dirname(fileURLToPath(import.meta.url));
export const APP_ROOT = path.resolve(here, '..', '..');

// .env sirf ott-app/.env se padha jata hai (ya pehle se set env vars se)
dotenv.config({ path: path.join(APP_ROOT, '.env'), quiet: true });

export const config = {
  port: Number(process.env.PORT) || 5174,
  tmdbApiKey: process.env.TMDB_API_KEY || '',
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  // Gemini API ka current Flash model (official @google/genai SDK docs ke hisaab se).
  // Naya model aaye to .env mein GEMINI_MODEL badal do, code chhune ki zarurat nahi.
  geminiModel: process.env.GEMINI_MODEL || 'gemini-3.8-flash',
  dbPath: process.env.DB_PATH || path.join(APP_ROOT, 'server', 'data', 'ott-cache.sqlite'),
  // Kitni movies ka OTT data Gemini se ek saath (parallel) laya jaye
  geminiConcurrency: Number(process.env.GEMINI_CONCURRENCY) || 2,
  recheckHours: 24,
};

export function missingKeys() {
  const missing = [];
  if (!config.tmdbApiKey) missing.push('TMDB_API_KEY');
  if (!config.geminiApiKey) missing.push('GEMINI_API_KEY');
  return missing;
}
