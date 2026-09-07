import React, { useState, useEffect } from 'react';
import { Activity, ShieldCheck, Stethoscope, ChevronRight, Menu, X } from 'lucide-react';

export default function Navbar({ onOpenAuth, onNavigate }) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollTo = (id) => {
    setMobileOpen(false);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <header className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
      scrolled ? 'bg-slate-900/80 backdrop-blur-xl border-b border-slate-800/80 py-3.5 shadow-2xl' : 'bg-transparent py-5'
    }`}>
      <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => scrollTo('hero')}>
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-500 via-teal-400 to-emerald-500 flex items-center justify-center text-slate-950 font-black text-xl shadow-lg shadow-cyan-500/25">
            V+
          </div>
          <div>
            <span className="text-xl font-black font-heading tracking-tight text-white">
              VAIDY<span className="text-cyan-400">care</span><span className="text-teal-400">-AI</span>
            </span>
            <span className="block text-[9px] font-bold text-slate-400 tracking-widest uppercase">Smart OPD Ecosystem</span>
          </div>
        </div>

        {/* Desktop Nav Links */}
        <nav className="hidden md:flex items-center gap-8 text-sm font-semibold text-slate-300">
          <button onClick={() => scrollTo('features')} className="hover:text-cyan-400 transition-colors">Features</button>
          <button onClick={() => scrollTo('abha')} className="hover:text-cyan-400 transition-colors">ABHA Integration</button>
          <button onClick={() => scrollTo('workflow')} className="hover:text-cyan-400 transition-colors">Workflow</button>
          <button onClick={() => scrollTo('about')} className="hover:text-cyan-400 transition-colors">Architecture</button>
        </nav>

        {/* Action Buttons */}
        <div className="hidden md:flex items-center gap-3">
          <button
            onClick={() => onOpenAuth('PATIENT')}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-200 hover:text-white bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 transition-all"
          >
            Patient Kiosk
          </button>
          <button
            onClick={() => onOpenAuth('DOCTOR')}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-950 bg-gradient-to-r from-cyan-400 to-teal-400 hover:from-cyan-300 hover:to-teal-300 shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/40 transition-all flex items-center gap-1.5"
          >
            <Stethoscope className="w-3.5 h-3.5" />
            <span>Doctor Desk</span>
          </button>
        </div>

        {/* Mobile Hamburger */}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="md:hidden p-2 text-slate-300 hover:text-white"
        >
          {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="md:hidden bg-slate-900/95 backdrop-blur-2xl border-b border-slate-800 px-6 py-6 space-y-4">
          <button onClick={() => scrollTo('features')} className="block w-full text-left font-semibold text-slate-300 py-1">Features</button>
          <button onClick={() => scrollTo('abha')} className="block w-full text-left font-semibold text-slate-300 py-1">ABHA Integration</button>
          <button onClick={() => scrollTo('workflow')} className="block w-full text-left font-semibold text-slate-300 py-1">Workflow</button>
          <button onClick={() => scrollTo('about')} className="block w-full text-left font-semibold text-slate-300 py-1">Architecture</button>
          <div className="pt-4 border-t border-slate-800 grid grid-cols-2 gap-3">
            <button
              onClick={() => onOpenAuth('PATIENT')}
              className="w-full py-2.5 rounded-xl text-xs font-bold text-white bg-slate-800 border border-slate-700"
            >
              Patient Portal
            </button>
            <button
              onClick={() => onOpenAuth('DOCTOR')}
              className="w-full py-2.5 rounded-xl text-xs font-bold text-slate-950 bg-cyan-400"
            >
              Doctor Desk
            </button>
          </div>
        </div>
      )}
    </header>
  );
}