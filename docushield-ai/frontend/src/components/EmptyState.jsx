import { motion } from 'framer-motion';

export default function EmptyState({ icon: Icon, title, text, action }) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center px-6 py-14 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-soft-100 text-navy-800">
        {Icon && <Icon size={26} />}
      </div>
      <h3 className="text-base font-semibold text-navy-900">{title}</h3>
      {text && <p className="mt-1.5 max-w-sm text-sm text-slate-500">{text}</p>}
      {action && <div className="mt-5">{action}</div>}
    </motion.div>
  );
}

export function ErrorState({ message, onRetry }) {
  return (
    <div className="card flex flex-col items-center px-6 py-10 text-center">
      <p className="text-sm font-semibold text-red-700">Something went wrong</p>
      <p className="mt-1 max-w-md text-sm text-slate-500">{message}</p>
      {onRetry && <button className="btn-secondary mt-4" onClick={onRetry}>Try again</button>}
    </div>
  );
}

export function Spinner({ size = 20 }) {
  return (
    <svg className="animate-spin text-teal-600" width={size} height={size} viewBox="0 0 24 24" fill="none" aria-label="Loading">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.2" strokeWidth="3" />
      <path d="M21 12a9 9 0 00-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export function PageLoading() {
  return <div className="flex h-64 items-center justify-center"><Spinner size={28} /></div>;
}
