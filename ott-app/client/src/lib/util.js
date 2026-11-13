const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "2026-11-13" -> "13 Nov 2026" */
export function formatDate(iso) {
  if (!iso || !/^\d{4}-\d{2}-\d{2}/.test(iso)) return null;
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  return `${d} ${MONTHS[m - 1]} ${y}`;
}

export function todayIso() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export const NO_DATE = 'OTT date abhi announce nahi hui';

const PLATFORMS = {
  'Netflix': { cls: 'bg-red-600 text-white', url: (t) => `https://www.netflix.com/search?q=${t}` },
  'Prime Video': { cls: 'bg-sky-500 text-white', url: (t) => `https://www.primevideo.com/search/ref=atv_nb_sug?phrase=${t}` },
  'JioHotstar': { cls: 'bg-blue-700 text-white', url: (t) => `https://www.hotstar.com/in/explore?search_query=${t}` },
  'ZEE5': { cls: 'bg-purple-600 text-white', url: (t) => `https://www.zee5.com/search?q=${t}` },
  'SonyLIV': { cls: 'bg-zinc-100 text-zinc-900', url: (t) => `https://www.sonyliv.com/search?searchTerm=${t}` },
  'Aha': { cls: 'bg-orange-500 text-white', url: () => 'https://www.aha.video/' },
  'Sun NXT': { cls: 'bg-amber-400 text-zinc-900', url: () => 'https://www.sunnxt.com/' },
  'Apple TV+': { cls: 'bg-zinc-800 text-white ring-1 ring-zinc-500', url: () => 'https://tv.apple.com/in' },
  'Lionsgate Play': { cls: 'bg-orange-700 text-white', url: () => 'https://www.lionsgateplay.com/' },
  'Amazon MX Player': { cls: 'bg-blue-500 text-white', url: () => 'https://www.mxplayer.in/' },
  'ManoramaMAX': { cls: 'bg-rose-700 text-white', url: () => 'https://www.manoramamax.com/' },
  'Hoichoi': { cls: 'bg-red-500 text-white', url: () => 'https://www.hoichoi.tv/' },
  'ETV Win': { cls: 'bg-yellow-500 text-zinc-900', url: () => 'https://www.etvwin.com/' },
  'YouTube': { cls: 'bg-red-700 text-white', url: (t) => `https://www.youtube.com/results?search_query=${t}` },
};

export function platformStyle(name) {
  return PLATFORMS[name]?.cls || 'bg-teal-600 text-white';
}

/** "Kahan Dekhein" ke liye link: platform ka search page, warna source page */
export function watchUrl(movie) {
  const p = movie.ott?.platform;
  if (!p) return null;
  const known = PLATFORMS[p];
  if (known) return known.url(encodeURIComponent(movie.title));
  return movie.ott?.source_url || null;
}

/** Tab ke hisaab se split: OTT date aaj ya pehle => "Abhi Release Hui", baaki => "Jald Aa Rahi Hai" */
export function isOutOnOtt(movie, today = todayIso()) {
  return Boolean(movie.ott?.ott_date && movie.ott.ott_date <= today);
}

/** Sabse nayi date upar. Jinki OTT date pata hai wo pehle, phir baaki theatre date se. */
export function sortNewestFirst(list) {
  return [...list].sort((a, b) => {
    const ad = a.ott?.ott_date, bd = b.ott?.ott_date;
    if (ad && !bd) return -1;
    if (!ad && bd) return 1;
    const ak = ad || a.theatre_date || '';
    const bk = bd || b.theatre_date || '';
    return bk.localeCompare(ak);
  });
}
