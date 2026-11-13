import { GoogleGenAI } from '@google/genai';
import { config } from './config.js';

let client = null;
function ai() {
  if (!config.geminiApiKey) throw new Error('GEMINI_API_KEY set nahi hai');
  if (!client) client = new GoogleGenAI({ apiKey: config.geminiApiKey });
  return client;
}

// Platform ke naam ko ek standard roop mein laate hain (badge color ke liye).
// Jo platform yahan list mein nahi hai, wo Gemini ke diye naam se hi dikhega.
const PLATFORM_ALIASES = [
  [/netflix/i, 'Netflix'],
  [/prime|amazon\s*video/i, 'Prime Video'],
  [/mx\s*player/i, 'Amazon MX Player'],
  [/jio\s*hotstar|hotstar|jiocinema|jio\s*cinema|disney/i, 'JioHotstar'],
  [/zee\s*5|zee5/i, 'ZEE5'],
  [/sony\s*liv|sonyliv/i, 'SonyLIV'],
  [/\baha\b/i, 'Aha'],
  [/sun\s*nxt/i, 'Sun NXT'],
  [/apple\s*tv/i, 'Apple TV+'],
  [/lionsgate/i, 'Lionsgate Play'],
  [/manorama/i, 'ManoramaMAX'],
  [/hoichoi/i, 'Hoichoi'],
  [/etv\s*win/i, 'ETV Win'],
  [/simply\s*south/i, 'Simply South'],
  [/chaupal/i, 'Chaupal'],
  [/shemaroo/i, 'ShemarooMe'],
  [/book\s*my\s*show|bms\s*stream/i, 'BookMyShow Stream'],
  [/youtube/i, 'YouTube'],
];

export function normalizePlatform(name) {
  if (!name || typeof name !== 'string') return null;
  const n = name.trim();
  if (!n || /^(null|none|unknown|n\/a|na|not announced|tba|tbd)$/i.test(n)) return null;
  for (const [re, canon] of PLATFORM_ALIASES) if (re.test(n)) return canon;
  return n.slice(0, 40);
}

function validIsoDate(s) {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const d = new Date(s + 'T00:00:00Z');
  return Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== s ? null : s;
}

const isHttpUrl = (u) => typeof u === 'string' && /^https?:\/\/\S+$/i.test(u.trim());

function extractJson(text) {
  if (!text) return null;
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const body = fenced ? fenced[1] : text;
  const start = body.indexOf('{');
  const end = body.lastIndexOf('}');
  if (start === -1 || end <= start) return null;
  try {
    return JSON.parse(body.slice(start, end + 1));
  } catch {
    return null;
  }
}

function buildPrompt(movie, today) {
  return `Aaj ki tareekh: ${today}.

Google Search karke pata karo ki yeh movie INDIA mein kis OTT/streaming platform par aur kis date ko release hui hai ya hogi:

Movie: "${movie.title}"${movie.original_title && movie.original_title !== movie.title ? ` (original title: "${movie.original_title}")` : ''}
Language: ${movie.language}
India theatre release date (TMDB): ${movie.theatre_date || 'pata nahi'}

Sakht niyam (strict rules):
- Sirf wahi platform aur date likho jo search results mein saaf-saaf likha mila ho. Andaza mat lagao, khud se kuch mat banao.
- "confirmed" tabhi jab platform ya official/trusted source ne exact OTT date announce ki ho (ya movie already stream ho rahi ho aur date pata ho).
- "expected" jab sirf report/rumour mein platform ya tentative date mili ho. Agar exact din nahi mila to ott_date null rakho.
- "unknown" jab kuch bhi reliable na mile. Tab platform aur ott_date dono null.
- Satellite/TV premiere ya kisi aur desh ki release mat lo, sirf India ka OTT digital release.
- source_url mein us web page ka asli URL do jahan yeh jaankari mili.
- story_hinglish: neeche di gayi English story ko 2-3 chhoti lines mein Hinglish (Hindi words, Roman script) mein likho. Spoiler mat do. Story khaali ho to null.

English story (TMDB): ${movie.overview ? movie.overview.slice(0, 1200) : '(nahi hai)'}

Jawab SIRF is JSON format mein do, aur kuch nahi:
{"platform": string|null, "ott_date": "YYYY-MM-DD"|null, "status": "confirmed"|"expected"|"unknown", "source_url": string|null, "story_hinglish": string|null}`;
}

/**
 * Gemini + Google Search grounding se ek movie ka OTT data lao.
 * Kabhi crash nahi karta: error par throw karta hai, caller handle karta hai.
 */
export async function fetchOttInfo(movie) {
  const today = new Date().toISOString().slice(0, 10);
  const response = await ai().models.generateContent({
    model: config.geminiModel,
    contents: buildPrompt(movie, today),
    config: {
      tools: [{ googleSearch: {} }],
      temperature: 0,
      httpOptions: { timeout: 90_000 },
    },
  });

  const candidate = response.candidates?.[0];
  const gm = candidate?.groundingMetadata;
  const groundingUrls = (gm?.groundingChunks || []).map((c) => c.web?.uri).filter(isHttpUrl);
  const searched = (gm?.webSearchQueries?.length || 0) > 0 || groundingUrls.length > 0;

  const parsed = extractJson(response.text);
  if (!parsed) throw new Error('Gemini ka jawab JSON mein nahi tha');

  let platform = normalizePlatform(parsed.platform);
  let ottDate = validIsoDate(parsed.ott_date);
  let status = ['confirmed', 'expected', 'unknown'].includes(parsed.status) ? parsed.status : 'unknown';
  let sourceUrl = isHttpUrl(parsed.source_url) ? parsed.source_url.trim() : null;
  const story = typeof parsed.story_hinglish === 'string' && parsed.story_hinglish.trim()
    ? parsed.story_hinglish.trim().slice(0, 600)
    : null;

  // --- Anti-hallucination guards ---
  // 1) Agar Google Search hua hi nahi, to koi date/platform bharosa layak nahi.
  if (!searched) {
    platform = null; ottDate = null; status = 'unknown'; sourceUrl = null;
  }
  // 2) Source ke bina koi claim nahi. Model ne URL nahi diya to grounding ka pehla source lo.
  if (status !== 'unknown' && !sourceUrl) sourceUrl = groundingUrls[0] || null;
  if (!sourceUrl) { platform = null; ottDate = null; status = 'unknown'; }
  // 3) "confirmed" ke liye platform + exact date dono chahiye
  if (status === 'confirmed' && (!platform || !ottDate)) status = platform || ottDate ? 'expected' : 'unknown';
  // 4) "unknown" ke saath koi platform/date nahi dikhana
  if (status === 'unknown') { platform = null; ottDate = null; }
  if (status === 'expected' && !platform && !ottDate) status = 'unknown';

  return {
    platform,
    ott_date: ottDate,
    status,
    source_url: status === 'unknown' ? null : sourceUrl,
    story_hinglish: story,
    _debug: { searched, queries: gm?.webSearchQueries || [], sources: groundingUrls.length },
  };
}
