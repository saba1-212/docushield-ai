import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { RISK, formatShortDay } from '../utils/format.js';

const tooltipStyle = { borderRadius: 12, border: '1px solid #E2E8F0', boxShadow: '0 8px 24px rgba(11,31,58,0.12)', fontSize: 12 };

export function TrendChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
        <defs>
          {['low', 'medium', 'high'].map((k, i) => {
            const c = [RISK.Low, RISK.Medium, RISK.High][i].hex;
            return (
              <linearGradient key={k} id={`g-${k}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={c} stopOpacity={0.35} />
                <stop offset="100%" stopColor={c} stopOpacity={0.03} />
              </linearGradient>
            );
          })}
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#E8EDF3" vertical={false} />
        <XAxis dataKey="date" tickFormatter={formatShortDay} tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} interval="preserveStartEnd" minTickGap={24} />
        <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
        <Tooltip contentStyle={tooltipStyle} labelFormatter={formatShortDay} />
        <Area type="monotone" dataKey="low" name="Low" stackId="1" stroke={RISK.Low.hex} strokeWidth={2} fill="url(#g-low)" animationDuration={900} />
        <Area type="monotone" dataKey="medium" name="Medium" stackId="1" stroke={RISK.Medium.hex} strokeWidth={2} fill="url(#g-medium)" animationDuration={900} />
        <Area type="monotone" dataKey="high" name="High" stackId="1" stroke={RISK.High.hex} strokeWidth={2} fill="url(#g-high)" animationDuration={900} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function RiskDonut({ data, total }) {
  const colors = { Low: RISK.Low.hex, Medium: RISK.Medium.hex, High: RISK.High.hex };
  return (
    <div>
      <div className="relative mx-auto h-[190px] w-[190px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" innerRadius={62} outerRadius={88} paddingAngle={total ? 3 : 0} stroke="none" animationDuration={900}>
              {data.map((d) => <Cell key={d.name} fill={total ? colors[d.name] : '#E2E8F0'} />)}
            </Pie>
            <Tooltip contentStyle={tooltipStyle} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold text-navy-900">{total}</span>
          <span className="text-xs text-slate-500">documents</span>
        </div>
      </div>
      <div className="mt-4 space-y-3">
        {data.map((d) => {
          const share = total ? (d.value / total) * 100 : 0;
          return (
            <div key={d.name}>
              <div className="mb-1 flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 font-medium text-slate-700"><span className={`h-2.5 w-2.5 rounded-full ${RISK[d.name].dot}`} />{RISK[d.name].label}</span>
                <span className="tabular-nums text-slate-500">{d.value} · {share.toFixed(0)}%</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                <div className={`h-full rounded-full transition-all duration-700 ${RISK[d.name].bar}`} style={{ width: `${share}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function CategoryChart({ data }) {
  const palette = ['#0B1F3A', '#14B8A6', '#4A8BD6', '#6FA8E6', '#0F766E', '#A9CBF2'];
  return (
    <ResponsiveContainer width="100%" height={Math.max(200, data.length * 44)}>
      <BarChart data={data} layout="vertical" margin={{ top: 0, right: 16, left: 8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E8EDF3" horizontal={false} />
        <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
        <YAxis type="category" dataKey="name" width={150} tick={{ fontSize: 12, fill: '#475569' }} axisLine={false} tickLine={false} />
        <Tooltip contentStyle={tooltipStyle} cursor={{ fill: '#F1F5F9' }} />
        <Bar dataKey="count" name="Documents" radius={[0, 8, 8, 0]} barSize={18} animationDuration={900}>
          {data.map((d, i) => <Cell key={d.name} fill={palette[i % palette.length]} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
