import React, { useState, useEffect } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { API_BASE } from '../utils/api';

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
      const res = await fetch(`${API_BASE}/api/doctor/encounter/${targetToken}`);
      const result = await res.json();
      if (!result.success) throw new Error(result.message || result.error || 'Encounter record not found');
      setData(result.encounter || result);
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

  const encounter = data?.session || data?.encounter || data || {};
  const patient = encounter.patient || {
    full_name: encounter.full_name || 'Patient',
    age: encounter.age || 'N/A',
    gender: encounter.gender || 'N/A',
    phone: encounter.phone || 'N/A',
    abha_id: encounter.abha_id || null
  };

  const triage = encounter.triage_summary || {
    risk_level: 'SAFE',
    risk_score: 10,
    clinical_note: 'Routine intake registered.',
    highlighted_keywords: [],
    suspected_diseases: []
  };

  const docs = encounter.documents || data?.documents || [];

  const parsedSymptoms = (() => {
    if (!encounter.symptoms) return [];
    if (Array.isArray(encounter.symptoms)) return encounter.symptoms;
    try { return JSON.parse(encounter.symptoms); } catch { return [encounter.symptoms]; }
  })();

  // 🏷️ Category Tag & Styling Resolver
  const getDocTypeBadge = (type) => {
    const t = (type || '').toUpperCase();
    if (t.includes('XRAY') || t.includes('X_RAY') || t.includes('RADIOLOGY')) {
      return { label: '☢️ Radiology / X-Ray', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' };
    }
    if (t.includes('CBC') || t.includes('PATHOLOGY') || t.includes('BLOOD')) {
      return { label: '🩸 Pathology / CBC Panel', color: 'bg-rose-50 text-rose-700 border-rose-200' };
    }
    if (t.includes('BIOCHEM') || t.includes('LIPID') || t.includes('LFT') || t.includes('KFT')) {
      return { label: '🧪 Biochemistry Panel', color: 'bg-teal-50 text-teal-700 border-teal-200' };
    }
    if (t.includes('RX') || t.includes('PRESCRIPTION')) {
      return { label: '💊 Prescription (Rx)', color: 'bg-amber-50 text-amber-700 border-amber-200' };
    }
    if (t.includes('ECG') || t.includes('CARDIOLOGY')) {
      return { label: '🫀 Cardiology / ECG', color: 'bg-purple-50 text-purple-700 border-purple-200' };
    }
    return { label: '📋 Clinical Record', color: 'bg-slate-100 text-slate-700 border-slate-200' };
  };

  // 🚦 Color-coded finding flag resolver
  const getFindingFlagStyle = (flag) => {
    const f = (flag || 'GREEN').toUpperCase();
    if (f === 'RED' || f === 'CRITICAL' || f === 'SEVERE') {
      return {
        badge: 'bg-rose-50/90 text-rose-900 border-rose-200',
        dot: 'bg-rose-600 animate-pulse',
        icon: '🔴',
        label: 'CRITICAL FINDING'
      };
    }
    if (f === 'YELLOW' || f === 'WARNING' || f === 'MODERATE') {
      return {
        badge: 'bg-amber-50/90 text-amber-900 border-amber-200',
        dot: 'bg-amber-500',
        icon: '🟡',
        label: 'WARNING / ABNORMAL'
      };
    }
    return {
      badge: 'bg-emerald-50/90 text-emerald-900 border-emerald-200',
      dot: 'bg-emerald-500',
      icon: '🟢',
      label: 'NORMAL / SAFE'
    };
  };

  const getKeywordStyle = (keyword) => {
    const kw = (keyword || '').toUpperCase();
    const redPatterns = ['FRACTURE', 'DISPLACED', 'SUBLUXATION', 'PNEUMONIA', 'SEVERE', 'CRITICAL', 'CHEST PAIN', 'BLEEDING', 'ISCHEMIA', 'CONSOLIDATION', 'EFFUSION'];
    const yellowPatterns = ['ANEMIA', 'ELEVATED', 'DEVIATION', 'DIABETES', 'FEVER', 'COUGH', 'MODERATE', 'BORDERLINE', 'DEFICIENCY', 'INFLAMMATION', 'LOW'];

    if (redPatterns.some((p) => kw.includes(p))) {
      return 'bg-rose-100 text-rose-800 border-rose-300';
    }
    if (yellowPatterns.some((p) => kw.includes(p))) {
      return 'bg-amber-100 text-amber-800 border-amber-300';
    }
    return 'bg-emerald-100 text-emerald-800 border-emerald-300';
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
            placeholder="Token (e.g. V-4821)"
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

      {/* Camera Live QR Scanner */}
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
                  {patient.full_name}
                </h3>
                <span className="px-3 py-1 rounded-xl bg-slate-100 font-mono font-bold text-xs text-slate-700 border border-slate-200">
                  {encounter.token_number}
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
                {patient.age} Y • {patient.gender} • Phone: <span className="font-mono text-slate-700 font-bold">{patient.phone}</span> • ABHA: <span className="font-mono">{patient.abha_id || 'Not linked'}</span>
              </p>
            </div>

            {/* Quick Keyword Ribbon */}
            {triage.highlighted_keywords?.length > 0 && (
              <div className="flex flex-col gap-1.5 max-w-lg">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                  Detected Condition Identifiers (AI Triage)
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {triage.highlighted_keywords.map((kw, i) => (
                    <span
                      key={i}
                      className={`px-2.5 py-0.5 rounded-lg text-[11px] font-black tracking-wide uppercase border ${getKeywordStyle(kw)}`}
                    >
                      {kw}
                    </span>
                  ))}
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
                "{encounter.chief_complaint}"
              </div>
              <div className="flex flex-wrap gap-1.5 mt-3">
                {parsedSymptoms.map((s, idx) => (
                  <span key={idx} className="px-2.5 py-1 rounded-xl bg-clinical-50 text-clinical-700 border border-clinical-100 text-xs font-bold">
                    • {s}
                  </span>
                ))}
              </div>
            </div>

            {/* AI Suspected Condition & Action Plan */}
            <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm">
              <span className="text-[11px] font-extrabold text-clinical-600 uppercase tracking-wider block mb-2">
                2. AI Suspected Condition & Action Plan
              </span>
              {(!triage.suspected_diseases || triage.suspected_diseases.length === 0) ? (
                <div className="p-4 rounded-2xl bg-slate-50 text-xs text-slate-400">
                  No acute active pathology detected.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {triage.suspected_diseases.map((d, i) => (
                    <div key={i} className="p-3.5 rounded-2xl bg-amber-50/60 border border-amber-200/80 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-black font-heading text-sm text-slate-900">{d.disease || d.condition}</span>
                        <span className="text-[11px] text-slate-500 block mt-0.5 font-medium">{d.trigger}</span>
                      </div>
                      <span className="px-2.5 py-1 rounded-xl bg-white border border-amber-300 font-extrabold text-amber-800 text-[11px] shadow-sm">
                        {d.confidence || '90%'} Match
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Structured SOCRATES Clinical History */}
          {encounter.structured_hpi && (
            <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-black text-clinical-600 uppercase tracking-wider">
                  Structured HPI (SOCRATES Framework)
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 uppercase text-slate-700">
                  Mode: {encounter.care_mode || 'General'}
                </span>
              </div>
              
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-[10px] text-slate-400 block font-bold uppercase">Onset</span>
                  <span className="font-extrabold text-slate-800">{encounter.structured_hpi.history_of_present_illness?.onset || 'N/A'}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-[10px] text-slate-400 block font-bold uppercase">Character</span>
                  <span className="font-extrabold text-slate-800">{encounter.structured_hpi.history_of_present_illness?.character || 'N/A'}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-[10px] text-slate-400 block font-bold uppercase">Severity</span>
                  <span className="font-extrabold text-slate-800">{encounter.structured_hpi.history_of_present_illness?.severity || 'N/A'}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-[10px] text-slate-400 block font-bold uppercase">Past History</span>
                  <span className="font-extrabold text-slate-800">{encounter.structured_hpi.past_medical_history || 'None'}</span>
                </div>
              </div>

              {/* AYUSH Dashavidha Factors */}
              {encounter.structured_hpi.ayush_dashavidha && (
                <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap gap-2 text-xs">
                  <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold">
                    🌿 Prakriti: {encounter.structured_hpi.ayush_dashavidha.prakriti}
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold">
                    🔥 Agni: {encounter.structured_hpi.ayush_dashavidha.agni}
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold">
                    🌀 Koshtha: {encounter.structured_hpi.ayush_dashavidha.koshtha}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Section 3: Diagnostic Scans & Essential Key Points with Flag Badges */}
          <div>
            <div className="flex items-center justify-between mb-3 px-1">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">
                3. Multimodal Diagnostic Analysis ({docs.length} Records Uploaded)
              </h4>
              <span className="text-[10px] font-bold text-clinical-600 bg-clinical-50 px-2 py-0.5 rounded-full border border-clinical-200">
                Automated Extraction & Diagnostic Flags
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {docs.map((doc, idx) => {
                const extracted = doc.extracted_data || doc.ai_prediction || {};
                const badge = getDocTypeBadge(doc.doc_type || extracted.doc_type);
                const bullets = extracted.essential_bullet_points || extracted.findings || [];
                const medications = extracted.extracted_medications || [];
                const biomarkers = extracted.biomarkers || doc.biomarkers || [];
                
                const imageUrl = doc.file_path?.startsWith('http')
                  ? doc.file_path
                  : `${API_BASE}${doc.file_path?.startsWith('/') ? '' : '/'}${doc.file_path || ''}`;

                return (
                  <div
                    key={idx}
                    className="bg-white rounded-3xl border-2 border-slate-200/90 p-6 shadow-sm hover:border-clinical-400 hover:shadow-md transition-all flex flex-col justify-between"
                  >
                    <div>
                      {/* Header: Category Badge & View Scan Link */}
                      <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                        <span className={`px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider border ${badge.color}`}>
                          {extracted.category_label || badge.label}
                        </span>
                        {doc.file_path && (
                          <button
                            onClick={() => setActiveImage(imageUrl)}
                            className="text-xs font-black text-clinical-600 hover:text-clinical-800 flex items-center gap-1.5 transition-colors"
                          >
                            <span>View Scan</span>
                            <span className="text-sm">🔍</span>
                          </button>
                        )}
                      </div>

                      {/* In-Card Image Thumbnail */}
                      {doc.file_path && (
                        <div
                          onClick={() => setActiveImage(imageUrl)}
                          className="w-full h-48 rounded-2xl overflow-hidden mb-4 bg-slate-900/5 border border-slate-200 cursor-pointer group relative flex items-center justify-center"
                        >
                          <img
                            src={imageUrl}
                            alt="Scan preview"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.src = 'https://placehold.co/600x300?text=Diagnostic+Document';
                            }}
                          />
                          <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white font-black text-xs tracking-wider transition-opacity backdrop-blur-[1px]">
                            🔍 Click to Enlarge / Full View
                          </div>
                        </div>
                      )}

                      {/* AI Diagnosis Impression Headline */}
                      <div className="mb-4 bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
                        <span className="text-[9px] font-black uppercase tracking-widest text-clinical-600 block">
                          Primary Clinical Impression
                        </span>
                        <h4 className="text-sm font-black font-heading text-slate-900 mt-0.5 leading-snug">
                          {extracted.predicted_condition || extracted.one_line_summary || doc.original_name}
                        </h4>
                        {extracted.one_line_summary && (
                          <p className="text-[11px] text-slate-500 font-medium mt-1 leading-normal">
                            {extracted.one_line_summary}
                          </p>
                        )}
                      </div>

                      {/* 1. Essential Bullet Points Under Image with 🔴 🟡 🟢 Flags */}
                      {bullets.length > 0 && (
                        <div className="space-y-2 mb-4">
                          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block px-1">
                            Key Diagnostic Results & Observations
                          </span>
                          <div className="space-y-2">
                            {bullets.map((bullet, bIdx) => {
                              const isObj = typeof bullet === 'object' && bullet !== null;
                              const text = isObj ? bullet.text : bullet;
                              const flag = isObj ? bullet.flag : 'GREEN';
                              const flagStyle = getFindingFlagStyle(flag);

                              return (
                                <div
                                  key={bIdx}
                                  className={`p-2.5 rounded-xl border text-xs flex items-start gap-2.5 shadow-sm ${flagStyle.badge}`}
                                >
                                  <span className="text-sm leading-none mt-0.5">{flagStyle.icon}</span>
                                  <div className="flex-1">
                                    <span className="font-bold leading-snug block">{text}</span>
                                    {bullet.category && (
                                      <span className="block text-[10px] text-slate-500 font-semibold mt-0.5 uppercase tracking-wider">
                                        Area: {bullet.category}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* 2. Extracted Handwritten Prescription Medicines */}
                      {medications.length > 0 && (
                        <div className="mb-4 p-3 bg-amber-50/60 rounded-2xl border border-amber-200/80">
                          <span className="text-[10px] font-black uppercase tracking-wider text-amber-800 block mb-2">
                            💊 Extracted Prescription Medicines
                          </span>
                          <div className="space-y-1.5">
                            {medications.map((med, mIdx) => (
                              <div key={mIdx} className="bg-white p-2 rounded-xl border border-amber-200 text-xs flex items-center justify-between">
                                <div>
                                  <span className="font-black text-slate-900">{med.drug_name}</span>
                                  <span className="text-slate-500 text-[11px] ml-1.5 font-bold">({med.dosage})</span>
                                </div>
                                <span className="text-[10px] font-bold px-2 py-0.5 bg-amber-100 text-amber-900 rounded-md">
                                  {med.frequency} {med.notes ? `• ${med.notes}` : ''}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* 3. Biomarker Panel for Blood / Lab Reports */}
                      {biomarkers.length > 0 && (
                        <div className="mt-4 pt-3 border-t border-slate-100 overflow-x-auto">
                          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-2 px-1">
                            🩸 Lab Biomarkers & Reference Ranges
                          </span>
                          <table className="w-full text-left text-xs">
                            <thead>
                              <tr className="text-slate-400 font-extrabold uppercase border-b pb-1 text-[10px] tracking-wider">
                                <th className="pb-1">Parameter</th>
                                <th className="pb-1">Observed</th>
                                <th className="pb-1">Reference</th>
                                <th className="pb-1 text-right">Flag</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {biomarkers.map((b, bIdx) => {
                                const val = b.value ?? b.measured_value ?? 'N/A';
                                const refRange = b.normal_range || (b.ref_min && b.ref_max ? `${b.ref_min} - ${b.ref_max}` : 'N/A');
                                const flag = (b.flag || b.status || 'NORMAL').toUpperCase();

                                return (
                                  <tr key={bIdx} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="py-1.5 font-bold text-slate-800">{b.name}</td>
                                    <td className="py-1.5 font-mono font-bold text-slate-900">
                                      {val} <span className="text-[10px] font-normal text-slate-400">{b.unit || ''}</span>
                                    </td>
                                    <td className="py-1.5 font-mono text-[11px] text-slate-400">{refRange}</td>
                                    <td className="py-1.5 text-right font-black text-[11px]">
                                      <span className={`px-2 py-0.5 rounded-lg ${
                                        flag === 'CRITICAL' || flag === 'HIGH'
                                          ? 'bg-rose-100 text-rose-800 border border-rose-300 animate-pulse'
                                          : flag === 'LOW'
                                          ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                          : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                      }`}>
                                        {flag}
                                      </span>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
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