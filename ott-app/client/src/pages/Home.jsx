import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import MovieCard from '../components/MovieCard.jsx';
import { Loading, ErrorBox } from '../components/States.jsx';
import { isOutOnOtt, sortNewestFirst } from '../lib/util.js';

const TABS = [
  { id: 'now', label: 'Abhi Release Hui' },
  { id: 'soon', label: 'Jald Aa Rahi Hai' },
];
const POLL_MS = 6000;
const MAX_POLLS = 60;

export default function Home() {
  // Tab, search, filters URL mein rehte hain taaki detail se wapas aane par state bani rahe
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') === 'soon' ? 'soon' : 'now';
  const query = params.get('q') || '';
  const platform = params.get('platform') || '';
  const language = params.get('lang') || '';

  const [input, setInput] = useState(query);
  const [data, setData] = useState(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);
  const polls = useRef(0);

  const setParam = useCallback(
    (key, value) => {
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (value) next.set(key, value);
          else next.delete(key);
          return next;
        },
        { replace: true }
      );
    },
    [setParams]
  );

  // Search box debounce
  useEffect(() => {
    const t = setTimeout(() => {
      if (input.trim() !== query) setParam('q', input.trim());
    }, 450);
    return () => clearTimeout(t);
  }, [input, query, setParam]);

  const load = useCallback(
    async ({ silent = false, signal } = {}) => {
      if (!silent) {
        setLoading(true);
        setError(false);
      }
      try {
        const res = await fetch(`/api/movies${query ? `?q=${encodeURIComponent(query)}` : ''}`, { signal });
        if (!res.ok) throw new Error(String(res.status));
        const json = await res.json();
        setData(json);
        setError(false);
      } catch (e) {
        if (e.name === 'AbortError') return;
        if (!silent) setError(true);
      } finally {
        if (!silent && !signal?.aborted) setLoading(false);
      }
    },
    [query]
  );

  useEffect(() => {
    const ctrl = new AbortController();
    polls.current = 0;
    load({ signal: ctrl.signal });
    return () => ctrl.abort();
  }, [load]);

  // Jab tak backend Gemini se OTT data la raha hai, thodi-thodi der mein refresh
  useEffect(() => {
    if (!data?.pending || polls.current >= MAX_POLLS) return;
    const t = setTimeout(() => {
      polls.current += 1;
      load({ silent: true });
    }, POLL_MS);
    return () => clearTimeout(t);
  }, [data, load]);

  const movies = data?.movies || [];

  const platforms = useMemo(
    () => [...new Set(movies.map((m) => m.ott?.platform).filter(Boolean))].sort(),
    [movies]
  );
  const languages = useMemo(() => [...new Set(movies.map((m) => m.language))].sort(), [movies]);

  const tabCounts = useMemo(() => {
    const out = movies.filter((m) => isOutOnOtt(m)).length;
    return { now: out, soon: movies.length - out };
  }, [movies]);

  const visible = useMemo(() => {
    const list = movies.filter((m) => {
      if ((tab === 'now') !== isOutOnOtt(m)) return false;
      if (platform && m.ott?.platform !== platform) return false;
      if (language && m.language !== language) return false;
      return true;
    });
    return sortNewestFirst(list);
  }, [movies, tab, platform, language]);

  const selectCls =
    'min-w-0 flex-1 rounded-xl border border-line bg-panel px-3 py-2.5 text-sm text-slate-100 focus:border-rose-500 focus:outline-none';

  return (
    <div className="mx-auto min-h-dvh max-w-6xl px-4 pb-16">
      <header className="sticky top-0 z-20 -mx-4 border-b border-line bg-ink/90 px-4 pb-3 pt-4 backdrop-blur">
        <div className="mb-3 flex items-baseline justify-between gap-3">
          <h1 className="text-xl font-extrabold tracking-tight sm:text-2xl">
            <span className="text-rose-500">▶</span> OTT Kab Aayegi?
          </h1>
          <span className="text-xs text-slate-500">India 🇮🇳</span>
        </div>

        <input
          type="search"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Movie ka naam likho..."
          aria-label="Movie search"
          className="w-full rounded-xl border border-line bg-panel px-4 py-3 text-base text-white placeholder:text-slate-500 focus:border-rose-500 focus:outline-none"
        />

        <div className="mt-3 grid grid-cols-2 gap-1 rounded-xl bg-panel p-1" role="tablist">
          {TABS.map((t) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => setParam('tab', t.id === 'now' ? '' : t.id)}
              className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
                tab === t.id ? 'bg-rose-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              {t.label}
              {data && <span className="ml-1 opacity-70">({tabCounts[t.id]})</span>}
            </button>
          ))}
        </div>

        <div className="mt-3 flex gap-2">
          <select value={platform} onChange={(e) => setParam('platform', e.target.value)} className={selectCls} aria-label="Platform filter">
            <option value="">Sab platforms</option>
            {platforms.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
          <select value={language} onChange={(e) => setParam('lang', e.target.value)} className={selectCls} aria-label="Language filter">
            <option value="">Sab bhashayein</option>
            {languages.map((l) => (
              <option key={l} value={l}>{l}</option>
            ))}
          </select>
        </div>
      </header>

      {data?.pending > 0 && (
        <p className="mt-3 flex items-center gap-2 rounded-lg bg-sky-500/10 px-3 py-2 text-xs text-sky-200">
          <span className="h-2 w-2 animate-pulse rounded-full bg-sky-400" />
          {data.pending} movies ki OTT date web par dhoondh rahe hain, list apne aap update hogi...
        </p>
      )}
      {data && data.gemini_enabled === false && (
        <p className="mt-3 rounded-lg bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
          OTT info abhi available nahi hai (Gemini key set nahi). Sirf TMDB ka data dikh raha hai.
        </p>
      )}

      <main className="mt-4">
        {loading && !data ? (
          <Loading />
        ) : error && !data ? (
          <ErrorBox onRetry={() => load()} />
        ) : visible.length === 0 ? (
          <p className="py-16 text-center text-slate-400">
            {tab === 'now' && !platform && !language && !query
              ? 'Is list mein abhi koi movie nahi hai. "Jald Aa Rahi Hai" tab dekho.'
              : 'Koi movie nahi mili. Filter ya naam badal ke dekho.'}
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
            {visible.map((m) => (
              <MovieCard key={m.id} movie={m} />
            ))}
          </div>
        )}
        {loading && data && <p className="mt-4 text-center text-sm text-slate-400">Movies la rahe hain...</p>}
      </main>

      <footer className="mt-12 text-center text-xs text-slate-600">
        Movie data: TMDB · OTT info: web search (Gemini). Galti ho sakti hai, source zaroor check karo.
      </footer>
    </div>
  );
}
