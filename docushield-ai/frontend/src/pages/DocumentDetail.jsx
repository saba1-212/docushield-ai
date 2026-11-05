import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  AlertTriangle, ArrowLeft, Brain, CheckCircle2, ChevronDown, ClipboardCheck, FileText, Info, Layers, Loader2, Lightbulb, Save, ScrollText, ShieldAlert, Siren,
} from 'lucide-react';
import { api } from '../services/api.js';
import { useApi } from '../hooks/useApi.js';
import { useToast } from '../components/Toast.jsx';
import ConfidenceRing from '../components/ConfidenceRing.jsx';
import { RiskBadge, StatusBadge } from '../components/RiskBadge.jsx';
import { ErrorState, PageLoading } from '../components/EmptyState.jsx';
import { RISK, formatBytes, formatDate, pct } from '../utils/format.js';

const SEVERITY = { High: 'border-red-200 bg-red-50/70', Medium: 'border-orange-200 bg-orange-50/70', Low: 'border-green-200 bg-green-50/70' };

function Section({ icon: Icon, title, subtitle, children, tag, delay = 0 }) {
  return (
    <motion.section initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }} className="card p-5 sm:p-6">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-soft-100 text-navy-800"><Icon size={18} /></span>
          <div>
            <h3 className="text-base font-bold text-navy-900">{title}</h3>
            {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
          </div>
        </div>
        {tag}
      </div>
      {children}
    </motion.section>
  );
}

