export function Loading({ text = 'Movies la rahe hain...' }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-20 text-slate-300" role="status">
      <span className="h-9 w-9 animate-spin rounded-full border-4 border-slate-700 border-t-rose-500" />
      <p>{text}</p>
    </div>
  );
}

export function ErrorBox({ onRetry }) {
  return (
    <div className="mx-auto my-16 max-w-sm rounded-2xl border border-rose-500/40 bg-rose-500/10 p-6 text-center">
      <p className="mb-4 font-semibold text-rose-200">Kuch gadbad ho gayi, dobara try karo</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="rounded-lg bg-rose-600 px-4 py-2 font-semibold text-white hover:bg-rose-500"
        >
          Dobara try karo
        </button>
      )}
    </div>
  );
}
