import React, { createContext, useState, useContext, useEffect } from 'react';
import { translations } from '../utils/translations';

const LanguageContext = createContext();

export const LANGUAGES = [
  { code: 'en', name: 'English', native: 'English', voiceCode: 'en-IN' },
  { code: 'hi', name: 'Hindi', native: 'हिन्दी', voiceCode: 'hi-IN' },
  { code: 'bn', name: 'Bengali', native: 'বাংলা', voiceCode: 'bn-IN' },
  { code: 'mr', name: 'Marathi', native: 'मराठी', voiceCode: 'mr-IN' },
  { code: 'ta', name: 'Tamil', native: 'தமிழ்', voiceCode: 'ta-IN' },
  { code: 'te', name: 'Telugu', native: 'తెలుగు', voiceCode: 'te-IN' },
  { code: 'gu', name: 'Gujarati', native: 'ગુજરાતી', voiceCode: 'gu-IN' },
  { code: 'kn', name: 'Kannada', native: 'ಕನ್ನಡ', voiceCode: 'kn-IN' },
  { code: 'ml', name: 'Malayalam', native: 'മലയാളം', voiceCode: 'ml-IN' }
];

export const LanguageProvider = ({ children }) => {
  const [lang, setLang] = useState('en');

  useEffect(() => {
    const saved = localStorage.getItem('medikiosk_lang');
    if (saved && LANGUAGES.find(l => l.code === saved)) {
      setLang(saved);
    }
  }, []);

  const changeLanguage = (newLang) => {
    setLang(newLang);
    localStorage.setItem('medikiosk_lang', newLang);
  };

  const t = (key, defaultText = '') => {
    if (!key) return defaultText;
    const langDict = translations[lang] || translations['en'];
    return langDict[key] || translations['en'][key] || defaultText || key;
  };

  const currentVoiceCode = LANGUAGES.find(l => l.code === lang)?.voiceCode || 'en-IN';

  return (
    <LanguageContext.Provider value={{ lang, setLang: changeLanguage, t, LANGUAGES, currentVoiceCode }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);
