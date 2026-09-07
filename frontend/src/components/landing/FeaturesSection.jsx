import React from 'react';
import { Mic, FileSearch, HeartPulse, Layers, Sparkles, Cpu, Clock, Leaf } from 'lucide-react';

export default function FeaturesSection() {
  const features = [
    {
      icon: Mic,
      title: 'Speech-to-Text Clinical Intake',
      desc: 'Dictate chief complaints naturally in real-time. Automatically converts colloquial speech into structured clinical notes using Web Speech API.',
      tag: 'Zero-Typing'
    },
    {
      icon: FileSearch,
      title: 'Multimodal Vision Extraction',
      desc: 'Gemini AI extracts clinical conditions, normal/abnormal biomarkers, and handwritten doctor notes directly from uploaded image reports.',
      tag: 'Gemini Powered'
    },
    {
      icon: HeartPulse,
      title: '3-Tier Color-Coded Triage',
      desc: 'Intelligent triage categorization (🔴 RED Critical, 🟡 YELLOW Moderate, 🟢 GREEN Safe) prioritizes high-acuity cases instantly.',
      tag: 'Clinical Safety'
    },
    {
      icon: Leaf,
      title: 'Dual OPD & AYUSH Care Modes',
      desc: 'Switch between Modern Allopathic OPD and Traditional AYUSH modalities for holistic clinical symptom intake and diagnosis.',
      tag: 'Integrative'
    },
    {
      icon: Layers,
      title: 'QR-Coded Fast Queue Token',
      desc: 'Generates an appointment pass and scannable QR token on form submission to allow instant retrieval on the physician desk.',
      tag: 'Instant Access'
    },
    {
      icon: Cpu,
      title: 'Decentralized Hybrid Architecture',
      desc: 'Engineered with React Vite on Vercel Edge, Express gateway on Render, and MongoDB Atlas cloud document persistence.',
      tag: '24/7 Cloud Ready'
    }
  ];

  return (
    <section id="features" className="py-24 bg-slate-900 relative">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-xs font-extrabold text-cyan-400 uppercase tracking-widest">Engineered for Hospital Efficiency</span>
          <h2 className="text-3xl sm:text-5xl font-black font-heading text-white tracking-tight mt-2">
            Comprehensive Clinical Intelligence Stack
          </h2>
          <p className="mt-4 text-slate-400 text-sm sm:text-base">
            Everything your hospital OPD needs to eliminate paper forms, shorten diagnostic loops, and assist physicians with structured summaries.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feat, idx) => (
            <div
              key={idx}
              className="p-8 rounded-3xl bg-slate-950/60 border border-slate-800/80 hover:border-cyan-500/40 hover:-translate-y-1 transition-all duration-300 group shadow-xl"
            >
              <div className="flex items-center justify-between mb-6">
                <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 group-hover:scale-110 group-hover:bg-cyan-500 group-hover:text-slate-950 transition-all">
                  <feat.icon className="w-6 h-6" />
                </div>
                <span className="text-[10px] font-extrabold px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                  {feat.tag}
                </span>
              </div>
              <h3 className="text-lg font-bold text-white mb-2">{feat.title}</h3>
              <p className="text-xs text-slate-400 leading-relaxed">{feat.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}