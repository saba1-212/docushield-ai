import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, Brain, FileType2, Info, Layers, Save, SlidersHorizontal } from 'lucide-react';
import { api } from '../services/api.js';
import { useApi } from '../hooks/useApi.js';
import { useToast } from '../components/Toast.jsx';
import PageHeader from '../components/PageHeader.jsx';
import { ErrorState, PageLoading } from '../components/EmptyState.jsx';
import { RISK, formatDate, pct } from '../utils/format.js';

function Card({ icon: Icon, title, children, delay = 0 }) {
  return (
    <motion.section initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }} className="card p-5 sm:p-6">
      <div className="mb-4 flex items-center gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-soft-100 text-navy-800"><Icon size={18} /></span>
        <h3 className="text-base font-bold text-navy-900">{title}</h3>
      </div>
      {children}
    </motion.section>
  );
}

const Metric = ({ label, value }) => (
  <div className="rounded-xl bg-slate-50 p-4"><div className="text-xs font-medium text-slate-500">{label}</div><div className="mt-1 text-2xl font-bold text-navy-900 tabular-nums">{value}</div></div>
);

export default function Settings() {
  const toast = useToast();
  const settings = useApi(api.settings);
  const model = useApi(api.modelInfo);
  const [threshold, setThreshold] = useState(0.8);
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (settings.data) setThreshold(settings.data.confidence_threshold); }, [settings.data]);

  if (settings.loading && !settings.data) return <PageLoading />;
  if (settings.error) return <ErrorState message={settings.error} onRetry={settings.reload} />;
  const s = settings.data;
  const m = model.data;
  const dirty = Math.abs(threshold - s.confidence_threshold) > 0.0001;

  const save = async () => {
    setSaving(true);
    try { await api.updateSettings(threshold); toast(`Confidence threshold saved: ${(threshold * 100).toFixed(0)}%.`); settings.reload(); }
    catch (e) { toast(e.message, 'error'); } finally { setSaving(false); }
  };

  return (
    <div className="space-y-5">
      <PageHeader title="Settings" subtitle="Configure the review threshold and inspect the model powering the classifier." />

      <Card icon={SlidersHorizontal} title="Confidence threshold">
        <p className="text-sm text-slate-600">Documents classified with confidence <b>below</b> this value are sent to manual review. High-risk documents are always sent to review, regardless of confidence. Changes apply to documents analyzed from now on.</p>
        <div className="mt-5 flex flex-wrap items-center gap-5">
          <input type="range" aria-label="Confidence threshold" min={s.min_threshold * 100} max={s.max_threshold * 100} step={1} value={Math.round(threshold * 100)}
            onChange={(e) => setThreshold(Number(e.target.value) / 100)} className="h-2 min-w-[200px] flex-1 cursor-pointer accent-teal-600" />
          <div className="w-20 rounded-xl bg-navy-900 py-2 text-center text-lg font-bold text-white tabular-nums">{(threshold * 100).toFixed(0)}%</div>
          <button className="btn-primary" disabled={!dirty || saving} onClick={save}><Save size={16} /> {saving ? 'Saving…' : 'Save threshold'}</button>
        </div>
      </Card>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card icon={FileType2} title="Supported file types" delay={0.05}>
          <ul className="space-y-2">
            {s.supported_types.map((t) => (
              <li key={t.extension} className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3 text-sm">
                <span className="font-semibold text-navy-900">{t.extension.toUpperCase()}</span><span className="truncate pl-4 text-xs text-slate-500">{t.mime_types.join(', ')}</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-slate-500">Maximum file size: {s.max_file_mb} MB. Scanned (image-only) PDFs are not supported because no OCR is included.</p>
        </Card>

        <Card icon={Layers} title="Classification categories" delay={0.08}>
          <ul className="space-y-2">
            {s.categories.map((c) => (
              <li key={c.name} className={`flex items-start gap-3 rounded-xl border p-3.5 ${RISK[c.name].border} ${RISK[c.name].soft}`}>
                <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${RISK[c.name].dot}`} />
                <div><div className={`text-sm font-semibold ${RISK[c.name].text}`}>{RISK[c.name].label}</div><div className="text-xs text-slate-600">{c.description}</div></div>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <Card icon={Brain} title="Model information & evaluation" delay={0.1}>
        {model.loading && !m && <PageLoading />}
        {model.error && <ErrorState message={model.error} onRetry={model.reload} />}
        {m && m.risk && (
          <div className="space-y-6">
            <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              <AlertTriangle size={18} className="mt-0.5 shrink-0" />
              <div><b>Prototype model — not production-grade.</b> {m.dataset.nature} It contains {m.dataset.size} documents. {m.evaluation_note}</div>
            </div>
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Algorithm</dt><dd className="mt-1 text-slate-700">{m.algorithm}</dd></div>
              <div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Confidence measure</dt><dd className="mt-1 text-slate-700">{m.confidence_measure}</dd></div>
              <div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Trained</dt><dd className="mt-1 text-slate-700">{formatDate(m.trained_at, true)}</dd></div>
              <div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Dataset classes</dt><dd className="mt-1 text-slate-700">{Object.entries(m.dataset.class_counts).map(([k, v]) => `${k}: ${v}`).join(' · ')}</dd></div>
            </dl>

            <div>
              <h4 className="mb-2 text-sm font-semibold text-navy-900">Risk model — hold-out evaluation ({m.risk.test_size} test documents)</h4>
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
                <Metric label="Accuracy" value={pct(m.risk.accuracy)} />
                <Metric label="Precision (weighted)" value={pct(m.risk.precision_weighted)} />
                <Metric label="Recall (weighted)" value={pct(m.risk.recall_weighted)} />
                <Metric label="F1-score (weighted)" value={pct(m.risk.f1_weighted)} />
                <Metric label="5-fold CV accuracy" value={`${pct(m.risk.cv_accuracy_mean)} ±${(m.risk.cv_accuracy_std * 100).toFixed(1)}`} />
              </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <div>
                <h4 className="mb-2 text-sm font-semibold text-navy-900">Class-wise performance</h4>
                <div className="overflow-x-auto rounded-xl border border-slate-100">
                  <table className="w-full text-sm">
                    <thead><tr className="bg-slate-50"><th className="th">Class</th><th className="th">Precision</th><th className="th">Recall</th><th className="th">F1</th><th className="th">Support</th></tr></thead>
                    <tbody>
                      {m.risk.per_class.map((c) => (
                        <tr key={c.label} className="border-t border-slate-100">
                          <td className="td font-semibold">{RISK[c.label].label}</td><td className="td tabular-nums">{pct(c.precision)}</td>
                          <td className="td tabular-nums">{pct(c.recall)}</td><td className="td tabular-nums">{pct(c.f1)}</td><td className="td tabular-nums">{c.support}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <div>
                <h4 className="mb-2 text-sm font-semibold text-navy-900">Confusion matrix <span className="font-normal text-slate-500">(rows = actual, columns = predicted)</span></h4>
                <div className="grid grid-cols-4 gap-1.5 text-center text-sm">
                  <div />
                  {m.risk.labels.map((l) => <div key={l} className="py-1 text-xs font-semibold text-slate-500">{l}</div>)}
                  {m.risk.confusion_matrix.map((row, i) => (
                    <div key={i} className="contents">
                      <div className="flex items-center justify-end pr-2 text-xs font-semibold text-slate-500">{m.risk.labels[i]}</div>
                      {row.map((v, j) => (
                        <div key={j} className={`rounded-lg py-3 font-bold tabular-nums ${i === j ? 'bg-teal-600 text-white' : v > 0 ? 'bg-red-100 text-red-700' : 'bg-slate-50 text-slate-400'}`}>{v}</div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <p className="flex items-start gap-2 text-xs text-slate-500"><Info size={14} className="mt-0.5 shrink-0" /> Document type detection (used for the dashboard category chart) is a second model on the same dataset with {pct(m.category.accuracy)} hold-out accuracy.</p>
          </div>
        )}
      </Card>

      <Card icon={Info} title="Application information" delay={0.12}>
        <dl className="grid gap-4 text-sm sm:grid-cols-3">
          <div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Name</dt><dd className="mt-1 font-medium text-navy-900">{s.app.name}</dd></div>
          <div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Version</dt><dd className="mt-1 font-medium text-navy-900">{s.app.version}</dd></div>
          <div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Description</dt><dd className="mt-1 text-slate-700">{s.app.description}</dd></div>
        </dl>
        <p className="mt-4 text-xs text-slate-500">AI results are preliminary and do not replace professional compliance or legal review.</p>
      </Card>
    </div>
  );
}
