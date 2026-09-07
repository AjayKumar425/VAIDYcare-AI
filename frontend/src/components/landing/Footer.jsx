import React from 'react';
import { Heart, Activity } from 'lucide-react';

export default function Footer({ onOpenAuth }) {
  return (
    <footer className="bg-slate-950 border-t border-slate-800/80 py-12 text-slate-400 text-xs">
      <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-500 to-teal-400 flex items-center justify-center text-slate-950 font-black text-sm">
            V+
          </div>
          <div>
            <span className="font-bold text-white text-sm">VAIDYcare-AI</span>
            <p className="text-[10px] text-slate-500">Autonomous Clinical Intake & OPD Triage System</p>
          </div>
        </div>

        <div className="flex items-center gap-6 text-slate-400">
          <button onClick={() => onOpenAuth('PATIENT')} className="hover:text-white transition-colors">Patient Kiosk</button>
          <button onClick={() => onOpenAuth('DOCTOR')} className="hover:text-white transition-colors">Doctor Desk</button>
          <a href="https://vaidycare-ai.onrender.com/health" target="_blank" rel="noreferrer" className="hover:text-cyan-400 transition-colors">API Status</a>
        </div>

        <div className="text-[11px] text-slate-500 flex items-center gap-1">
          Built with precision for modern healthcare infrastructure.
        </div>
      </div>
    </footer>
  );
}