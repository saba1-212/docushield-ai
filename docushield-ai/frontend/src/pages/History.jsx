import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { History as HistoryIcon, Search, Trash2, X } from 'lucide-react';
import { api } from '../services/api.js';
import { useApi, useDebounced } from '../hooks/useApi.js';
import { useToast } from '../components/Toast.jsx';
import Modal from '../components/Modal.jsx';
import PageHeader from '../components/PageHeader.jsx';
import DocumentsTable from '../components/DocumentsTable.jsx';
import EmptyState, { ErrorState, PageLoading } from '../components/EmptyState.jsx';
import { daysAgoISO, todayISO } from '../utils/format.js';

const PAGE_SIZE = 15;

export default function History() {
  const navigate = useNavigate();
  const toast = useToast();
  const [params] = useSearchParams();
  const [q, setQ] = useState(params.get('q') || '');
  const [risk, setRisk] = useState(params.get('risk') || '');
  const [status, setStatus] = useState(params.get('review_status') || '');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [sort, setSort] = useState('newest');
  const [page, setPage] = useState(1);
  const [toDelete, setToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const dq = useDebounced(q);

  // The top-bar search and dashboard cards navigate here with URL parameters.
  useEffect(() => {
    setQ(params.get('q') || ''); setRisk(params.get('risk') || ''); setStatus(params.get('review_status') || ''); setPage(1);
  }, [params]);
  useEffect(() => setPage(1), [dq, risk, status, from, to, sort]);

  const { data, loading, error, reload } = useApi(
    () => api.listDocuments({ q: dq, risk, review_status: status, date_from: from, date_to: to, sort, page, page_size: PAGE_SIZE }),
    [dq, risk, status, from, to, sort, page]
  );

  const filtersActive = q || risk || status || from || to;
  const clear = () => { setQ(''); setRisk(''); setStatus(''); setFrom(''); setTo(''); setSort('newest'); };
  const pages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;

  const confirmDelete = async () => {
    setDeleting(true);
    try {
      await api.deleteDocument(toDelete.id);
      toast(`“${toDelete.name}” was deleted.`);
      setToDelete(null);
      reload();
    } catch (e) { toast(e.message, 'error'); } finally { setDeleting(false); }
  };

  return (
    <div>
      <PageHeader title="Document History" subtitle="Every analyzed document, stored in the database. Search, filter, and open any result." />

      <div className="card mb-4 p-4">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
          <div className="relative xl:col-span-2">
            <label className="label" htmlFor="hq">Search</label>
            <Search size={16} className="pointer-events-none absolute bottom-3 left-3.5 text-slate-400" />
            <input id="hq" className="input !pl-10" placeholder="Document name…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="hr">Risk</label>
            <select id="hr" className="input" value={risk} onChange={(e) => setRisk(e.target.value)}>
              <option value="">All risks</option><option value="Low">Low</option><option value="Medium">Medium</option><option value="High">High</option>
            </select>
          </div>
          <div>
            <label className="label" htmlFor="hs">Review status</label>
            <select id="hs" className="input" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">All statuses</option><option value="Not Required">Auto-Classified</option><option value="Pending">Pending Review</option><option value="Reviewed">Reviewed</option>
            </select>
          </div>
          <div>
            <label className="label" htmlFor="hd">Date</label>
            <select id="hd" className="input" value="" onChange={(e) => {
              const v = e.target.value;
              if (v === 'today') { setFrom(todayISO()); setTo(todayISO()); }
              else if (v) { setFrom(daysAgoISO(Number(v))); setTo(todayISO()); }
            }}>
              <option value="">{from || to ? `${from || '…'} → ${to || '…'}` : 'Any time'}</option>
              <option value="today">Today</option><option value="7">Last 7 days</option><option value="30">Last 30 days</option>
            </select>
          </div>
          <div>
            <label className="label" htmlFor="ho">Sort by upload date</label>
            <select id="ho" className="input" value={sort} onChange={(e) => setSort(e.target.value)}>
              <option value="newest">Newest first</option><option value="oldest">Oldest first</option>
            </select>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-end gap-3">
          <div><label className="label" htmlFor="df">From</label><input id="df" type="date" className="input !w-auto" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} /></div>
          <div><label className="label" htmlFor="dt">To</label><input id="dt" type="date" className="input !w-auto" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} /></div>
          {filtersActive && <button onClick={clear} className="btn-ghost"><X size={15} /> Clear filters</button>}
          <span className="ml-auto text-sm text-slate-500">{data ? `${data.total} document${data.total === 1 ? '' : 's'}` : ''}</span>
        </div>
      </div>

      <div className="card overflow-hidden">
        {loading && !data ? <PageLoading /> : error ? <ErrorState message={error} onRetry={reload} /> : data.items.length === 0 ? (
          <EmptyState icon={HistoryIcon} title={filtersActive ? 'No documents match these filters' : 'No documents analyzed yet'}
            text={filtersActive ? 'Try changing or clearing the filters.' : 'Analyzed documents will be listed here.'}
            action={filtersActive ? <button onClick={clear} className="btn-secondary">Clear filters</button> : <button onClick={() => navigate('/analyze')} className="btn-primary">Analyze a document</button>} />
        ) : (
          <>
            <DocumentsTable docs={data.items} onView={(d) => navigate(`/documents/${d.id}`)} onDelete={setToDelete} />
            {pages > 1 && (
              <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3">
                <span className="text-sm text-slate-500">Page {page} of {pages}</span>
                <div className="flex gap-2">
                  <button className="btn-secondary !py-1.5" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</button>
                  <button className="btn-secondary !py-1.5" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>Next</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <Modal open={!!toDelete} onClose={() => !deleting && setToDelete(null)} title="Delete this document?"
        footer={<><button className="btn-secondary" disabled={deleting} onClick={() => setToDelete(null)}>Cancel</button>
          <button className="btn-danger" disabled={deleting} onClick={confirmDelete}><Trash2 size={15} /> {deleting ? 'Deleting…' : 'Delete'}</button></>}>
        <p><b className="text-navy-900">{toDelete?.name}</b> and its analysis, review decision and stored file will be permanently removed. This cannot be undone.</p>
      </Modal>
    </div>
  );
}
