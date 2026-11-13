import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
import { config, missingKeys, APP_ROOT } from './config.js';
import { listIndiaMovies, searchMovies, movieDetails } from './tmdb.js';
import { ensureOtt, withOtt, waitForOtt, geminiStatus } from './ott.js';

const app = express();
app.disable('x-powered-by');

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, missing_keys: missingKeys(), model: config.geminiModel, gemini: geminiStatus() });
});

// List: TMDB data turant, OTT info cache se; jo cache mein nahi wo background mein aayega
app.get('/api/movies', async (req, res) => {
  try {
    const q = String(req.query.q || '').trim().slice(0, 100);
    const movies = q ? await searchMovies(q) : await listIndiaMovies();
    for (const m of movies) ensureOtt(m);
    const out = movies.map(withOtt);
    res.json({
      movies: out,
      pending: out.filter((m) => m.ott_checking).length,
      gemini_error: geminiStatus().lastError ? true : false,
      gemini_enabled: Boolean(config.geminiApiKey),
    });
  } catch (err) {
    console.error('[api/movies]', err.message);
    res.status(502).json({ error: 'tmdb_failed' });
  }
});

app.get('/api/movies/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'bad_id' });
  try {
    const movie = await movieDetails(id);
    ensureOtt(movie, { priority: true });
    await waitForOtt(id, 45_000);
    res.json({ movie: withOtt(movie) });
  } catch (err) {
    console.error('[api/movies/:id]', err.message);
    res.status(err.message.includes('404') ? 404 : 502).json({ error: 'tmdb_failed' });
  }
});

app.use('/api', (_req, res) => res.status(404).json({ error: 'not_found' }));

// Production: React ka build (client/dist) yahin se serve hota hai
const dist = path.join(APP_ROOT, 'client', 'dist');
if (fs.existsSync(dist)) {
  app.use(express.static(dist));
  app.get(/^\/(?!api\/).*/, (_req, res) => res.sendFile(path.join(dist, 'index.html')));
}

app.listen(config.port, () => {
  console.log(`OTT app server: http://localhost:${config.port}`);
  const missing = missingKeys();
  if (missing.length) console.warn(`Dhyan do: .env mein ${missing.join(', ')} nahi mili`);
  console.log(`Gemini model: ${config.geminiModel}`);
});
