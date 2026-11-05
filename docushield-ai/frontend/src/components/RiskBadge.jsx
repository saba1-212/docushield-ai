import { RISK } from '../utils/format.js';

export function RiskBadge({ risk, size = 'md' }) {
  if (!risk) return <span className="text-slate-400">—</span>;
  const m = RISK[risk];
  const pad = size === 'lg' ? 'px-3.5 py-1.5 text-sm' : 'px-2.5 py-1 text-xs';
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full font-semibold ring-1 ring-inset ${m.badge} ${pad}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${m.dot}`} />
      {m.label}
    </span>
  );
}

const STATUS = {
  'Auto-Classified': 'bg-teal-50 text-teal-700 ring-teal-600/20',
  'Pending Review': 'bg-amber-50 text-amber-800 ring-amber-600/25',
  Reviewed: 'bg-sky-50 text-sky-700 ring-sky-600/20',
};

export function StatusBadge({ status }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset whitespace-nowrap ${STATUS[status] || 'bg-slate-50 text-slate-600 ring-slate-300'}`}>
      {status}
    </span>
  );
}