function ModelExplanation({ ex, risk }) {
  const max = Math.max(...(ex.supporting_terms || []).map((t) => t.contribution), 0.0001);
  return (
    <div>
      <p className="mb-3 text-sm text-slate-600">
        Terms below pushed the model toward <b className={RISK[risk].text}>{RISK[risk].label}</b>. Bar length shows each term's contribution
        (TF-IDF weight × model coefficient).
      </p>
      <div className="space-y-2">
        {ex.supporting_terms?.map((t, i) => (
          <div key={t.term} className="flex items-center gap-3 text-sm">
            <span className="w-40 shrink-0 truncate font-medium text-slate-700 sm:w-52" title={t.term}>{t.term}</span>
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
              <motion.div className={`h-full rounded-full ${RISK[risk].bar}`} initial={{ width: 0 }} animate={{ width: `${(t.contribution / max) * 100}%` }} transition={{ delay: 0.1 + i * 0.04, duration: 0.6 }} />
            </div>
            <span className="w-14 text-right text-xs tabular-nums text-slate-500">+{t.contribution.toFixed(3)}</span>
          </div>
        ))}
        {!ex.supporting_terms?.length && <p className="text-sm text-slate-500">No strongly supporting terms were found.</p>}
      </div>
      {ex.opposing_terms?.length > 0 && (
        <div className="mt-4">
          <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">Terms pulling away from this class</div>
          <div className="flex flex-wrap gap-2">
            {ex.opposing_terms.map((t) => <span key={t.term} className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">{t.term}</span>)}
          </div>
        </div>
      )}
      <div className="mt-4">
        <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">Most distinctive terms in this document</div>
        <div className="flex flex-wrap gap-2">
          {ex.important_terms?.map((t) => <span key={t.term} className="rounded-full bg-soft-100 px-2.5 py-1 text-xs font-medium text-navy-800">{t.term}</span>)}
        </div>
      </div>
    </div>
  );
}

function ReviewPanel({ doc, onSaved, panelRef }) {
  const toast = useToast();
  const [risk, setRisk] = useState(doc.final_risk || doc.ai_risk);
  const [comment, setComment] = useState(doc.review_comment || '');
  const [busy, setBusy] = useState(null);
  const reviewed = doc.review_status === 'Reviewed';
  const changed = risk !== doc.ai_risk;

  const save = async (markReviewed) => {
    if (markReviewed && changed && !comment.trim()) { toast('Add a comment explaining why you changed the AI risk category.', 'error'); return; }
    setBusy(markReviewed ? 'review' : 'draft');
    try {
      const res = await api.submitReview(doc.id, { final_risk: risk, comment, reviewed: markReviewed });
      onSaved(res);
      toast(markReviewed ? 'Review saved. Document marked as Reviewed.' : 'Progress saved. Document is still pending review.');
    } catch (e) { toast(e.message, 'error'); } finally { setBusy(null); }
  };

  return (
    <div ref={panelRef}>
      <Section icon={ClipboardCheck} title="Manual Review" subtitle="Record the final human decision. The original AI prediction is kept unchanged."
        tag={<StatusBadge status={doc.status} />} delay={0.1}>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Original AI prediction</div>
            <div className="mt-2 flex items-center gap-3"><RiskBadge risk={doc.ai_risk} size="lg" /><span className="text-sm text-slate-500">{pct(doc.confidence)} confidence</span></div>
            {doc.review_reason && <p className="mt-2 text-xs text-slate-500">Flagged: {doc.review_reason}</p>}
          </div>
          <div className="rounded-xl border border-slate-200 p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Final risk category</div>
            <div className="mt-2 grid grid-cols-3 gap-2" role="radiogroup" aria-label="Final risk category">
              {['Low', 'Medium', 'High'].map((r) => (
                <button key={r} role="radio" aria-checked={risk === r} onClick={() => setRisk(r)}
                  className={`rounded-lg border px-2 py-2 text-sm font-semibold transition ${risk === r ? `${RISK[r].soft} ${RISK[r].border} ${RISK[r].text} ring-2 ring-offset-1 ring-current` : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                  {r}
                </button>
              ))}
            </div>
            {changed && <p className="mt-2 flex items-center gap-1.5 text-xs text-amber-700"><Info size={13} /> You are changing the AI's category. A comment is required.</p>}
          </div>
        </div>
        <label htmlFor="rc" className="label mt-4">Review comments {changed && <span className="text-red-500">*</span>}</label>
        <textarea id="rc" rows={3} maxLength={2000} value={comment} onChange={(e) => setComment(e.target.value)} className="input resize-y" placeholder="Explain your decision, e.g. which clauses you verified…" />
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <span className="text-xs text-slate-400">{reviewed ? `Reviewed ${formatDate(doc.reviewed_at, true)}` : 'Not reviewed yet'} · {comment.length}/2000</span>
          <div className="flex gap-2">
            <button className="btn-secondary" disabled={!!busy} onClick={() => save(false)}>{busy === 'draft' ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Save progress</button>
            <button className="btn-primary" disabled={!!busy} onClick={() => save(true)}>{busy === 'review' ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />} {reviewed ? 'Update review' : 'Mark as Reviewed & Save'}</button>
          </div>
        </div>
      </Section>
    </div>
  );
}

export default function DocumentDetail() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { data, loading, error, reload } = useApi(() => api.getDocument(id), [id]);
  const [local, setLocal] = useState(null);
  const [showFull, setShowFull] = useState(false);
  const panelRef = useRef(null);

  useEffect(() => setLocal(null), [id]);
  const doc = local || data;

  useEffect(() => {
    if (doc && params.get('review') && panelRef.current) panelRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [!!doc]);

  const text = doc?.extracted_text || '';
  const preview = useMemo(() => (showFull ? text : text.slice(0, 1400)), [text, showFull]);

  if (loading && !doc) return <PageLoading />;
  if (error) return <ErrorState message={error} onRetry={error.includes('not found') ? () => navigate('/history') : reload} />;
  if (!doc) return null;

  const m = RISK[doc.ai_risk];
  const inQueue = doc.review_status !== 'Not Required';
  const policyAlerts = doc.policy_alerts || [];

  return (
    <div className="space-y-5">
      <div>
        <button onClick={() => navigate(-1)} className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-navy-900"><ArrowLeft size={16} /> Back</button>
        <h1 className="break-words text-2xl font-bold tracking-tight text-navy-900">{doc.name}</h1>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        {/* AI risk classification */}
        <motion.section initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className={`card overflow-hidden bg-gradient-to-br ${m.gradient} border-2 ${m.border} p-6 lg:col-span-2`}>
          <div className="flex flex-wrap items-center gap-6">
            <ConfidenceRing value={doc.confidence} color={m.hex} />
            <div className="min-w-[220px] flex-1">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">AI risk classification</div>
              <div className={`mt-1 text-4xl font-extrabold tracking-tight ${m.text}`}>{m.label}</div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <StatusBadge status={doc.status} />
                {doc.review_status === 'Reviewed' && doc.final_risk && (
                  <span className="text-sm text-slate-600">Human decision: <RiskBadge risk={doc.final_risk} /></span>
                )}
              </div>
              <p className="mt-3 text-xs text-slate-500">
                Confidence is the model's predicted-class probability (uncalibrated). Auto-classification threshold when analyzed: {pct(doc.threshold_used, 0)}.
              </p>
            </div>
          </div>
          {inQueue && doc.review_reason && (
            <div className="mt-5 flex items-start gap-2.5 rounded-xl bg-white/80 p-3.5 text-sm text-slate-700 ring-1 ring-slate-200">
              <Siren size={17} className="mt-0.5 shrink-0 text-amber-600" /> <span><b>Sent to manual review:</b> {doc.review_reason}.</span>
            </div>
          )}
          <div className="mt-5 grid grid-cols-3 gap-3">
            {['Low', 'Medium', 'High'].map((r) => (
              <div key={r} className="rounded-xl bg-white/80 p-3 ring-1 ring-slate-200">
                <div className="flex items-center justify-between text-xs font-medium text-slate-500"><span>{r}</span><span className="tabular-nums">{pct(doc.probabilities?.[r], 1)}</span></div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100"><motion.div className={`h-full ${RISK[r].bar}`} initial={{ width: 0 }} animate={{ width: `${(doc.probabilities?.[r] || 0) * 100}%` }} transition={{ duration: 0.8 }} /></div>
              </div>
            ))}
          </div>
        </motion.section>

        {/* Document information */}
        <Section icon={FileText} title="Document information" delay={0.05}>
          <dl className="space-y-3 text-sm">
            {[
              ['Name', doc.name], ['Uploaded', formatDate(doc.upload_date, true)], ['Document type', doc.category],
              ['File', `${doc.file_type.toUpperCase()} · ${formatBytes(doc.file_size)}`], ['Length', `${doc.word_count.toLocaleString()} words`],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4 border-b border-slate-50 pb-2 last:border-0"><dt className="text-slate-500">{k}</dt><dd className="min-w-0 break-words text-right font-medium text-navy-900">{v}</dd></div>
            ))}
          </dl>
        </Section>
      </div>

      {/* Recommended action */}
      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }} className={`card flex flex-wrap items-start gap-4 border ${m.border} ${m.soft} p-5`}>
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white ${m.text}`}><Lightbulb size={20} /></span>
        <div className="min-w-0 flex-1">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Recommended action</div>
          <p className="mt-0.5 font-semibold text-navy-900">{doc.recommended_action}</p>
          <p className="mt-1.5 text-xs text-slate-600">{doc.disclaimer}</p>
        </div>
      </motion.div>

      {inQueue && <ReviewPanel key={doc.review_status + doc.reviewed_at} doc={doc} onSaved={setLocal} panelRef={panelRef} />}

      {/* Explainable AI */}
      <div className="grid gap-5 lg:grid-cols-2">
        <Section icon={Brain} title="Model explanation" subtitle="Why the machine-learning model chose this class" delay={0.12}
          tag={<span className="rounded-full bg-navy-900 px-2.5 py-1 text-[11px] font-semibold text-white">From the ML model</span>}>
          <ModelExplanation ex={doc.model_explanation || {}} risk={doc.ai_risk} />
        </Section>

        <Section icon={ShieldAlert} title="Policy keyword alerts" subtitle="Fixed rules that scan the text. Independent of the model's prediction." delay={0.16}
          tag={<span className="rounded-full bg-teal-600 px-2.5 py-1 text-[11px] font-semibold text-white">Rule-based</span>}>
          {policyAlerts.length === 0 ? (
            <div className="flex items-center gap-2 rounded-xl bg-green-50 p-4 text-sm text-green-800"><CheckCircle2 size={18} /> No policy keyword alerts were triggered.</div>
          ) : (
            <div className="space-y-3">
              {policyAlerts.map((a) => (
                <div key={a.id} className={`rounded-xl border p-3.5 ${SEVERITY[a.severity]}`}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-2 text-sm font-semibold text-navy-900"><AlertTriangle size={15} className={a.severity === 'High' ? 'text-red-600' : 'text-orange-600'} />{a.label}</span>
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${a.severity === 'High' ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'}`}>{a.severity}</span>
                  </div>
                  <p className="mt-1 text-xs text-slate-600">{a.explanation}</p>
                  {a.matches.map((s, i) => <p key={i} className="mt-2 border-l-2 border-slate-300 pl-3 text-xs italic text-slate-600">“{s}”</p>)}
                </div>
              ))}
            </div>
          )}
        </Section>
      </div>

      {/* Similar documents */}
      <Section icon={Layers} title="Similar documents" subtitle="TF-IDF cosine similarity against previously analyzed documents" delay={0.2}>
        {doc.similar_documents?.length ? (
          <ul className="divide-y divide-slate-100">
            {doc.similar_documents.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center gap-3 py-3">
                <Link to={`/documents/${s.id}`} className="min-w-0 flex-1 truncate text-sm font-medium text-navy-900 hover:underline">{s.name}</Link>
                <span className="text-xs text-slate-500">{s.category}</span>
                <RiskBadge risk={s.risk} />
                <div className="flex w-36 items-center gap-2">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-teal-500" style={{ width: `${s.similarity * 100}%` }} /></div>
                  <span className="w-11 text-right text-xs font-semibold tabular-nums text-slate-700">{(s.similarity * 100).toFixed(0)}%</span>
                </div>
              </li>
            ))}
          </ul>
        ) : <p className="text-sm text-slate-500">No sufficiently similar documents yet. Analyze more documents to enable comparisons.</p>}
      </Section>

      {/* Extracted text */}
      <Section icon={ScrollText} title="Extracted text" subtitle={`${doc.word_count.toLocaleString()} words extracted. Shown as plain text; never executed.`} delay={0.24}>
        <pre className="max-h-[420px] overflow-auto whitespace-pre-wrap break-words rounded-xl bg-slate-50 p-4 font-sans text-sm leading-relaxed text-slate-700 scrollbar-thin">{preview}{!showFull && text.length > 1400 ? '…' : ''}</pre>
        {text.length > 1400 && (
          <button onClick={() => setShowFull((v) => !v)} className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-teal-700 hover:underline">
            <ChevronDown size={16} className={showFull ? 'rotate-180' : ''} /> {showFull ? 'Show less' : 'Show full text'}
          </button>
        )}
      </Section>
    </div>
  );
}
