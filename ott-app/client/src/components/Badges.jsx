import { platformStyle } from '../lib/util.js';

export function PlatformBadge({ platform, size = 'sm' }) {
  if (!platform) return null;
  const pad = size === 'lg' ? 'px-3 py-1 text-sm' : 'px-2 py-0.5 text-xs';
  return (
    <span className={`inline-flex items-center rounded-md font-semibold ${pad} ${platformStyle(platform)}`}>
      {platform}
    </span>
  );
}

export function StatusLabel({ status }) {
  if (status === 'confirmed') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-semibold text-emerald-300 ring-1 ring-emerald-500/40">
        ✓ Confirmed
      </span>
    );
  }
  if (status === 'expected') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-semibold text-amber-300 ring-1 ring-amber-500/40">
        ~ Expected
      </span>
    );
  }
  return null;
}

export function Checking() {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-slate-400">
      <span className="h-2 w-2 animate-pulse rounded-full bg-sky-400" />
      OTT info dhoondh rahe hain...
    </span>
  );
}
