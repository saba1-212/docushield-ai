export function LogoMark({ size = 36 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <rect width="32" height="32" rx="9" fill="#14B8A6" fillOpacity="0.16" />
      <path d="M16 5l8 3v6.5c0 5-3.4 9.2-8 10.5-4.6-1.3-8-5.5-8-10.5V8l8-3z" fill="#14B8A6" />
      <path d="M12.5 15.5l2.5 2.5 4.5-5" stroke="#0B1F3A" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function Logo({ collapsed = false, dark = true }) {
  return (
    <div className="flex items-center gap-3 overflow-hidden">
      <LogoMark />
      {!collapsed && (
        <div className="leading-tight whitespace-nowrap">
          <div className={`text-[17px] font-bold tracking-tight ${dark ? 'text-white' : 'text-navy-900'}`}>
            DocuShield <span className="text-teal-400">AI</span>
          </div>
          <div className={`text-[11px] ${dark ? 'text-slate-400' : 'text-slate-500'}`}>Risk &amp; Compliance</div>
        </div>
      )}
    </div>
  );
}
