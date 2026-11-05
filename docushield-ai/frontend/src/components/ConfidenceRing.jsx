import { useEffect } from 'react';
import { animate, motion, useMotionValue, useTransform } from 'framer-motion';

/** Circular confidence indicator. `value` is 0..1 and is the model's real predicted-class probability. */
export default function ConfidenceRing({ value = 0, color = '#14B8A6', size = 150, stroke = 12 }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const mv = useMotionValue(0);
  const label = useTransform(mv, (v) => `${v.toFixed(1)}%`);

  useEffect(() => {
    const c = animate(mv, value * 100, { duration: 1.1, ease: 'easeOut' });
    return () => c.stop();
  }, [value, mv]);

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }} role="img" aria-label={`Model confidence ${(value * 100).toFixed(1)} percent`}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="#E2E8F0" strokeWidth={stroke} fill="none" />
        <motion.circle
          cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth={stroke} fill="none" strokeLinecap="round"
          strokeDasharray={circ}
          initial={{ strokeDashoffset: circ }}
          animate={{ strokeDashoffset: circ * (1 - value) }}
          transition={{ duration: 1.1, ease: 'easeOut' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span className="text-2xl font-bold text-navy-900 tabular-nums">{label}</motion.span>
        <span className="text-[11px] font-medium uppercase tracking-wide text-slate-500">Confidence</span>
      </div>
    </div>
  );
}
