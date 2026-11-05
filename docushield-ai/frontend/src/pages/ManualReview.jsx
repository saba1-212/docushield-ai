import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, ClipboardCheck } from 'lucide-react';
import { api } from '../services/api.js';
import { useApi } from '../hooks/useApi.js';
import PageHeader from '../components/PageHeader.jsx';
import EmptyState, { ErrorState, PageLoading } from '../components/EmptyState.jsx';
import { RiskBadge, StatusBadge } from '../components/RiskBadge.jsx';
import { formatDate, pct } from '../utils/format.js';

const TABS = [
  { id: 'Pending', label: 'Pending' },
  { id: 'Reviewed', label: 'Reviewed' },
  { id: '', label: 'All' },
];

export default function ManualReview() {
  const navigate = useNavigate();
  const [tab, setTab] = useState('Pending');
  const { data, loading, error, reload } = useApi(() => api.reviews(tab), [tab]);

  return (
    <div>
      <PageHeader title="Manual Review" subtitle="Documents that are high-risk or fell below the confidence threshold need a human decision." />

      <div className="mb-4 inline-flex rounded-xl bg-white p-1 shadow-card ring-1 ring-slate-200" role="tablist">
        {TABS.map((t) => (
          <button key={t.label} role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)}
            className={`relative rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${tab === t.id ? 'text-white' : 'text-slate-600 hover:text-navy-900'}`}>
            {tab === t.id && <motion.span layoutId="review-tab" className="absolute inset-0 rounded-lg bg-navy-900" transition={{ type: 'spring', stiffness: 400, damping: 34 }} />}
            <span className="relative">{t.label}</span>
          </button>
        ))}
      </div>

      <div className="card overflow-hidden">
        {loading && !data ? <PageLoading /> : error ? <ErrorState message={error} onRetry={reload} /> : data.items.length === 0 ? (
          <EmptyState icon={ClipboardCheck} title={tab === 'Pending' ? 'The review queue is clear' : 'Nothing here yet'}
            text={tab === 'Pending' ? 'Documents classified as High Risk, or with confidence below the threshold, will appear here for human verification.' : 'Reviewed documents will appear here once you complete a review.'} />
        ) : (
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full min-w-[980px] border-collapse">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="th">Document</th><th className="th">AI risk</th><th className="th">Confidence</th>
                  <th className="th">Reason for flagging</th><th className="th">Date</th><th className="th">Status</th><th className="th text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((d, i) => (
                  <motion.tr key={d.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i * 0.03, 0.3) }} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/70">
                    <td className="td max-w-[240px]"><button onClick={() => navigate(`/documents/${d.id}?review=1`)} className="block max-w-full truncate text-left font-medium text-navy-900 hover:underline">{d.name}</button><div className="text-xs text-slate-400">{d.category}</div></td>
                    <td className="td"><RiskBadge risk={d.ai_risk} /></td>
                    <td className="td tabular-nums">{pct(d.confidence)}</td>
                    <td className="td max-w-[300px] text-xs text-slate-600">{d.review_reason}</td>
                    <td className="td whitespace-nowrap text-slate-500">{formatDate(d.upload_date)}</td>
                    <td className="td"><StatusBadge status={d.status} /></td>
                    <td className="td text-right">
                      <button className={d.review_status === 'Pending' ? 'btn-primary !px-3 !py-1.5 !text-xs' : 'btn-secondary !px-3 !py-1.5 !text-xs'} onClick={() => navigate(`/documents/${d.id}?review=1`)}>
                        {d.review_status === 'Pending' ? 'Review' : 'Open record'} <ArrowRight size={14} />
                      </button>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
