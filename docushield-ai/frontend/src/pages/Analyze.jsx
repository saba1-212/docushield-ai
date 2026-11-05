import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertCircle, Brain, CheckCircle2, ClipboardCheck, FileText, Loader2, ScanSearch, ShieldCheck, Trash2, UploadCloud, X } from 'lucide-react';
import { api } from '../services/api.js';
import { useToast } from '../components/Toast.jsx';
import PageHeader from '../components/PageHeader.jsx';
import { RiskBadge } from '../components/RiskBadge.jsx';
import { fileExt, formatBytes, pct } from '../utils/format.js';

const ALLOWED = ['pdf', 'docx', 'txt'];
const MAX_MB = 10;

/** Animated shield loader shown while the backend classifies a document. */
function AnalysisLoader() {
  return (
    <div className="flex items-center gap-3 text-sm text-teal-700">
      <span className="relative flex h-8 w-8 items-center justify-center">
        <motion.span className="absolute inset-0 rounded-full bg-teal-400/30" animate={{ scale: [1, 1.5, 1], opacity: [0.7, 0, 0.7] }} transition={{ duration: 1.4, repeat: Infinity }} />
        <ShieldCheck size={18} className="relative" />
      </span>
      <span className="font-medium">Analyzing — preprocessing text, classifying risk, building explanations…</span>
    </div>
  );
}

