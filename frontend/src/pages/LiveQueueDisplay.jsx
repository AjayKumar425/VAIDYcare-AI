import React, { useState, useEffect } from 'react';
import { Activity, Clock, Volume2, ArrowRight } from 'lucide-react';
import { API_BASE } from '../utils/api';

export default function LiveQueueDisplay() {
  const [tokens, setTokens] = useState([
    { token_number: 'V-1001', room: 'OPD Room 1', risk: 'SEVERE', name: 'Ajay K.' },
    { token_number: 'V-1002', room: 'OPD Room 3', risk: 'MODERATE', name: 'Sunil R.' },
    { token_number: 'V-1003', room: 'OPD Room 2', risk: 'SAFE', name: 'Meena P.' }
  ]);
  const [time, setTime] = useState(new Date().toLocaleTimeString());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date().toLocaleTimeString()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6 sm:p-10 flex flex-col justify-between">
      {/* Queue Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-400 to-teal-400 flex items-center justify-center text-slate-950 font-black text-2xl shadow-lg">
            V+
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-black font-heading text-white">OPD LIVE WAITING QUEUE</h1>
            <span className="text-xs text-slate-400 font-bold uppercase tracking-widest">Real-Time Patient Calling Dashboard</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="px-4 py-2 bg-slate-900 border border-slate-800 rounded-2xl font-mono text-xl font-bold text-cyan-400 flex items-center gap-2">
            <Clock className="w-5 h-5 text-slate-400" />
            <span>{time}</span>
          </div>
        </div>
      </div>

      {/* Main Calling Board */}
      <div className="my-8 grid grid-cols-1 md:grid-cols-3 gap-6">
        {tokens.map((t, idx) => (
          <div
            key={idx}
            className={`p-8 rounded-3xl border-2 backdrop-blur-2xl shadow-2xl relative overflow-hidden flex flex-col justify-between transition-transform ${
              idx === 0
                ? 'bg-slate-900/90 border-cyan-400/80 ring-4 ring-cyan-500/20 scale-105'
                : 'bg-slate-900/60 border-slate-800'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-black uppercase tracking-wider px-3 py-1 rounded-full bg-slate-800 text-slate-300">
                  {idx === 0 ? '🔊 NOW CALLING' : 'NEXT IN LINE'}
                </span>
                <span className={`text-[11px] font-black px-3 py-1 rounded-full uppercase ${
                  t.risk === 'SEVERE' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' :
                  t.risk === 'MODERATE' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                  'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                }`}>
                  {t.risk} PRIORITY
                </span>
              </div>

              <div className="text-6xl font-black font-mono text-white tracking-tight my-2">
                {t.token_number}
              </div>
              <div className="text-sm font-semibold text-slate-400">Patient: {t.name}</div>
            </div>

            <div className="mt-8 pt-4 border-t border-slate-800 flex items-center justify-between">
              <span className="text-base font-bold text-cyan-400">{t.room}</span>
              <ArrowRight className="w-5 h-5 text-slate-400" />
            </div>
          </div>
        ))}
      </div>

      {/* Footer Ticker */}
      <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 text-center text-xs text-slate-400">
        Please present your digital or printed OPD QR slip at the assigned room counter when your token number appears.
      </div>
    </div>
  );
}