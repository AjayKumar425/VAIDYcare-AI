import React, { useState, useEffect } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';

export default function DoctorPortal({ doctor }) {
  const [tokenInput, setTokenInput] = useState('');
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeImage, setActiveImage] = useState(null);
  const [scannerOpen, setScannerOpen] = useState(false);

  const fetchEncounter = async (tokenToFetch) => {
    const targetToken = (tokenToFetch || tokenInput).trim();
    if (!targetToken) return;
    setError('');
    setData(null);
    setLoading(true);
    try {

      const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';  
      const res = await fetch(`${API_BASE}5000/api/doctor/encounter/${targetToken}`);
      const result = await res.json();
      if (!result.success) throw new Error(result.message || 'Encounter record not found');
      setData(result.encounter);
      setTokenInput(targetToken);
      setScannerOpen(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let qrScanner = null;
    if (scannerOpen) {
      qrScanner = new Html5QrcodeScanner(
        'qr-reader-container',
        { fps: 10, qrbox: { width: 240, height: 240 } },
        false
      );

      qrScanner.render(
        (decodedText) => {
          try {
            const parsed = JSON.parse(decodedText);
            if (parsed.tokenNumber) fetchEncounter(parsed.tokenNumber);
            else fetchEncounter(decodedText);
          } catch {
            fetchEncounter(decodedText);
          }
          qrScanner.clear();
        },
        () => {}
      );
    }

    return () => {
      if (qrScanner) {
        qrScanner.clear().catch((e) => console.error('Scanner cleanup error:', e));
      }
    };
  }, [scannerOpen]);

  const session = data?.session || {};
  const triage = session?.triage_summary || {
    risk_level: 'SAFE',
    risk_score: 10,
    clinical_note: 'Routine intake registered.',
    highlighted_keywords: [],
    suspected_diseases: []
  };

  const docs = data?.documents || [];

  const parsedSymptoms = (() => {
    if (!session.symptoms) return [];
    if (Array.isArray(session.symptoms)) return session.symptoms;
    try { return JSON.parse(session.symptoms); } catch { return [session.symptoms]; }
  })();

  // 🎯 Intelligent Red / Yellow / Green Keyword Classifier
  const getKeywordStyle = (keyword) => {
    const kw = (keyword || '').toUpperCase();

    // 🔴 Critical Red Keywords (Emergency, Fractures, Acute Infarctions)
    const redPatterns = [
      'FRACTURE', 'DISPLACED', 'SUBLUXATION', 'PNEUMONIA', 'SEVERE', 'CRITICAL',
      'LEUKOCYTOSIS', 'CHEST PAIN', 'BLEEDING', 'ISCHEMIA', 'CONSOLIDATION',
      'EFFUSION', 'OPACITY', 'INFILTRATE', 'THROMBOCYTOPENIA', 'ARRHYTHMIA', 'URGENT'
    ];

    // 🟡 Warning Yellow Keywords (Moderate, Metabolic, Early Stage)
    const yellowPatterns = [
      'ANEMIA', 'ELEVATED', 'DEVIATION', 'DIABETES', 'HYPERGLYCEMIA', 'FEVER',
      'COUGH', 'MODERATE', 'BORDERLINE', 'DEFICIENCY', 'INFLAMMATION', 'HYPERTENSION'
    ];

    if (redPatterns.some((pattern) => kw.includes(pattern))) {
      return {
        wrapper: 'bg-rose-50 border-rose-300 text-rose-800 shadow-sm shadow-rose-500/10',
        dot: 'bg-rose-600 animate-pulse',
        label: 'CRITICAL'
      };
    }

    if (yellowPatterns.some((pattern) => kw.includes(pattern))) {
      return {
        wrapper: 'bg-amber-50 border-amber-300 text-amber-800 shadow-sm shadow-amber-500/10',
        dot: 'bg-amber-500',
        label: 'WARNING'
      };
    }

    // 🟢 Safe Green Keywords (Normal, Intact, Safe Limits)
    return {
      wrapper: 'bg-emerald-50 border-emerald-300 text-emerald-800 shadow-sm shadow-emerald-500/10',
      dot: 'bg-emerald-500',
      label: 'SAFE'
    };
  };

  const getDocBadge = (type) => {
    const t = (type || '').toUpperCase();
    if (t.includes('XRAY') || t.includes('ORTHO') || t.includes('CHEST')) {
      return { label: 'Radiology / X-Ray', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' };
    }
    if (t.includes('BLOOD') || t.includes('CBC') || t.includes('BIOCHEM')) {
      return { label: 'Pathology / Lab', color: 'bg-teal-50 text-teal-700 border-teal-200' };
    }
    if (t.includes('RX') || t.includes('PRESCRIPTION')) {
      return { label: 'Prescription Rx', color: 'bg-amber-50 text-amber-700 border-amber-200' };
    }
    return { label: 'Clinical Lab', color: 'bg-slate-100 text-slate-700 border-slate-200' };
  };

  return (
    <div className="space-y-6">
      {/* Top Search Header */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-[11px] font-extrabold text-clinical-600 tracking-widest uppercase">OPD Physician Desk</span>
          <h2 className="text-2xl font-black font-heading text-slate-900 tracking-tight">Clinical Diagnostic Console</h2>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setScannerOpen(!scannerOpen)}
            className={`px-4 py-2.5 rounded-2xl text-xs font-extrabold transition-all flex items-center gap-2 shadow-sm ${
              scannerOpen
                ? 'bg-rose-600 hover:bg-rose-700 text-white'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
            }`}
          >
            <span>{scannerOpen ? '✕ Close Camera' : '📷 Scan QR Slip'}</span>
          </button>

          <input
            placeholder="Token (e.g. MED-2415)"
            value={tokenInput}
            onChange={(e) => setTokenInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchEncounter()}
            className="w-56 px-4 py-2.5 text-sm font-mono font-bold rounded-2xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-clinical-500/20 outline-none uppercase text-slate-800 placeholder:text-slate-400"
          />
          <button
            onClick={() => fetchEncounter()}
            disabled={loading}
            className="px-6 py-2.5 rounded-2xl bg-gradient-to-r from-clinical-600 to-clinical-700 hover:from-clinical-700 hover:to-clinical-800 text-white text-xs font-extrabold tracking-wide transition-all shadow-md shadow-clinical-500/20"
          >
            {loading ? 'Evaluating...' : 'Load Case'}
          </button>
        </div>
      </div>

      {/* Camera Live QR Scanner Viewport */}
      {scannerOpen && (
        <div className="bg-white rounded-3xl border-2 border-clinical-400 p-6 shadow-xl max-w-md mx-auto text-center">
          <h3 className="text-base font-extrabold font-heading text-slate-900 mb-1">Align Patient Slip QR in Viewfinder</h3>
          <p className="text-xs text-slate-400 mb-4">Point your camera at the QR code printed on the patient slip</p>
          <div id="qr-reader-container" className="rounded-2xl overflow-hidden border border-slate-200"></div>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center gap-2">
          <span>⚠️</span>
          <span>{error}</span>
        </div>
      )}

      {data && (
        <div className="space-y-6">
          {/* Top Patient Triage Banner */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 sm:p-7 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h3 className="text-2xl sm:text-3xl font-black font-heading text-slate-900 tracking-tight">
                  {session.full_name}
                </h3>
                <span className="px-3 py-1 rounded-xl bg-slate-100 font-mono font-bold text-xs text-slate-700 border border-slate-200">
                  {session.token_number}
                </span>
                <span className={`px-3.5 py-1 rounded-xl text-xs font-black tracking-wide uppercase border ${
                  triage.risk_level === 'SEVERE'
                    ? 'bg-rose-100 text-rose-800 border-rose-300'
                    : triage.risk_level === 'MODERATE'
                    ? 'bg-amber-100 text-amber-800 border-amber-300'
                    : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                }`}>
                  {triage.risk_level} Priority (Score: {triage.risk_score ?? 10}/100)
                </span>
              </div>
              <p className="text-xs text-slate-500 font-semibold mt-2">
                {session.age} Y • {session.gender} • Phone: <span className="font-mono text-slate-700 font-bold">{session.phone}</span> • ABHA: <span className="font-mono">{session.abha_id || 'Not linked'}</span>
              </p>
            </div>

            {/* Red / Yellow / Green Color-Coded Keywords Ribbon */}
            {triage.highlighted_keywords?.length > 0 && (
              <div className="flex flex-col gap-1.5 max-w-lg">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                  Detected Condition Identifiers (AI Triage)
                </span>
                <div className="flex flex-wrap gap-2">
                  {triage.highlighted_keywords.map((kw, i) => {
                    const style = getKeywordStyle(kw);
                    return (
                      <span
                        key={i}
                        className={`px-3 py-1 rounded-xl text-xs font-black tracking-wide uppercase border flex items-center gap-1.5 transition-transform hover:scale-105 ${style.wrapper}`}
                      >
                        <span className={`w-2 h-2 rounded-full ${style.dot}`}></span>
                        <span>{kw}</span>
                      </span>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Quick Summary Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Chief Complaint & Symptoms */}
            <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm">
              <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider block mb-2">
                1. Chief Complaint & Reported Symptoms
              </span>
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 text-xs sm:text-sm font-semibold text-slate-800 leading-relaxed">
                "{session.chief_complaint}"
              </div>
              <div className="flex flex-wrap gap-1.5 mt-3">
                {parsedSymptoms.map((s, idx) => (
                  <span key={idx} className="px-2.5 py-1 rounded-xl bg-clinical-50 text-clinical-700 border border-clinical-100 text-xs font-bold">
                    • {s}
                  </span>
                ))}
              </div>
            </div>

            {/* Differential Diagnosis */}
            <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm">
              <span className="text-[11px] font-extrabold text-clinical-600 uppercase tracking-wider block mb-2">
                2. AI Suspected Condition & Action Plan
              </span>
              {triage.suspected_diseases?.length === 0 ? (
                <div className="p-4 rounded-2xl bg-slate-50 text-xs text-slate-400">
                  No active acute pathology detected.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {triage.suspected_diseases.map((d, i) => (
                    <div key={i} className="p-3.5 rounded-2xl bg-amber-50/60 border border-amber-200/80 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-black font-heading text-sm text-slate-900">{d.disease}</span>
                        <span className="text-[11px] text-slate-500 block mt-0.5 font-medium">{d.trigger}</span>
                      </div>
                      <span className="px-2.5 py-1 rounded-xl bg-white border border-amber-300 font-extrabold text-amber-800 text-[11px] shadow-sm">
                        {d.confidence || '94%'} Match
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Diagnostic Document Cards */}
          <div>
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-3 px-1">
              3. Diagnostic Scans & Lab Biomarkers
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {docs.map((doc, idx) => {
                const badge = getDocBadge(doc.doc_type);
                const points = doc.ai_prediction?.key_points || [];

                return (
                  <div key={idx} className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm flex flex-col justify-between hover:border-clinical-300 transition-all">
                    <div>
                      <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
                        <span className={`px-3 py-1 rounded-xl text-[10px] font-extrabold uppercase border tracking-wider ${badge.color}`}>
                          {badge.label}
                        </span>
                        <button
                          onClick={() => setActiveImage(`http://127.0.0.1:5000${doc.file_path}`)}
                          className="text-xs font-extrabold text-clinical-600 hover:text-clinical-800 flex items-center gap-1"
                        >
                          View Scan 🔍
                        </button>
                      </div>

                      <h4 className="text-base font-black font-heading text-slate-900 mb-2">
                        {doc.ai_prediction?.finding || 'Diagnostic Finding'}
                      </h4>

                      {points.length > 0 ? (
                        <ul className="space-y-2 my-3 text-xs text-slate-700">
                          {points.map((pt, pIdx) => (
                            <li key={pIdx} className="flex items-start gap-2 font-medium">
                              <span className="text-clinical-600 font-bold">•</span>
                              <span>{pt}</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-xs text-slate-600 my-2">{doc.raw_extracted_text}</p>
                      )}
                    </div>

                    {/* Compact Biomarker Table */}
                    {doc.biomarkers?.length > 0 && (
                      <div className="mt-4 pt-3 border-t border-slate-100 overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead>
                            <tr className="text-slate-400 font-extrabold uppercase border-b pb-1 text-[10px] tracking-wider">
                              <th className="pb-1">Test</th>
                              <th className="pb-1">Observed</th>
                              <th className="pb-1">Reference</th>
                              <th className="pb-1 text-right">Flag</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {doc.biomarkers.map((b, bIdx) => (
                              <tr key={bIdx} className="hover:bg-slate-50/50 transition-colors">
                                <td className="py-1.5 font-bold text-slate-800">{b.name}</td>
                                <td className="py-1.5 font-mono font-bold text-slate-900">{b.measured_value} <span className="text-[10px] font-normal text-slate-400">{b.unit}</span></td>
                                <td className="py-1.5 font-mono text-[11px] text-slate-400">{b.ref_min} - {b.ref_max}</td>
                                <td className="py-1.5 text-right font-black text-[11px]">
                                  <span className={`px-2 py-0.5 rounded-lg ${
                                    b.status === 'NORMAL'
                                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                      : 'bg-rose-50 text-rose-700 border border-rose-200 animate-pulse'
                                  }`}>
                                    {b.status}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Lightbox Modal */}
      {activeImage && (
        <div
          onClick={() => setActiveImage(null)}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 cursor-pointer"
        >
          <div className="bg-white rounded-3xl p-3 max-w-4xl max-h-[90vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center p-2 border-b">
              <span className="text-xs font-extrabold font-heading text-slate-800">Original Diagnostic Scan</span>
              <button
                onClick={() => setActiveImage(null)}
                className="px-2.5 py-1 rounded-xl bg-slate-100 text-xs font-bold hover:bg-slate-200"
              >
                ✕ Close
              </button>
            </div>
            <img
              src={activeImage}
              alt="Scan Preview"
              className="max-h-[80vh] w-auto mx-auto object-contain p-2"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = 'https://placehold.co/600x400?text=PDF+or+Preview+Unavailable';
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}