import React from 'react';
import { useLanguage } from '../context/LanguageContext';

export default function LanguageSwitcher({ position = 'top-right', variant = 'default' }) {
  const { lang, setLang, LANGUAGES } = useLanguage();

  const positionClass = {
    'top-right': 'fixed top-4 right-4 z-50',
    'top-left': 'fixed top-4 left-4 z-50',
    'inline': 'relative inline-block',
  }[position] || 'fixed top-4 right-4 z-50';

  return (
    <div className={positionClass}>
      <select
        value={lang}
        onChange={(e) => setLang(e.target.value)}
        title="Change Language"
        className={
          variant === 'pill'
            ? 'bg-white/90 backdrop-blur-sm border border-slate-200 text-slate-700 text-xs font-bold rounded-full px-3 py-2 shadow-lg outline-none hover:border-clinical-400 transition-all cursor-pointer'
            : 'bg-white border border-slate-200 text-slate-700 text-xs font-bold rounded-xl px-2.5 py-1.5 shadow-md outline-none hover:border-clinical-400 transition-all cursor-pointer'
        }
        style={{ minWidth: '130px' }}
      >
        {LANGUAGES.map(l => (
          <option key={l.code} value={l.code}>
            {l.native} ({l.code.toUpperCase()})
          </option>
        ))}
      </select>
    </div>
  );
}
