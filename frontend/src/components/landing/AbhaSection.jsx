import React, { useState } from 'react';
import { ShieldCheck, Fingerprint, CheckCircle2, Lock, ArrowRight, UserCheck } from 'lucide-react';

export default function AbhaSection() {
  const [mockAbha, setMockAbha] = useState('');
  const [verified, setVerified] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleVerify = (e) => {
    e.preventDefault();
    if (!mockAbha) return;
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setVerified(true);
    }, 800);
  };

  return (
    <section id="abha" className="py-24 bg-slate-950 relative border-t border-slate-800/60">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-bold mb-4">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Ayushman Bharat Digital Mission (ABDM) Compatible</span>
            </div>
            <h2 className="text-3xl sm:text-5xl font-black font-heading text-white tracking-tight leading-tight">
              Instant ABHA Verification & Longitudinal Health Records
            </h2>
            <p className="mt-4 text-slate-400 text-sm sm:text-base leading-relaxed">
              Seamlessly link 14-digit Ayushman Bharat Health Accounts (ABHA). VAIDYcare-AI automatically syncs past diagnoses, chronic prescriptions, and lab history across the ABDM unified health interface.
            </p>

            <ul className="mt-6 space-y-3.5 text-sm text-slate-300 font-medium">
              {[
                'Instant ABHA Number & ABHA Address (@abdm) resolution',
                'Patient-consented access to past Electronic Health Records (EHR)',
                'End-to-end encryption compliant with HIPAA & NDHM standards',
                'One-tap digital demographic autofill for emergency triage'
              ].map((item, idx) => (
                <li key={idx} className="flex items-center gap-3">
                  <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Interactive ABHA Verification Sandbox Widget */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-8 backdrop-blur-2xl shadow-2xl relative">
            <div className="flex items-center justify-between pb-5 border-b border-slate-800 mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-slate-950 font-black">
                  <Fingerprint className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">ABHA Instant Validator</h4>
                  <span className="text-[10px] text-slate-400">ABDM Gateway Simulation</span>
                </div>
              </div>
              <span className="text-[10px] font-bold px-2.5 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full">
                Encrypted Sandbox
              </span>
            </div>

            {verified ? (
              <div className="space-y-4 animate-fade-in">
                <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-3">
                  <UserCheck className="w-6 h-6 text-emerald-400 shrink-0" />
                  <div>
                    <div className="text-xs font-bold text-white">ABHA ID Verified Successfully</div>
                    <div className="text-[11px] text-emerald-300/80">{mockAbha} • Linked to National Health Registry</div>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/60 text-xs space-y-2">
                  <div className="flex justify-between text-slate-400">
                    <span>Name on Record:</span>
                    <span className="font-bold text-white">Ajay Kumar</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Gender / DOB:</span>
                    <span className="font-bold text-white">Male • 29/07/2003</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Consent Artifact:</span>
                    <span className="font-bold text-teal-400">ACTIVE (HIPAA/ABDM)</span>
                  </div>
                </div>

                <button
                  onClick={() => { setVerified(false); setMockAbha(''); }}
                  className="w-full py-2.5 rounded-xl bg-slate-800 text-xs font-bold text-slate-300 hover:text-white transition-all"
                >
                  Test Another ABHA ID
                </button>
              </div>
            ) : (
              <form onSubmit={handleVerify} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">Enter 14-Digit ABHA Number</label>
                  <input
                    type="text"
                    required
                    placeholder="91-4829-1029-4821"
                    value={mockAbha}
                    onChange={(e) => setMockAbha(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-500 text-sm outline-none focus:border-teal-400 transition-all font-mono"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30 transition-all flex items-center justify-center gap-2"
                >
                  {loading ? 'Verifying with ABDM Gateway...' : 'Verify ABHA Credentials →'}
                </button>
                <div className="flex items-center justify-center gap-1.5 text-[10px] text-slate-500">
                  <Lock className="w-3 h-3" />
                  <span>256-bit AES cryptographic signature validation</span>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}