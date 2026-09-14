import React, { useState, useEffect } from 'react';
import PatientKiosk from './pages/PatientKiosk';
import DoctorPortal from './pages/DoctorPortal';
import AuthPage from './pages/AuthPage';
import { useLanguage } from './context/LanguageContext';

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [highContrast, setHighContrast] = useState(false);
  const { lang, setLang, t, LANGUAGES } = useLanguage();

  useEffect(() => {
    const savedUser = localStorage.getItem('medikiosk_user');
    if (savedUser) {
      try {
        setCurrentUser(JSON.parse(savedUser));
      } catch (e) {
        localStorage.removeItem('medikiosk_user');
      }
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('medikiosk_token');
    localStorage.removeItem('medikiosk_user');
    setCurrentUser(null);
  };

  if (!currentUser) {
    return <AuthPage onLoginSuccess={(user) => setCurrentUser(user)} />;
  }

  return (
    <div className={`min-h-screen flex flex-col ${highContrast ? 'bg-slate-900 text-white accessibility-mode' : 'bg-slate-50 text-slate-900'}`}>
      {/* Top Navbar with VAIDYcare-AI Branding */}
      <header className="sticky top-0 z-50 bg-white/85 backdrop-blur-md border-b border-slate-200/80 shadow-sm transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-clinical-600 to-brand-500 flex items-center justify-center shadow-md shadow-clinical-500/20 text-white font-black font-heading text-xl tracking-wider">
              V+
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-black font-heading tracking-tight bg-gradient-to-r from-slate-900 via-clinical-900 to-clinical-700 bg-clip-text text-transparent">
                  VAIDY<span className="text-clinical-600">care</span><span className="text-brand-600">-AI</span>
                </span>
                <span className="text-[10px] uppercase font-extrabold tracking-widest px-2.5 py-0.5 rounded-full bg-clinical-100 text-clinical-700 border border-clinical-200">
                  {currentUser.role === 'PATIENT' ? t('auth.patientKiosk') : t('auth.doctorDesk')}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium">{t('app.subtitle')}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            <div className="hidden sm:flex flex-col text-right">
              <span className="text-xs font-bold text-slate-700">{currentUser.name}</span>
              <span className="text-[11px] text-slate-400">{currentUser.email}</span>
            </div>
            
            <select 
              value={lang} 
              onChange={(e) => setLang(e.target.value)}
              className="bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl px-2 py-1.5 outline-none hover:bg-slate-200 transition-colors"
            >
              {LANGUAGES.map(l => (
                <option key={l.code} value={l.code}>{l.native} ({l.code.toUpperCase()})</option>
              ))}
            </select>

            <button
              onClick={() => setHighContrast(!highContrast)}
              className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all shadow-sm ${highContrast ? 'bg-yellow-400 text-slate-900 border-yellow-500' : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'}`}
              title="Toggle High Contrast & Large Text Mode"
            >
              {highContrast ? 'A-' : 'A+'}
            </button>
            <button
              onClick={handleLogout}
              className="px-3.5 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:text-red-600 hover:border-red-200 hover:bg-red-50 transition-all duration-200 shadow-sm"
            >
              {t('app.signOut', 'Sign Out')}
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {currentUser.role === 'PATIENT' ? (
          <PatientKiosk user={currentUser} />
        ) : (
          <DoctorPortal doctor={currentUser} />
        )}
      </main>
    </div>
  );
}