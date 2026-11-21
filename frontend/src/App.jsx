import React, { useState, useEffect } from 'react';
import PatientKiosk from './pages/PatientKiosk';
import DoctorPortal from './pages/DoctorPortal';
import AuthPage from './pages/AuthPage';
import { useLanguage } from './context/LanguageContext';
import { Contrast } from 'lucide-react';

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
      <header className={`sticky top-0 z-50 transition-all duration-200 shadow-sm ${
        highContrast 
          ? 'bg-slate-950 border-b-2 border-amber-400' 
          : 'bg-white/85 backdrop-blur-md border-b border-slate-200/80'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-clinical-600 to-brand-500 flex items-center justify-center shadow-md shadow-clinical-500/20 text-white font-black font-heading text-xl tracking-wider">
              V+
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className={`text-xl font-black font-heading tracking-tight ${
                  highContrast 
                    ? 'text-white' 
                    : 'bg-gradient-to-r from-slate-900 via-clinical-900 to-clinical-700 bg-clip-text text-transparent'
                }`}>
                  VAIDY<span className={highContrast ? 'text-sky-400' : 'text-clinical-600'}>care</span><span className={highContrast ? 'text-emerald-400' : 'text-brand-600'}>-AI</span>
                </span>
                <span className={`text-[10px] uppercase font-extrabold tracking-widest px-2.5 py-0.5 rounded-full ${
                  highContrast 
                    ? 'bg-amber-400/20 text-amber-300 border border-amber-400/50' 
                    : 'bg-clinical-100 text-clinical-700 border border-clinical-200'
                }`}>
                  {currentUser.role === 'PATIENT' ? t('auth.patientKiosk') : t('auth.doctorDesk')}
                </span>
              </div>
              <p className={`text-[11px] font-medium ${highContrast ? 'text-slate-300' : 'text-slate-400'}`}>{t('app.subtitle')}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            <div className="hidden sm:flex flex-col text-right">
              <span className={`text-xs font-bold ${highContrast ? 'text-white' : 'text-slate-700'}`}>{currentUser.name}</span>
              <span className={`text-[11px] ${highContrast ? 'text-slate-300' : 'text-slate-400'}`}>{currentUser.email}</span>
            </div>
            
            <select 
              value={lang} 
              onChange={(e) => setLang(e.target.value)}
              className={`border text-xs font-bold rounded-xl px-2.5 py-1.5 outline-none transition-colors ${
                highContrast 
                  ? 'bg-slate-900 border-amber-400/80 text-white focus:ring-2 focus:ring-amber-400' 
                  : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {LANGUAGES.map(l => (
                <option key={l.code} value={l.code} className={highContrast ? 'bg-slate-900 text-white' : ''}>{l.native} ({l.code.toUpperCase()})</option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => setHighContrast(!highContrast)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all shadow-sm whitespace-nowrap ${
                highContrast 
                  ? 'bg-amber-400 text-slate-950 border-amber-500 shadow-amber-500/20 ring-2 ring-amber-300/60' 
                  : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200 hover:text-slate-900'
              }`}
              title={highContrast ? 'Accessibility Mode (Active): Click to return to standard view' : 'Accessibility Mode: Click for High Contrast & Large Text'}
              aria-label="Toggle High Contrast and Accessibility Mode"
            >
              <Contrast className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="font-mono text-[11px] font-bold">Aa{highContrast ? '-' : '+'}</span>
            </button>
            <button
              onClick={handleLogout}
              className={`px-3.5 py-1.5 rounded-xl border text-xs font-bold transition-all shadow-sm whitespace-nowrap ${
                highContrast 
                  ? 'bg-rose-950/70 border-rose-500 text-rose-200 hover:bg-rose-900 hover:text-white' 
                  : 'border-slate-200 text-slate-600 hover:text-red-600 hover:border-red-200 hover:bg-red-50'
              }`}
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