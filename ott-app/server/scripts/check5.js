// 5 movies par OTT date + platform check karne ki script.
// Chalao: ott-app folder mein `npm run check`
// Yeh cache ko ignore karke Gemini se fresh search karti hai, aur result ke saath source dikhati hai
// taaki aap khud source khol kar mila sako ki date/platform sahi hai.
import { missingKeys, config } from '../src/config.js';
import { listIndiaMovies } from '../src/tmdb.js';
import { fetchOttInfo } from '../src/gemini.js';

const missing = missingKeys();
if (missing.length) {
  console.error(`.env mein ${missing.join(', ')} daalo, phir dobara chalao.`);
  process.exit(1);
}

const count = Number(process.argv[2]) || 5;
console.log(`Model: ${config.geminiModel}\nTMDB se India ki movies la rahe hain...\n`);
const movies = (await listIndiaMovies({ pages: 1 })).slice(0, count);

let ok = 0;
for (const m of movies) {
  process.stdout.write(`• ${m.title} (${m.language}, theatre ${m.theatre_date || '?'}) ... `);
  try {
    const r = await fetchOttInfo(m);
    ok++;
    console.log(`\n    status: ${r.status}\n    platform: ${r.platform || '-'}\n    ott_date: ${r.ott_date || '-'}\n    source: ${r.source_url || '-'}\n    google searches: ${r._debug.queries.join(' | ') || 'koi nahi'}\n`);
  } catch (err) {
    console.log(`\n    Gemini FAIL: ${err.message}\n`);
  }
}
console.log(`${ok}/${movies.length} movies ka jawab aaya. Har source link khol kar date/platform mila lo.`);