export default function Analyze() {
  const navigate = useNavigate();
  const toast = useToast();
  const inputRef = useRef(null);
  const [items, setItems] = useState([]);
  const [dragging, setDragging] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [maxMb, setMaxMb] = useState(MAX_MB);
  const itemsRef = useRef(items);
  itemsRef.current = items;

  useEffect(() => { api.settings().then((s) => setMaxMb(s.max_file_mb)).catch(() => {}); }, []);

  const patch = (key, changes) => setItems((list) => list.map((it) => (it.key === key ? { ...it, ...changes } : it)));

  const startUpload = useCallback(async (key, file) => {
    try {
      const res = await api.uploadDocument(file, (p) => patch(key, { progress: p }));
      patch(key, { status: 'uploaded', progress: 100, docId: res.id, words: res.word_count, preview: res.text_preview });
    } catch (e) {
      patch(key, { status: 'error', error: e.message });
    }
  }, []);

  const addFiles = useCallback((fileList) => {
    const next = [];
    Array.from(fileList).forEach((file) => {
      const key = `${file.name}-${file.size}-${Math.random().toString(36).slice(2, 7)}`;
      const ext = fileExt(file.name);
      let error = null;
      if (!ALLOWED.includes(ext)) error = `Unsupported file type (.${ext || '?'}). Use PDF, DOCX or TXT.`;
      else if (file.size > maxMb * 1024 * 1024) error = `File is larger than ${maxMb} MB.`;
      else if (file.size === 0) error = 'File is empty.';
      next.push({ key, file, ext, status: error ? 'error' : 'uploading', progress: 0, error });
      if (!error) startUpload(key, file);
    });
    setItems((l) => [...l, ...next]);
  }, [maxMb, startUpload]);

  const remove = async (it) => {
    if (it.docId && it.status !== 'done') { try { await api.deleteDocument(it.docId); } catch { /* already gone */ } }
    setItems((l) => l.filter((x) => x.key !== it.key));
  };

  const analyzeAll = async () => {
    const targets = itemsRef.current.filter((i) => i.status === 'uploaded');
    if (!targets.length) return;
    setAnalyzing(true);
    targets.forEach((t) => patch(t.key, { status: 'analyzing' }));
    let lastOk = null;
    let okCount = 0;
    for (const t of targets) {
      try {
        const res = await api.analyze(t.docId);
        patch(t.key, { status: 'done', result: res });
        lastOk = res; okCount += 1;
      } catch (e) {
        patch(t.key, { status: 'error', error: e.message });
      }
    }
    setAnalyzing(false);
    if (okCount === 1 && itemsRef.current.length === 1) navigate(`/documents/${lastOk.id}`);
    else if (okCount) toast(`${okCount} document${okCount > 1 ? 's' : ''} analyzed.`);
  };

  const ready = items.filter((i) => i.status === 'uploaded').length;
  const busy = items.some((i) => i.status === 'uploading' || i.status === 'analyzing');

  return (
    <div>
      <PageHeader title="Analyze Document" subtitle="Upload documents to extract text, classify risk, and see why the AI decided what it did." />

      <div
        role="button" tabIndex={0} aria-label="Upload documents: drop files here or press Enter to browse"
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); addFiles(e.dataTransfer.files); }}
        className={`cursor-pointer rounded-3xl border-2 border-dashed px-6 py-12 text-center transition-all ${dragging ? 'scale-[1.01] border-teal-500 bg-teal-50' : 'border-soft-300 bg-soft-50 hover:border-teal-400 hover:bg-soft-100/60'}`}
      >
        <input ref={inputRef} type="file" multiple hidden accept=".pdf,.docx,.txt" onChange={(e) => { addFiles(e.target.files); e.target.value = ''; }} />
        <motion.div animate={{ y: dragging ? -4 : 0 }} className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-navy-900 text-white shadow-lift">
          <UploadCloud size={28} />
        </motion.div>
        <h2 className="mt-4 text-xl font-bold text-navy-900">{dragging ? 'Release to upload' : 'Drop files here'}</h2>
        <p className="mt-1 text-sm text-slate-600">Get a risk classification, confidence score, and an explanation for every document.</p>
        <p className="mt-3 text-xs text-slate-500">Or click to browse</p>
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2 text-xs">
          <span className="text-slate-500">Supported formats:</span>
          {['PDF', 'DOCX', 'TXT'].map((f) => <span key={f} className="rounded-full bg-navy-900 px-3 py-1 font-semibold text-white">{f}</span>)}
          <span className="text-slate-500">· up to {maxMb} MB each</span>
        </div>
      </div>

      <AnimatePresence>
        {items.length > 0 && (
          <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="card mt-6 p-2 sm:p-3">
            <ul className="divide-y divide-slate-100">
              <AnimatePresence initial={false}>
                {items.map((it) => (
                  <motion.li key={it.key} layout initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                    <div className="flex items-start gap-3 p-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-soft-100 text-navy-800"><FileText size={19} /></span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5">
                          <span className="max-w-full truncate text-sm font-semibold text-navy-900">{it.file.name}</span>
                          <span className="text-xs text-slate-500">{formatBytes(it.file.size)} · {it.ext ? it.ext.toUpperCase() : 'unknown'}</span>
                        </div>

                        {it.status === 'uploading' && (
                          <div className="mt-2">
                            <div className="h-1.5 overflow-hidden rounded-full bg-slate-100"><motion.div className="h-full rounded-full bg-teal-500" animate={{ width: `${it.progress}%` }} /></div>
                            <div className="mt-1 text-xs text-slate-500">Uploading &amp; extracting text… {it.progress}%</div>
                          </div>
                        )}
                        {it.status === 'uploaded' && (
                          <div className="mt-1.5">
                            <div className="flex items-center gap-1.5 text-xs font-medium text-teal-700"><CheckCircle2 size={14} /> Text extracted · {it.words?.toLocaleString()} words · ready to analyze</div>
                            <p className="mt-1.5 line-clamp-2 rounded-lg bg-slate-50 p-2.5 text-xs italic text-slate-500">“{it.preview}…”</p>
                          </div>
                        )}
                        {it.status === 'analyzing' && <div className="mt-2"><AnalysisLoader /></div>}
                        {it.status === 'done' && (
                          <div className="mt-2 flex flex-wrap items-center gap-3">
                            <RiskBadge risk={it.result.ai_risk} />
                            <span className="text-xs text-slate-600">Confidence {pct(it.result.confidence)}</span>
                            <span className="text-xs text-slate-500">{it.result.review_status === 'Pending' ? '→ sent to manual review' : 'auto-classified'}</span>
                            <Link to={`/documents/${it.result.id}`} className="text-xs font-semibold text-teal-700 hover:underline">View result</Link>
                          </div>
                        )}
                        {it.status === 'error' && (
                          <div className="mt-1.5 flex items-start gap-1.5 text-xs font-medium text-red-600"><AlertCircle size={14} className="mt-px shrink-0" /> {it.error}</div>
                        )}
                      </div>
                      {it.status !== 'analyzing' && it.status !== 'done' && (
                        <button onClick={() => remove(it)} className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600" aria-label={`Remove ${it.file.name}`}><Trash2 size={16} /></button>
                      )}
                      {it.status === 'done' && (
                        <button onClick={() => setItems((l) => l.filter((x) => x.key !== it.key))} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100" aria-label="Dismiss"><X size={16} /></button>
                      )}
                    </div>
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 p-3">
              <span className="text-sm text-slate-500">{ready} ready to analyze</span>
              <button className="btn-primary" disabled={!ready || busy} onClick={analyzeAll}>
                {analyzing ? <><Loader2 size={16} className="animate-spin" /> Analyzing…</> : <><ScanSearch size={16} /> Analyze {ready > 1 ? `${ready} documents` : 'document'}</>}
              </button>
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      <h3 className="mb-3 mt-10 text-center text-xs font-bold uppercase tracking-[0.14em] text-slate-500">What happens to your documents</h3>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {[
          { icon: ScanSearch, tone: 'bg-soft-100 text-navy-800', t: 'Extraction & preprocessing', d: 'Text is read from PDF, DOCX or TXT, cleaned and normalised. Scanned PDFs without a text layer are rejected (no OCR).' },
          { icon: Brain, tone: 'bg-purple-50 text-purple-600', t: 'Trained AI classifier', d: 'TF-IDF + Logistic Regression assigns Low, Medium or High risk with its real model probability as confidence.' },
          { icon: ClipboardCheck, tone: 'bg-teal-50 text-teal-600', t: 'Explain & review', d: 'See the terms that drove the prediction. High-risk and low-confidence documents go to a human reviewer.' },
        ].map(({ icon: Icon, tone, t, d }, i) => (
          <motion.div key={t} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.07 }} className="card flex gap-4 p-5">
            <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${tone}`}><Icon size={20} /></span>
            <div><div className="text-sm font-semibold text-navy-900">{t}</div><p className="mt-1 text-xs leading-relaxed text-slate-500">{d}</p></div>
          </motion.div>
        ))}
      </div>
      <p className="mt-6 text-center text-xs text-slate-400">Prototype model trained on a small synthetic demonstration dataset. AI results are preliminary and do not replace professional compliance review.</p>
    </div>
  );
}
