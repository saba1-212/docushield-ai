import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import Sidebar from './Sidebar.jsx';
import Topbar from './Topbar.jsx';
import { useMediaQuery } from '../hooks/useApi.js';
import { api } from '../services/api.js';

const TITLES = [
  [/^\/$/, 'Dashboard'],
  [/^\/analyze/, 'Analyze Document'],
  [/^\/history/, 'Document History'],
  [/^\/review/, 'Manual Review'],
  [/^\/documents\//, 'Classification Result'],
  [/^\/settings/, 'Settings'],
];

export default function AppLayout() {
  const location = useLocation();
  const isDesktop = useMediaQuery('(min-width: 1024px)');
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('ds_sidebar') === '1');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [pending, setPending] = useState(0);

  const title = (TITLES.find(([rx]) => rx.test(location.pathname)) || [null, 'DocuShield AI'])[1];

  // Keep the pending-review badge in sync after every navigation (reviews/analyses change it).
  useEffect(() => {
    api.stats().then((s) => setPending(s.manual_review_pending)).catch(() => {});
    setMobileOpen(false);
  }, [location.pathname]);

  useEffect(() => { document.title = `${title} · DocuShield AI`; }, [title]);

  const toggle = () => {
    if (isDesktop) {
      setCollapsed((c) => { localStorage.setItem('ds_sidebar', c ? '0' : '1'); return !c; });
    } else setMobileOpen((o) => !o);
  };

  return (
    <div className="flex min-h-screen">
      {isDesktop && (
        <motion.aside initial={false} animate={{ width: collapsed ? 84 : 272 }} transition={{ type: 'spring', stiffness: 300, damping: 34 }}
          className="sticky top-0 z-20 h-screen shrink-0 overflow-hidden bg-navy-900 text-white">
          <Sidebar collapsed={collapsed} pending={pending} />
        </motion.aside>
      )}

      <AnimatePresence>
        {!isDesktop && mobileOpen && (
          <>
            <motion.div key="bd" className="fixed inset-0 z-40 bg-navy-950/50" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setMobileOpen(false)} />
            <motion.aside key="drawer" className="fixed inset-y-0 left-0 z-50 w-[272px] bg-navy-900 text-white" initial={{ x: -280 }} animate={{ x: 0 }} exit={{ x: -280 }} transition={{ type: 'spring', stiffness: 320, damping: 34 }}>
              <Sidebar collapsed={false} pending={pending} onNavigate={() => setMobileOpen(false)} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar title={title} isDesktop={isDesktop} collapsed={collapsed} onToggle={toggle} pending={pending} />
        <main className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <motion.div key={location.pathname} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22, ease: 'easeOut' }}>
            <Outlet />
          </motion.div>
        </main>
      </div>
    </div>
  );
}
