import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, ShieldCheck } from 'lucide-react';
import Logo from '../components/Logo.jsx';
import { useProfile } from '../hooks/useProfile.jsx';

export default function Welcome() {
  const { signIn } = useProfile();
  const [name, setName] = useState('');

  return (
    <div className="flex min-h-screen items-center justify-center bg-navy-900 p-4">
      <motion.form initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}
        onSubmit={(e) => { e.preventDefault(); if (name.trim()) signIn(name); }}
        className="w-full max-w-md rounded-3xl bg-white p-8 shadow-lift">
        <div className="rounded-2xl bg-navy-900 p-4"><Logo /></div>
        <h1 className="mt-6 text-2xl font-bold text-navy-900">Welcome to DocuShield AI</h1>
        <p className="mt-2 text-sm text-slate-500">
          Classify business documents by risk, understand why, and send uncertain ones to a human reviewer.
        </p>
        <label htmlFor="name" className="label mt-6">Your name</label>
        <input id="name" autoFocus value={name} onChange={(e) => setName(e.target.value)} maxLength={40} placeholder="e.g. Priya Sharma" className="input" />
        <button type="submit" disabled={!name.trim()} className="btn-primary mt-5 w-full">Continue <ArrowRight size={16} /></button>
        <p className="mt-5 flex items-start gap-2 text-xs text-slate-400">
          <ShieldCheck size={14} className="mt-0.5 shrink-0" />
          This prototype has no accounts or passwords. Your name is stored only in this browser to personalise the interface.
        </p>
      </motion.form>
    </div>
  );
}
