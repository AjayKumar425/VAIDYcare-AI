import React, { useState, useEffect } from 'react';
import LandingPage from './pages/LandingPage';
import AuthPage from './pages/AuthPage';
import PatientKiosk from './pages/PatientKiosk';
import DoctorPortal from './pages/DoctorPortal';
import LiveQueueDisplay from './pages/LiveQueueDisplay';

export default function App() {
  const [user, setUser] = useState(null);
  const [authModalRole, setAuthModalRole] = useState(null); // 'PATIENT' | 'DOCTOR' | null
  const [authChecked, setAuthChecked] = useState(false);

  const isQueueScreen = window.location.search.includes('view=queue') || window.location.hash === '#queue';

if (isQueueScreen) {
  return <LiveQueueDisplay />;
}
  

  useEffect(() => {
    try {
      const storedUser = localStorage.getItem('medikiosk_user');
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }
    } catch (e) {
      console.error('Session parse error:', e);
      localStorage.removeItem('medikiosk_user');
    } finally {
      setAuthChecked(true);
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('medikiosk_token');
    localStorage.removeItem('medikiosk_user');
    setUser(null);
    setAuthModalRole(null);
  };

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-cyan-400 text-sm font-bold animate-pulse">
        Initializing VAIDYcare-AI Platform...
      </div>
    );
  }

  // 1. If logged in, route straight to dedicated workstation
  if (user) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100">
        <header className="bg-slate-900/90 border-b border-slate-800 px-6 py-4 flex items-center justify-between sticky top-0 z-40 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-400 to-teal-400 flex items-center justify-center text-slate-950 font-black text-lg shadow-md">
              V+
            </div>
            <div>
              <h1 className="text-base font-black font-heading text-white leading-tight">
                VAIDY<span className="text-cyan-400">care</span>-AI
              </h1>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                {user.role === 'DOCTOR' ? 'Physician Diagnostic Desk' : 'Patient Self-Kiosk'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <span className="text-xs font-black text-white block">{user.name || user.email}</span>
              <span className="text-[10px] text-cyan-400 font-bold uppercase">{user.role}</span>
            </div>
            <button
              onClick={handleLogout}
              className="px-3 py-1.5 rounded-xl border border-slate-700 text-xs font-bold text-slate-300 hover:bg-rose-500/10 hover:border-rose-500/30 hover:text-rose-400 transition-all"
            >
              Sign Out
            </button>
          </div>
        </header>

        <main className="max-w-6xl mx-auto p-4 sm:p-6">
          {user.role === 'DOCTOR' ? (
            <DoctorPortal doctor={user} />
          ) : (
            <PatientKiosk user={user} />
          )}
        </main>
      </div>
    );
  }

  // 2. If Auth Modal is requested from Landing Page
  if (authModalRole) {
    return (
      <div className="relative">
        <button
          onClick={() => setAuthModalRole(null)}
          className="fixed top-6 left-6 z-50 px-4 py-2 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-xs font-bold text-slate-300 border border-slate-700 flex items-center gap-2 backdrop-blur-md transition-all shadow-xl"
        >
          ← Back to Overview
        </button>
        <AuthPage
          defaultRole={authModalRole}
          onLoginSuccess={(loggedInUser) => setUser(loggedInUser)}
        />
      </div>
    );
  }

  // 3. Main Landing Page Experience
  return <LandingPage onOpenAuth={(role) => setAuthModalRole(role)} />;
}