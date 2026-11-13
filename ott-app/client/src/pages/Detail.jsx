import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { PlatformBadge, StatusLabel, Checking } from '../components/Badges.jsx';
import { Poster } from '../components/MovieCard.jsx';
import { Loading, ErrorBox } from '../components/States.jsx';
import { formatDate, NO_DATE, watchUrl } from '../lib/util.js';

function hostOf(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

export default function Detail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [movie, setMovie] = useState(null);
  const [error, setError] = useState(false);

  const load = useCallback(
    async (signal) => {
      setError(false);
      try {
        const res = await fetch(`/api/movies/${id}`, { signal });
        if (!res.ok) throw new Error(String(res.status));
        const json = await res.json();
        setMovie(json.movie);
      } catch (e) {
        if (e.name !== 'AbortError') setError(true);
      }
    },
    [id]
  );

  useEffect(() => {
    const ctrl = new AbortController();
    setMovie(null);
    load(ctrl.signal);
    return () => ctrl.abort();
  }, [load]);

  // Agar OTT info abhi bhi aa rahi hai to thodi der baad dobara pucho
  useEffect(() => {
    if (!movie?.ott_checking) return;
    const t = setTimeout(() => load(), 8000);
    return () => clearTimeout(t);
  }, [movie, load]);

  const back = () => (window.history.length > 1 ? navigate(-1) : navigate('/'));

  if (error) return <div className="px-4"><ErrorBox onRetry={() => load()} /></div>;
  if (!movie) return <Loading text="Movie ki details la rahe hain..." />;

  const ott = movie.ott;
  const ottDate = formatDate(ott?.ott_date);
  const url = watchUrl(movie);
  const story = movie.story_hinglish || movie.overview;

  return (
    <div className="min-h-dvh pb-16">
      <div className="relative">
        {movie.backdrop && (
          <img src={movie.backdrop} alt="" className="absolute inset-0 h-full w-full object-cover opacity-25" />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-ink/40 via-ink/80 to-ink" />

        <div className="relative mx-auto max-w-4xl px-4 pt-4">
          <button onClick={back} className="mb-4 rounded-lg bg-white/10 px-3 py-1.5 text-sm font-semibold hover:bg-white/20">
            ← Wapas
          </button>

          <div className="flex flex-col gap-5 sm:flex-row">
            <Poster
              src={movie.poster}
              title={movie.title}
              className="mx-auto aspect-[2/3] w-52 shrink-0 rounded-2xl shadow-2xl sm:mx-0 sm:w-60"
            />

            <div className="min-w-0 flex-1">
              <h1 className="text-2xl font-extrabold leading-tight sm:text-3xl">{movie.title}</h1>
              <p className="mt-1 text-sm text-slate-400">
                {[movie.language, movie.runtime ? `${movie.runtime} min` : null, movie.genres?.slice(0, 3).join(', ')]
                  .filter(Boolean)
                  .join(' · ')}
              </p>

              <div className="mt-4 rounded-2xl border border-line bg-panel/90 p-4">
                {!ott && movie.ott_checking ? (
                  <Checking />
                ) : (
                  <>
                    <div className="flex flex-wrap items-center gap-2">
                      {ott?.platform ? <PlatformBadge platform={ott.platform} size="lg" /> : null}
                      <StatusLabel status={ott?.status} />
                    </div>
                    <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
                      <dt className="text-slate-400">OTT date</dt>
                      <dd className="font-semibold">{ottDate || <span className="font-normal text-slate-300">{NO_DATE}</span>}</dd>
                      <dt className="text-slate-400">Theatre</dt>
                      <dd>{formatDate(movie.theatre_date) || 'pata nahi'}</dd>
                    </dl>
                  </>
                )}

                <div className="mt-4 flex flex-wrap gap-2">
                  {url ? (
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-xl bg-rose-600 px-5 py-2.5 font-bold text-white hover:bg-rose-500"
                    >
                      ▶ Kahan Dekhein
                    </a>
                  ) : (
                    <span className="cursor-not-allowed rounded-xl bg-slate-700 px-5 py-2.5 font-bold text-slate-400">
                      ▶ Kahan Dekhein
                    </span>
                  )}
                  {ott?.source_url && (
                    <a
                      href={ott.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-xl border border-line px-4 py-2.5 text-sm text-slate-200 hover:border-slate-400"
                    >
                      Source: {hostOf(ott.source_url)} ↗
                    </a>
                  )}
                </div>
                {ott?.platform && (
                  <p className="mt-2 text-xs text-slate-500">"Kahan Dekhein" {ott.platform} par yeh movie dhoondhega.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-4">
        <section className="mt-6">
          <h2 className="mb-2 text-lg font-bold">Kahani</h2>
          <p className="leading-relaxed text-slate-300">{story || 'Kahani ki jaankari abhi nahi hai.'}</p>
          {!movie.story_hinglish && movie.overview && (
            <p className="mt-1 text-xs text-slate-500">(Hinglish version abhi ready nahi, English mein dikha rahe hain)</p>
          )}
        </section>

        {movie.director?.length > 0 && (
          <p className="mt-4 text-sm text-slate-400">
            Director: <span className="text-slate-200">{movie.director.join(', ')}</span>
          </p>
        )}

        {movie.cast?.length > 0 && (
          <section className="mt-6">
            <h2 className="mb-3 text-lg font-bold">Cast</h2>
            <div className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 pb-2">
              {movie.cast.map((c) => (
                <div key={c.id} className="w-24 shrink-0 text-center">
                  {c.photo ? (
                    <img src={c.photo} alt={c.name} loading="lazy" className="mx-auto h-24 w-24 rounded-full object-cover" />
                  ) : (
                    <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-panel text-2xl text-slate-500">
                      {c.name[0]}
                    </div>
                  )}
                  <p className="mt-1.5 line-clamp-2 text-xs font-semibold">{c.name}</p>
                  {c.character && <p className="line-clamp-1 text-[11px] text-slate-500">{c.character}</p>}
                </div>
              ))}
            </div>
          </section>
        )}

        <p className="mt-10 text-center text-xs text-slate-600">
          <Link to="/" className="underline">Home par jao</Link>
        </p>
      </div>
    </div>
  );
}
