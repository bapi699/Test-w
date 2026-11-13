import { Link } from 'react-router-dom';
import { PlatformBadge, StatusLabel, Checking } from './Badges.jsx';
import { formatDate, NO_DATE } from '../lib/util.js';

export function Poster({ src, title, className = '' }) {
  if (!src) {
    return (
      <div className={`flex items-center justify-center bg-panel p-4 text-center text-sm text-slate-500 ${className}`}>
        {title}
      </div>
    );
  }
  return <img src={src} alt={`${title} poster`} loading="lazy" className={`object-cover ${className}`} />;
}

export default function MovieCard({ movie }) {
  const ott = movie.ott;
  const ottDate = formatDate(ott?.ott_date);
  const theatre = formatDate(movie.theatre_date);
  const showChecking = !ott && movie.ott_checking;

  return (
    <Link
      to={`/movie/${movie.id}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-line bg-panel transition hover:-translate-y-0.5 hover:border-slate-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
    >
      <div className="relative aspect-[2/3] w-full overflow-hidden bg-black">
        <Poster src={movie.poster} title={movie.title} className="h-full w-full transition duration-300 group-hover:scale-[1.03]" />
        {ott?.platform && (
          <div className="absolute left-2 top-2 shadow-lg">
            <PlatformBadge platform={ott.platform} />
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-1.5 p-3">
        <h3 className="line-clamp-2 text-base font-bold leading-snug">{movie.title}</h3>

        {showChecking ? (
          <Checking />
        ) : (
          <div className="flex flex-wrap items-center gap-1.5">
            <StatusLabel status={ott?.status} />
          </div>
        )}

        <div className="text-sm">
          <span className="text-slate-400">OTT: </span>
          {ottDate ? (
            <span className="font-semibold text-white">{ottDate}</span>
          ) : (
            <span className="text-slate-400">{showChecking ? '...' : NO_DATE}</span>
          )}
        </div>

        <div className="mt-auto space-y-0.5 pt-1 text-xs text-slate-400">
          <div>🗣️ {movie.language}</div>
          <div>🎬 Theatre: {theatre || 'pata nahi'}</div>
        </div>
      </div>
    </Link>
  );
}
