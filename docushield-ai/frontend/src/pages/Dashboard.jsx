import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { animate, motion, useMotionValue, useTransform } from 'framer-motion';
import { AlertTriangle, ArrowRight, CheckCircle2, ClipboardCheck, FileText, FileSearch, ShieldAlert, ShieldCheck } from 'lucide-react';
import { api } from '../services/api.js';
import { useApi } from '../hooks/useApi.js';
import { useProfile } from '../hooks/useProfile.jsx';
import PageHeader from '../components/PageHeader.jsx';
import DocumentsTable from '../components/DocumentsTable.jsx';
import EmptyState, { ErrorState, PageLoading } from '../components/EmptyState.jsx';
import { CategoryChart, RiskDonut, TrendChart } from '../components/charts.jsx';
import { RiskBadge } from '../components/RiskBadge.jsx';
import { pct } from '../utils/format.js';

function Counter({ value }) {
  const mv = useMotionValue(0);
  const text = useTransform(mv, (v) => Math.round(v).toLocaleString());
  useEffect(() => {
    const c = animate(mv, value, { duration: 0.9, ease: 'easeOut' });
    return () => c.stop();
  }, [value, mv]);
  return <motion.span>{text}</motion.span>;
}

function StatCard({ i, icon: Icon, label, value, sub, tone, to }) {
  const navigate = useNavigate();
  const tones = {
    navy: 'bg-navy-900 text-white', green: 'bg-green-50 text-green-600', orange: 'bg-orange-50 text-orange-600',
    red: 'bg-red-50 text-red-600', teal: 'bg-teal-50 text-teal-600',
  };
  return (
    <motion.button type="button" onClick={() => navigate(to)}
      initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06, duration: 0.3 }}
      whileHover={{ y: -3 }} whileTap={{ scale: 0.98 }}
      className="card p-5 text-left transition-shadow hover:shadow-lift">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-slate-500">{label}</span>
        <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${tones[tone]}`}><Icon size={19} /></span>
      </div>
      <div className="mt-3 text-3xl font-bold tracking-tight text-navy-900 tabular-nums"><Counter value={value} /></div>
      <div className="mt-1 text-xs text-slate-500">{sub}</div>
    </motion.button>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { profile } = useProfile();
  const stats = useApi(api.stats);
  const charts = useApi(api.charts);
  const recent = useApi(() => api.listDocuments({ page_size: 6, sort: 'newest' }));
  const queue = useApi(() => api.reviews('Pending'));

  if (stats.loading && !stats.data) return <PageLoading />;
  if (stats.error) return <ErrorState message={stats.error} onRetry={() => { stats.reload(); charts.reload(); recent.reload(); }} />;

  const s = stats.data;
  const share = (n) => (s.total ? `${((n / s.total) * 100).toFixed(0)}% of all documents` : 'No documents yet');

  return (
    <div>
      <PageHeader title="Dashboard Overview" subtitle={`Welcome back, ${profile?.name?.split(' ')[0] || 'there'}. Here is the current state of your document risk analysis.`}>
        <Link to="/analyze" className="btn-primary"><FileSearch size={17} /> Analyze Document</Link>
      </PageHeader>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard i={0} icon={FileText} tone="navy" label="Documents Analyzed" value={s.total} sub={`${s.reviewed} human-reviewed`} to="/history" />
        <StatCard i={1} icon={ShieldCheck} tone="green" label="Low Risk" value={s.low} sub={share(s.low)} to="/history?risk=Low" />
        <StatCard i={2} icon={AlertTriangle} tone="orange" label="Medium Risk" value={s.medium} sub={share(s.medium)} to="/history?risk=Medium" />
        <StatCard i={3} icon={ShieldAlert} tone="red" label="High Risk" value={s.high} sub={share(s.high)} to="/history?risk=High" />
        <StatCard i={4} icon={ClipboardCheck} tone="teal" label="Needs Manual Review" value={s.manual_review_pending} sub={s.manual_review_pending ? 'Waiting for a reviewer' : 'Queue is clear'} to="/review" />
      </div>

      {s.total === 0 ? (
        <div className="card mt-6">
          <EmptyState icon={FileSearch} title="No documents analyzed yet"
            text="Upload a PDF, DOCX or TXT document. DocuShield AI will classify its risk level, explain the result, and flag uncertain documents for review. Charts and statistics will appear here."
            action={<Link to="/analyze" className="btn-primary">Analyze your first document <ArrowRight size={16} /></Link>} />
        </div>
      ) : (
        <>
          <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
            <motion.section initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="card p-5 lg:col-span-2">
              <h3 className="text-base font-bold text-navy-900">Document Analysis Trend</h3>
              <p className="mb-3 text-xs text-slate-500">Documents analyzed per day, last 14 days, by risk level</p>
              {charts.data ? <TrendChart data={charts.data.trend} /> : <PageLoading />}
            </motion.section>
            <motion.section initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.36 }} className="card p-5">
              <h3 className="text-base font-bold text-navy-900">Risk Distribution</h3>
              <p className="mb-3 text-xs text-slate-500">Uses the human decision once a document is reviewed</p>
              {charts.data ? <RiskDonut data={charts.data.risk_distribution} total={s.total} /> : <PageLoading />}
            </motion.section>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <motion.section initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.42 }} className="card p-5">
              <h3 className="text-base font-bold text-navy-900">Document Classification</h3>
              <p className="mb-3 text-xs text-slate-500">Document types detected by the classifier</p>
              {charts.data ? <CategoryChart data={charts.data.categories} /> : <PageLoading />}
            </motion.section>

            <motion.section initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.48 }} className="card p-5">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-navy-900">Needs Attention</h3>
                <Link to="/review" className="text-sm font-semibold text-teal-700 hover:underline">View queue</Link>
              </div>
              <p className="mb-3 text-xs text-slate-500">Documents waiting for human verification</p>
              {queue.data && queue.data.items.length === 0 && (
                <div className="flex flex-col items-center py-10 text-center">
                  <CheckCircle2 className="text-teal-500" size={30} />
                  <p className="mt-2 text-sm font-medium text-navy-900">Nothing is waiting for review</p>
                  <p className="text-xs text-slate-500">High-risk and low-confidence documents will appear here.</p>
                </div>
              )}
              <div className="space-y-2.5">
                {queue.data?.items.slice(0, 4).map((d) => (
                  <button key={d.id} onClick={() => navigate(`/documents/${d.id}?review=1`)}
                    className={`flex w-full items-start gap-3 rounded-xl border p-3.5 text-left transition hover:shadow-card ${d.ai_risk === 'High' ? 'border-red-200 bg-red-50/60' : 'border-amber-200 bg-amber-50/60'}`}>
                    <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${d.ai_risk === 'High' ? 'bg-red-500' : 'bg-amber-500'}`} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold text-navy-900">{d.name}</div>
                      <div className="mt-0.5 text-xs text-slate-600">{d.review_reason}</div>
                    </div>
                    <div className="flex flex-col items-end gap-1"><RiskBadge risk={d.ai_risk} /><span className="text-[11px] text-slate-500">{pct(d.confidence, 0)} conf.</span></div>
                  </button>
                ))}
              </div>
            </motion.section>
          </div>

          <motion.section initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.54 }} className="card mt-4 overflow-hidden">
            <div className="flex items-center justify-between px-5 pb-2 pt-5">
              <h3 className="text-base font-bold text-navy-900">Recent Documents</h3>
              <Link to="/history" className="text-sm font-semibold text-teal-700 hover:underline">View all</Link>
            </div>
            {recent.data && <DocumentsTable docs={recent.data.items} onView={(d) => navigate(`/documents/${d.id}`)} />}
          </motion.section>
        </>
      )}
    </div>
  );
}
