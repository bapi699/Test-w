import { config } from './config.js';

const BASE = 'https://api.themoviedb.org/3';
const IMG = 'https://image.tmdb.org/t/p';

export const LANGUAGES = {
  hi: 'Hindi', ta: 'Tamil', te: 'Telugu', ml: 'Malayalam', kn: 'Kannada',
  bn: 'Bengali', mr: 'Marathi', pa: 'Punjabi', gu: 'Gujarati', or: 'Odia',
  as: 'Assamese', ur: 'Urdu', en: 'English', ko: 'Korean', ja: 'Japanese',
  zh: 'Chinese', cn: 'Cantonese', es: 'Spanish', fr: 'French', de: 'German',
  it: 'Italian', th: 'Thai', id: 'Indonesian', ru: 'Russian', tr: 'Turkish',
};
export const langName = (code) => LANGUAGES[code] || (code ? code.toUpperCase() : 'Unknown');

// Chhota in-memory cache taaki TMDB baar-baar hit na ho
const memo = new Map();
const MEMO_TTL = 15 * 60 * 1000;

async function tmdb(pathname, params = {}) {
  if (!config.tmdbApiKey) throw new Error('TMDB_API_KEY set nahi hai');
  const url = new URL(BASE + pathname);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, String(v));

  const headers = { accept: 'application/json' };
  // TMDB do tarah ki key deta hai: v3 "API Key" (query param) aur v4 "Read Access Token" (Bearer).
  // Dono chalengi.
  if (config.tmdbApiKey.startsWith('eyJ')) headers.authorization = `Bearer ${config.tmdbApiKey}`;
  else url.searchParams.set('api_key', config.tmdbApiKey);

  const key = url.toString();
  const hit = memo.get(key);
  if (hit && Date.now() - hit.at < MEMO_TTL) return hit.data;

  const res = await fetch(url, { headers, signal: AbortSignal.timeout(15000) });
  if (!res.ok) throw new Error(`TMDB ${res.status} on ${pathname}`);
  const data = await res.json();
  memo.set(key, { at: Date.now(), data });
  return data;
}

const isoDay = (d) => d.toISOString().slice(0, 10);
const addDays = (n) => {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + n);
  return isoDay(d);
};

function slim(m) {
  return {
    id: m.id,
    title: m.title,
    original_title: m.original_title,
    poster: m.poster_path ? `${IMG}/w500${m.poster_path}` : null,
    language_code: m.original_language,
    language: langName(m.original_language),
    theatre_date: m.release_date || null,
    popularity: m.popularity,
    overview: m.overview || '',
  };
}

/**
 * India (region IN) mein theatre mein recently aayi + jaldi aane wali movies.
 * Pichhle ~5 mahine se agle ~2 mahine tak ki theatrical releases.
 */
export async function listIndiaMovies({ pages = 2 } = {}) {
  const base = {
    region: 'IN',
    watch_region: 'IN',
    language: 'en-IN',
    sort_by: 'popularity.desc',
    include_adult: 'false',
    with_release_type: '2|3', // theatrical
    'release_date.gte': addDays(-150),
    'release_date.lte': addDays(60),
  };
  const results = [];
  for (let page = 1; page <= pages; page++) {
    const data = await tmdb('/discover/movie', { ...base, page });
    results.push(...(data.results || []));
    if (page >= (data.total_pages || 1)) break;
  }
  const seen = new Set();
  return results.filter((m) => !seen.has(m.id) && seen.add(m.id)).map(slim);
}

/** Naam se search (India region) */
export async function searchMovies(query) {
  const data = await tmdb('/search/movie', {
    query,
    region: 'IN',
    language: 'en-IN',
    include_adult: 'false',
    page: 1,
  });
  return (data.results || []).slice(0, 20).map(slim);
}

/** India ki theatrical release date (agar TMDB par ho) */
function indiaTheatreDate(releaseDates) {
  const india = releaseDates?.results?.find((r) => r.iso_3166_1 === 'IN');
  const theatrical = india?.release_dates
    ?.filter((d) => d.type === 3 || d.type === 2)
    .map((d) => d.release_date?.slice(0, 10))
    .filter(Boolean)
    .sort();
  return theatrical?.[0] || null;
}

export async function movieDetails(id) {
  const m = await tmdb(`/movie/${id}`, {
    language: 'en-IN',
    append_to_response: 'credits,release_dates',
  });
  return {
    ...slim(m),
    theatre_date: indiaTheatreDate(m.release_dates) || m.release_date || null,
    backdrop: m.backdrop_path ? `${IMG}/w1280${m.backdrop_path}` : null,
    runtime: m.runtime || null,
    genres: (m.genres || []).map((g) => g.name),
    imdb_id: m.imdb_id || null,
    cast: (m.credits?.cast || []).slice(0, 10).map((c) => ({
      id: c.id,
      name: c.name,
      character: c.character,
      photo: c.profile_path ? `${IMG}/w185${c.profile_path}` : null,
    })),
    director: (m.credits?.crew || []).filter((c) => c.job === 'Director').map((c) => c.name),
  };
}
