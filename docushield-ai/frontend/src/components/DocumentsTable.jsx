import { motion } from 'framer-motion';
import { FileText, Eye, Trash2 } from 'lucide-react';
import { RiskBadge, StatusBadge } from './RiskBadge.jsx';
import { formatDate, pct } from '../utils/format.js';

/** Shared table for Dashboard (recent) and Document History. */
export default function DocumentsTable({ docs, onView, onDelete }) {
  return (
    <div className="overflow-x-auto scrollbar-thin">
      <table className="w-full min-w-[860px] border-collapse">
        <thead>
          <tr className="border-b border-slate-100">
            <th className="th">Document</th>
            <th className="th">Uploaded</th>
            <th className="th">Category</th>
            <th className="th">Risk level</th>
            <th className="th">Confidence</th>
            <th className="th">Status</th>
            <th className="th text-right">Action</th>
          </tr>
        </thead>
        <tbody>
          {docs.map((d, i) => (
            <motion.tr key={d.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i * 0.03, 0.3) }}
              className="border-b border-slate-50 last:border-0 hover:bg-slate-50/70">
              <td className="td">
                <button onClick={() => onView(d)} className="flex max-w-[280px] items-center gap-3 text-left">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-soft-100 text-navy-800"><FileText size={17} /></span>
                  <span className="min-w-0">
                    <span className="block truncate font-medium text-navy-900 hover:underline">{d.name}</span>
                    <span className="block text-xs uppercase text-slate-400">{d.file_type}</span>
                  </span>
                </button>
              </td>
              <td className="td whitespace-nowrap text-slate-500">{formatDate(d.upload_date)}</td>
              <td className="td whitespace-nowrap">{d.category || '—'}</td>
              <td className="td">
                <div className="flex flex-col items-start gap-1">
                  <RiskBadge risk={d.effective_risk} />
                  {d.review_status === 'Reviewed' && d.final_risk !== d.ai_risk && (
                    <span className="text-[11px] text-slate-400">AI said {d.ai_risk}</span>
                  )}
                </div>
              </td>
              <td className="td tabular-nums">{pct(d.confidence)}</td>
              <td className="td"><StatusBadge status={d.status} /></td>
              <td className="td">
                <div className="flex justify-end gap-1.5">
                  <button onClick={() => onView(d)} className="btn-secondary !px-3 !py-1.5 !text-xs"><Eye size={14} /> View Details</button>
                  {onDelete && (
                    <button onClick={() => onDelete(d)} className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600" aria-label={`Delete ${d.name}`}>
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </td>
            </motion.tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
