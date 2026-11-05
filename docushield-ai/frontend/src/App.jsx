import { Route, Routes } from 'react-router-dom';
import { ProfileProvider, useProfile } from './hooks/useProfile.jsx';
import { ToastProvider } from './components/Toast.jsx';
import AppLayout from './layouts/AppLayout.jsx';
import Welcome from './pages/Welcome.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Analyze from './pages/Analyze.jsx';
import DocumentDetail from './pages/DocumentDetail.jsx';
import History from './pages/History.jsx';
import ManualReview from './pages/ManualReview.jsx';
import Settings from './pages/Settings.jsx';

function Shell() {
  const { profile } = useProfile();
  if (!profile) return <Welcome />;
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<Dashboard />} />
        <Route path="analyze" element={<Analyze />} />
        <Route path="documents/:id" element={<DocumentDetail />} />
        <Route path="history" element={<History />} />
        <Route path="review" element={<ManualReview />} />
        <Route path="settings" element={<Settings />} />
        <Route path="*" element={<div className="card p-10 text-center text-slate-500">Page not found.</div>} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <ProfileProvider>
      <ToastProvider>
        <Shell />
      </ToastProvider>
    </ProfileProvider>
  );
}
