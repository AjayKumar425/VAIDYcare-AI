import React, { useState } from 'react';

export default function AuthPage({ onLoginSuccess }) {
  const [isLogin, setIsLogin] = useState(true);
  const [role, setRole] = useState('PATIENT');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    age: '',
    gender: 'Male',
    specialization: '',
    licenseNumber: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
    const payload = isLogin
      ? { email: formData.email, password: formData.password, role }
      : { ...formData, role };

    try {
      const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';  
      const res = await fetch(`${API_BASE}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message || 'Authentication failed');

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
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white/90 backdrop-blur-xl rounded-2xl border border-slate-200/80 shadow-xl shadow-slate-200/50 p-8 transition-all duration-300 hover:shadow-2xl">
        {/* Brand Header */}
       
<div className="text-center mb-6">
  <div className="inline-flex w-12 h-12 rounded-2xl bg-gradient-to-tr from-clinical-600 to-brand-500 items-center justify-center shadow-lg shadow-clinical-500/30 text-white font-black font-heading text-2xl mb-3">
    V+
  </div>
  <h1 className="text-2xl font-black font-heading tracking-tight text-slate-800">
    VAIDY<span className="text-clinical-600">care</span><span className="text-brand-600">-AI</span>
  </h1>
  <p className="text-xs font-medium text-slate-500 mt-1">Intelligent Clinical Intake & OPD Triage System</p>
</div>

        {/* Role Toggle */}
        <div className="grid grid-cols-2 p-1 bg-slate-100/80 rounded-xl mb-6 border border-slate-200/50">
          <button
            type="button"
            onClick={() => setRole('PATIENT')}
            className={`py-2 text-xs font-bold rounded-lg transition-all duration-200 ${
              role === 'PATIENT'
                ? 'bg-white text-clinical-700 shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Patient Kiosk
          </button>
          <button
            type="button"
            onClick={() => setRole('DOCTOR')}
            className={`py-2 text-xs font-bold rounded-lg transition-all duration-200 ${
              role === 'DOCTOR'
                ? 'bg-white text-clinical-700 shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Doctor Desk
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium animate-shake">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {!isLogin && (
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Full Name</label>
              <input
                name="name"
                required
                className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-clinical-500/20 focus:border-clinical-500 outline-none transition-all"
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
              className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-clinical-500/20 focus:border-clinical-500 outline-none transition-all"
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
              className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-clinical-500/20 focus:border-clinical-500 outline-none transition-all"
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
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-clinical-500/20 focus:border-clinical-500 outline-none transition-all"
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
                      className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-clinical-500/20 focus:border-clinical-500 outline-none transition-all"
                      placeholder="28"
                      value={formData.age}
                      onChange={handleChange}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Gender</label>
                    <select
                      name="gender"
                      className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-clinical-500/20 focus:border-clinical-500 outline-none transition-all"
                      value={formData.gender}
                      onChange={handleChange}
                    >
                      <option>Male</option>
                      <option>Female</option>
                      <option>Other</option>
                    </select>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Specialization</label>
                    <input
                      name="specialization"
                      required
                      className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-clinical-500/20 focus:border-clinical-500 outline-none transition-all"
                      placeholder="e.g. General Physician / Ayush"
                      value={formData.specialization}
                      onChange={handleChange}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">License No.</label>
                    <input
                      name="licenseNumber"
                      required
                      className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-clinical-500/20 focus:border-clinical-500 outline-none transition-all"
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
            className="w-full mt-2 py-3 px-4 rounded-xl bg-gradient-to-r from-clinical-600 to-brand-600 hover:from-clinical-700 hover:to-brand-700 text-white font-bold text-sm shadow-md shadow-clinical-500/20 hover:shadow-lg hover:shadow-clinical-500/30 transition-all duration-200 flex items-center justify-center"
          >
            {loading ? (
              <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
            ) : isLogin ? (
              `Sign In as ${role === 'PATIENT' ? 'Patient' : 'Doctor'}`
            ) : (
              `Register ${role === 'PATIENT' ? 'Patient' : 'Doctor'}`
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={() => setIsLogin(!isLogin)}
            className="text-xs font-semibold text-slate-500 hover:text-clinical-600 transition-colors"
          >
            {isLogin ? "Don't have an account? Create one" : 'Already registered? Sign In'}
          </button>
        </div>
      </div>
    </div>
  );
}