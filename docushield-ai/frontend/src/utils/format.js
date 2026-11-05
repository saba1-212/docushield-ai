export const RISK = {
  Low: {
    label: 'Low Risk', hex: '#16A34A',
    badge: 'bg-green-50 text-green-700 ring-green-600/20', dot: 'bg-green-500',
    soft: 'bg-green-50', text: 'text-green-700', border: 'border-green-200', bar: 'bg-green-500', gradient: 'from-green-50 to-white',
  },
  Medium: {
    label: 'Medium Risk', hex: '#F97316',
    badge: 'bg-orange-50 text-orange-700 ring-orange-600/20', dot: 'bg-orange-500',
    soft: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200', bar: 'bg-orange-500', gradient: 'from-orange-50 to-white',
  },
  High: {
    label: 'High Risk', hex: '#DC2626',
    badge: 'bg-red-50 text-red-700 ring-red-600/20', dot: 'bg-red-500',
    soft: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', bar: 'bg-red-500', gradient: 'from-red-50 to-white',
  },
};

export const formatDate = (iso, withTime = false) => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString(undefined, withTime
    ? { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }
    : { year: 'numeric', month: 'short', day: 'numeric' });
};

export const formatShortDay = (isoDate) => {
  const d = new Date(isoDate + 'T00:00:00');
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

export const formatBytes = (n) => {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
};

export const pct = (v, digits = 1) => (v == null ? '—' : `${(v * 100).toFixed(digits)}%`);

export const fileExt = (name) => (name.includes('.') ? name.split('.').pop().toLowerCase() : '');

export const todayISO = () => new Date().toISOString().slice(0, 10);
export const daysAgoISO = (n) => new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);
