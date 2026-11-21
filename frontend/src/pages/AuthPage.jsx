import React, { useState, useRef, useEffect } from 'react';
import { API_BASE } from '../utils/api';
import { useLanguage } from '../context/LanguageContext';
import LanguageSwitcher from '../components/LanguageSwitcher';
import { animateSplitText, animateScaleIn, gsap } from '../utils/animations';

export default function AuthPage({ onLoginSuccess }) {
  const { t } = useLanguage();
  const [isLogin, setIsLogin] = useState(true);
  const [role, setRole] = useState('PATIENT');
  const cardRef = useRef(null);
  const titleRef = useRef(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      if (cardRef.current) {
        animateScaleIn(cardRef.current, { fromScale: 0.98, y: 12, duration: 0.4 });
      }
      if (titleRef.current) {
        animateSplitText(titleRef.current, { y: 6, duration: 0.38, stagger: 0.03 });
      }
    });

    return () => ctx.revert();
  }, []);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    age: '',
    gender: 'Male',
    specialization: '',
    licenseNumber: '',
    abhaId: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const payload = isLogin
      ? { email: formData.email, password: formData.password, role }
      : { ...formData, role };

    const targetUrl = `${API_BASE}/api/auth/${isLogin ? 'login' : 'register'}`;

    try {
      const res = await fetch(targetUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        throw new Error('Backend server is waking up. Please wait 10 seconds and try again.');
      }

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || data.error || 'Authentication failed. Check your credentials.');
      }

      localStorage.setItem('medikiosk_token', data.token);
      localStorage.setItem('medikiosk_user', JSON.stringify(data.user));
      onLoginSuccess(data.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-900/5">
      {/* Language Switcher - top right corner on login page */}
      <LanguageSwitcher position="top-right" variant="pill" />
      <div ref={cardRef} className="w-full max-w-md bg-white rounded-3xl border border-slate-200/80 shadow-2xl p-8 transition-all">
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="inline-flex w-12 h-12 rounded-2xl bg-gradient-to-tr from-clinical-600 to-brand-500 items-center justify-center shadow-lg shadow-clinical-500/30 text-white font-black font-heading text-2xl mb-3">
            V+
          </div>
          <h1 ref={titleRef} className="text-2xl font-black font-heading tracking-tight text-slate-800">
            VAIDY<span className="text-clinical-600">care</span><span className="text-brand-600">-AI</span>
          </h1>
          <p className="text-xs font-medium text-slate-500 mt-1">{t('app.subtitle', 'Intelligent Clinical Intake & OPD Triage System')}</p>
          <div className="mt-3 flex items-center justify-center gap-2">
            <span className="text-[10px] text-slate-400 font-semibold">🌐 Language:</span>
            <LanguageSwitcher position="inline" variant="default" />
          </div>
        </div>

        {/* Role Toggle */}
        <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-2xl mb-6 border border-slate-200/60">
          <button
            type="button"
            onClick={() => setRole('PATIENT')}
            className={`py-2 text-xs font-bold rounded-xl transition-all ${
              role === 'PATIENT' ? 'bg-white text-clinical-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            {t('auth.patientKiosk', 'Patient Kiosk')}
          </button>
          <button
            type="button"
            onClick={() => setRole('DOCTOR')}
            className={`py-2 text-xs font-bold rounded-xl transition-all ${
              role === 'DOCTOR' ? 'bg-white text-clinical-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            {t('auth.doctorDesk', 'Doctor Desk')}
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center gap-2">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {!isLogin && (
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Full Name</label>
              <input
                name="name"
                required
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-clinical-500/20 outline-none"
                placeholder="e.g. Rahul Sharma"
                value={formData.name}
                onChange={handleChange}
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Email Address</label>
            <input
              name="email"
              type="email"
              required
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-clinical-500/20 outline-none"
              placeholder="name@hospital.org"
              value={formData.email}
              onChange={handleChange}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Password</label>
            <input
              name="password"
              type="password"
              required
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-clinical-500/20 outline-none"
              placeholder="••••••••"
              value={formData.password}
              onChange={handleChange}
            />
          </div>

          {!isLogin && (
            <>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Contact Phone</label>
                <input
                  name="phone"
                  required
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 bg-slate-50 focus:bg-white outline-none"
                  placeholder="+91 98765 43210"
                  value={formData.phone}
                  onChange={handleChange}
                />
              </div>

              {role === 'PATIENT' ? (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Age</label>
                    <input
                      name="age"
                      type="number"
                      required
                      className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 bg-slate-50 focus:bg-white outline-none"
                      placeholder="28"
                      value={formData.age}
                      onChange={handleChange}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Gender</label>
                    <select
                      name="gender"
                      className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 bg-slate-50 focus:bg-white outline-none font-semibold"
                      value={formData.gender}
                      onChange={handleChange}
                    >
                      <option>Male</option>
                      <option>Female</option>
                      <option>Other</option>
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-semibold text-slate-600 mb-1">ABHA ID (Optional)</label>
                    <input
                      name="abhaId"
                      className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 bg-slate-50 focus:bg-white outline-none font-mono"
                      placeholder="XX-XXXX-XXXX-XXXX"
                      maxLength={19}
                      value={formData.abhaId}
                      onChange={handleChange}
                    />
                    {formData.abhaId && !/^\d{2}-\d{4}-\d{4}-\d{4}$/.test(formData.abhaId) && <p className="text-[11px] text-amber-600 mt-1 font-semibold">Format: XX-XXXX-XXXX-XXXX</p>}
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Specialization</label>
                    <input
                      name="specialization"
                      required
                      className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 bg-slate-50 focus:bg-white outline-none"
                      placeholder="e.g. General Physician"
                      value={formData.specialization}
                      onChange={handleChange}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">License No.</label>
                    <input
                      name="licenseNumber"
                      required
                      className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 bg-slate-50 focus:bg-white outline-none"
                      placeholder="MCI-19482-A"
                      value={formData.licenseNumber}
                      onChange={handleChange}
                    />
                  </div>
                </div>
              )}
            </>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3 px-4 rounded-2xl bg-gradient-to-r from-clinical-600 to-brand-600 hover:from-clinical-700 hover:to-brand-700 text-white font-black text-sm shadow-md shadow-clinical-500/20 hover:shadow-lg transition-all flex items-center justify-center gap-2"
          >
            {loading ? (
              <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
            ) : isLogin ? (
              t('auth.signIn', 'Sign In')
            ) : (
              t('auth.register', 'Register')
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={() => { setIsLogin(!isLogin); setError(''); }}
            className="text-xs font-bold text-slate-500 hover:text-clinical-600 transition-colors"
          >
            {isLogin ? "Don't have an account? Create one" : 'Already registered? Sign In'}
          </button>
        </div>
      </div>
    </div>
  );
}