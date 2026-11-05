import { NavLink } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ClipboardCheck, FileSearch, History, LayoutDashboard, LogOut, Settings } from 'lucide-react';
import Logo from '../components/Logo.jsx';
import { initials, useProfile } from '../hooks/useProfile.jsx';

export const NAV = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/analyze', label: 'Analyze Document', icon: FileSearch },
  { to: '/history', label: 'Document History', icon: History },
  { to: '/review', label: 'Manual Review', icon: ClipboardCheck, badge: true },
  { to: '/settings', label: 'Settings', icon: Settings },
];

export default function SidebarContent({ collapsed, pending, onNavigate }) {
  const { profile, signOut } = useProfile();
  return (
    <div className="flex h-full flex-col">
      <div className={`flex h-[72px] items-center border-b border-white/10 ${collapsed ? 'justify-center px-2' : 'px-5'}`}>
        <Logo collapsed={collapsed} />
      </div>

      <nav className="flex-1 space-y-1 px-3 py-5" aria-label="Main">
        {NAV.map(({ to, label, icon: Icon, end, badge }) => (
          <NavLink key={to} to={to} end={end} onClick={onNavigate} title={collapsed ? label : undefined}
            className={({ isActive }) =>
              `group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${collapsed ? 'justify-center' : ''} ${
                isActive ? 'bg-white/10 text-white' : 'text-slate-300 hover:bg-white/5 hover:text-white'}`}>
            {({ isActive }) => (
              <>
                {isActive && <motion.span layoutId="nav-indicator" className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-teal-400" />}
                <Icon size={19} className={isActive ? 'text-teal-300' : ''} />
                {!collapsed && <span className="flex-1 whitespace-nowrap">{label}</span>}
                {badge && pending > 0 && (
                  collapsed
                    ? <span className="absolute right-2 top-1.5 h-2.5 w-2.5 rounded-full bg-amber-400" />
                    : <span className="rounded-full bg-amber-400 px-2 py-0.5 text-[11px] font-bold text-navy-950">{pending}</span>
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-white/10 p-3">
        <div className={`flex items-center gap-3 rounded-xl bg-white/5 p-2.5 ${collapsed ? 'justify-center' : ''}`}>
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-teal-500 text-sm font-bold text-navy-950">{initials(profile?.name)}</div>
          {!collapsed && (
            <>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold text-white">{profile?.name}</div>
                <div className="text-xs text-slate-400">Local profile</div>
              </div>
              <button onClick={signOut} className="rounded-lg p-2 text-slate-400 hover:bg-white/10 hover:text-white" aria-label="Log out" title="Log out"><LogOut size={17} /></button>
            </>
          )}
        </div>
        {collapsed && (
          <button onClick={signOut} className="mt-2 flex w-full justify-center rounded-lg p-2 text-slate-400 hover:bg-white/10 hover:text-white" aria-label="Log out" title="Log out"><LogOut size={17} /></button>
        )}
      </div>
    </div>
  );
}
