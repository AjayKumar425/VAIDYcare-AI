import React from 'react';
import { Sparkles, ArrowRight, ShieldCheck, HeartPulse, FileText, QrCode } from 'lucide-react';

export default function HeroSection({ onOpenAuth }) {
  return (
    <section id="hero" className="relative pt-36 pb-20 md:pt-44 md:pb-32 overflow-hidden">
      {/* Dynamic Ambient Background Glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-tr from-cyan-500/20 via-teal-500/15 to-transparent rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/3 right-10 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-6 relative z-10 text-center">
        {/* Release Pill Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-bold mb-8 backdrop-blur-md animate-fade-in">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Next-Gen Multimodal Clinical Triage & OPD Automation</span>
        </div>

        {/* Title */}
        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black font-heading text-white tracking-tight max-w-4xl mx-auto leading-[1.1]">
          Decentralized Hospital Intake Powered by <span className="bg-gradient-to-r from-cyan-400 via-teal-300 to-emerald-400 bg-clip-text text-transparent">Gemini AI</span>
        </h1>

        <p className="mt-6 text-base sm:text-lg text-slate-300 max-w-2xl mx-auto font-normal leading-relaxed">
          Eliminate OPD queues with voice-driven symptom intake, automated X-ray/CBC lab parsing, color-coded triage stratification, and native Ayushman Bharat Digital Mission (ABHA) connectivity.
        </p>

        {/* Main Interactive Call-to-Actions */}
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <button
            onClick={() => onOpenAuth('PATIENT')}
            className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-gradient-to-r from-cyan-400 via-teal-400 to-emerald-400 text-slate-950 font-black text-sm shadow-xl shadow-cyan-500/25 hover:shadow-cyan-500/40 hover:scale-[1.02] transition-all flex items-center justify-center gap-2 group"
          >
            <span>Launch Patient Kiosk</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>

          <button
            onClick={() => onOpenAuth('DOCTOR')}
            className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-slate-900/90 text-white font-bold text-sm border border-slate-700/80 hover:bg-slate-800 hover:border-slate-600 transition-all flex items-center justify-center gap-2"
          >
            <HeartPulse className="w-4 h-4 text-cyan-400" />
            <span>Physician Diagnostic Desk</span>
          </button>
        </div>

        {/* Live Metrics Showcase */}
        <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto text-left">
          {[
            { label: 'OPD Queue Reduction', value: '< 90 Sec', icon: QrCode, desc: 'Digital intake & QR token slip' },
            { label: 'Multimodal AI Extraction', value: '100%', icon: FileText, desc: 'X-Rays, CBC & Rx handwriting' },
            { label: 'ABHA Health ID Ready', value: 'M1 / M2', icon: ShieldCheck, desc: 'ABDM standard compliance' },
            { label: 'Triage Risk Stratification', value: 'Real-Time', icon: HeartPulse, desc: '🔴 Red / 🟡 Yellow / 🟢 Green' },
          ].map((item, i) => (
            <div key={i} className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-xl hover:border-slate-700 transition-all group">
              <item.icon className="w-5 h-5 text-cyan-400 mb-3 group-hover:scale-110 transition-transform" />
              <div className="text-2xl font-black text-white">{item.value}</div>
              <div className="text-xs font-bold text-slate-200 mt-0.5">{item.label}</div>
              <div className="text-[11px] text-slate-400 mt-1">{item.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}