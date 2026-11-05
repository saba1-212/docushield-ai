import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Bell, ChevronDown, LogOut, Menu, PanelLeftClose, PanelLeftOpen, Search } from 'lucide-react';
import { api } from '../services/api.js';
import { RiskBadge } from '../components/RiskBadge.jsx';
import { initials, useProfile } from '../hooks/useProfile.jsx';

function useClickAway(ref, onAway) {
  useEffect(() => {
    const h = (e) => ref.current && !ref.current.contains(e.target) && onAway();
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [ref, onAway]);
}

function Dropdown({ children, className = '' }) {
  return (
    <motion.div initial={{ opacity: 0, y: -6, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.14 }}
      className={`absolute right-0 top-full z-40 mt-2 rounded-2xl border border-slate-200 bg-white shadow-lift ${className}`}>
      {children}
    </motion.div>
  );
}

export default function Topbar({ title, isDesktop, collapsed, onToggle, pending }) {
  const navigate = useNavigate();
  const { profile, signOut } = useProfile();
  const [q, setQ] = useState('');
  const [bellOpen, setBellOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [queue, setQueue] = useState(null);
  const searchRef = useRef(null);
  const bellRef = useRef(null);
  const menuRef = useRef(null);
  useClickAway(bellRef, () => setBellOpen(false));
  useClickAway(menuRef, () => setMenuOpen(false));

  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); searchRef.current?.focus(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (!bellOpen) return;
    api.reviews('Pending').then((r) => setQueue(r.items.slice(0, 5))).catch(() => setQueue([]));
  }, [bellOpen]);

  const submit = (e) => {
    e.preventDefault();
    navigate(q.trim() ? `/history?q=${encodeURIComponent(q.trim())}` : '/history');
  };

  const Toggle = isDesktop ? (collapsed ? PanelLeftOpen : PanelLeftClose) : Menu;

  return (
    <header className="sticky top-0 z-30 flex h-[72px] items-center gap-3 border-b border-slate-200/80 bg-white/90 px-4 backdrop-blur sm:px-6">
      <button onClick={onToggle} className="rounded-xl p-2 text-slate-500 hover:bg-slate-100" aria-label={isDesktop ? 'Toggle sidebar' : 'Open menu'}>
        <Toggle size={20} />
      </button>
      <h2 className="hidden shrink-0 text-lg font-bold text-navy-900 sm:block">{title}</h2>

      <form onSubmit={submit} role="search" className="relative mx-auto w-full max-w-md">
        <Search size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input ref={searchRef} value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search documents by name"
          placeholder="Search documents by name…" className="input !rounded-full !bg-slate-50 !pl-10 !pr-14" />
        <kbd className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 rounded-md border border-slate-200 bg-white px-1.5 py-0.5 text-[11px] font-medium text-slate-400 md:block">⌘K</kbd>
      </form>

      <div ref={bellRef} className="relative">
        <button onClick={() => { setBellOpen((o) => !o); setMenuOpen(false); }} className="relative rounded-xl p-2.5 text-slate-500 hover:bg-slate-100" aria-label="Notifications">
          <Bell size={20} />
          {pending > 0 && <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-bold text-white">{pending}</span>}
        </button>
        <AnimatePresence>
          {bellOpen && (
            <Dropdown className="w-[320px] max-w-[88vw]">
              <div className="border-b border-slate-100 px-4 py-3 text-sm font-semibold text-navy-900">Notifications</div>
              <div className="max-h-72 overflow-y-auto p-2">
                {queue === null && <p className="p-4 text-sm text-slate-500">Loading…</p>}
                {queue && queue.length === 0 && <p className="p-4 text-sm text-slate-500">You're all caught up. No documents are waiting for review.</p>}
                {queue && queue.map((d) => (
                  <button key={d.id} onClick={() => { setBellOpen(false); navigate(`/documents/${d.id}?review=1`); }} className="flex w-full items-start gap-3 rounded-xl p-3 text-left hover:bg-slate-50">
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium text-navy-900">{d.name}</div>
                      <div className="mt-0.5 truncate text-xs text-slate-500">{d.review_reason}</div>
                    </div>
                    <RiskBadge risk={d.ai_risk} />
                  </button>
                ))}
              </div>
              <button onClick={() => { setBellOpen(false); navigate('/review'); }} className="w-full border-t border-slate-100 px-4 py-3 text-sm font-semibold text-teal-700 hover:bg-slate-50">Open manual review queue</button>
            </Dropdown>
          )}
        </AnimatePresence>
      </div>

      <div ref={menuRef} className="relative">
        <button onClick={() => { setMenuOpen((o) => !o); setBellOpen(false); }} className="flex items-center gap-2 rounded-full p-1 pr-2 hover:bg-slate-100" aria-label="Profile menu">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-navy-900 text-sm font-bold text-white">{initials(profile?.name)}</span>
          <ChevronDown size={15} className="text-slate-400" />
        </button>
        <AnimatePresence>
          {menuOpen && (
            <Dropdown className="w-56">
              <div className="border-b border-slate-100 px-4 py-3">
                <div className="truncate text-sm font-semibold text-navy-900">{profile?.name}</div>
                <div className="text-xs text-slate-500">Local profile (no authentication)</div>
              </div>
              <button onClick={signOut} className="flex w-full items-center gap-2 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50"><LogOut size={16} /> Log out</button>
            </Dropdown>
          )}
        </AnimatePresence>
      </div>
    </header>
  );
}
