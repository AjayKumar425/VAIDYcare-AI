// frontend/src/components/PrescriptionScanner.jsx
// AI-powered handwritten prescription keyword extractor component.
// Paste raw OCR text or type the prescription → instant structured drug output.

import React, { useState, useRef, useEffect } from 'react';
import { API_BASE } from '../utils/api';
import { 
  animateSplitText, 
  animateStaggerCards, 
  animateOnScroll, 
  animateTabTransition,
  gsap 
} from '../utils/animations';

const FLAG_STYLES = {
  RED:    { card: 'border-rose-300 bg-rose-50',    badge: 'bg-rose-100 text-rose-800 border-rose-300',    dot: 'bg-rose-500 animate-pulse', icon: '🔴', label: 'HIGH RISK'  },
  YELLOW: { card: 'border-amber-300 bg-amber-50',  badge: 'bg-amber-100 text-amber-800 border-amber-300', dot: 'bg-amber-400',              icon: '🟡', label: 'MONITOR'    },
  GREEN:  { card: 'border-emerald-200 bg-emerald-50/60', badge: 'bg-emerald-100 text-emerald-800 border-emerald-200', dot: 'bg-emerald-400', icon: '🟢', label: 'ROUTINE' },
};

const RISK_BANNER = {
  HIGH:     { bg: 'bg-rose-600',   text: 'High Risk Prescription', icon: '🚨' },
  MODERATE: { bg: 'bg-amber-500',  text: 'Moderate Risk',          icon: '⚠️' },
  LOW:      { bg: 'bg-emerald-600',text: 'Low Risk / Routine',     icon: '✅' },
};

// ── Sample prescription text for demo ────────────────────────────────────────
const DEMO_TEXT = `Patient: John Doe, 58M
Dx: Hypertension, Type 2 Diabetes Mellitus, GERD
Allergy to Penicillin

Rx:
1. Metformin 500mg - BD (after food) x 30 days
2. Amlodipine 5mg - OD (morning) x 30 days
3. Pantoprazole 40mg - OD (before food) x 14 days
4. Aspirin 75mg - OD (after food)
5. Atorvastatin 10mg - HS x 30 days

Advice: Low salt diet. Avoid alcohol. Plenty of fluids. 
Review in 4 weeks. Blood test (HbA1c, lipid profile) after 3 months.
Do not drive after taking medication.`;

export default function PrescriptionScanner({ patientName, patientAge }) {
  const [rawText, setRawText] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeSection, setActiveSection] = useState('medicines');
  const printRef = useRef(null);

  const containerRef = useRef(null);
  const titleRef = useRef(null);
  const resultsRef = useRef(null);
  const bannerRef = useRef(null);
  const tabContentRef = useRef(null);

  // Mount animation: Subtle ScrollTrigger + SplitText heading
  useEffect(() => {
    const ctx = gsap.context(() => {
      if (containerRef.current) {
        animateOnScroll(containerRef.current);
      }
      if (titleRef.current) {
        animateSplitText(titleRef.current, { y: 6, duration: 0.4, stagger: 0.03 });
      }
    }, containerRef);

    return () => ctx.revert();
  }, []);

  // When result arrives: Subtle stagger reveal
  useEffect(() => {
    if (!result || !resultsRef.current) return;

    const ctx = gsap.context(() => {
      if (bannerRef.current) {
        gsap.fromTo(bannerRef.current, 
          { opacity: 0, y: -8 }, 
          { opacity: 1, y: 0, duration: 0.35, ease: 'power2.out' }
        );
      }

      const statCards = resultsRef.current.querySelectorAll('.rx-stat-card');
      if (statCards.length > 0) {
        animateStaggerCards(statCards, { y: 8, stagger: 0.04 });
      }

      const medCards = resultsRef.current.querySelectorAll('.rx-med-card');
      if (medCards.length > 0) {
        animateStaggerCards(medCards, { y: 10, stagger: 0.035 });
      }
    }, resultsRef);

    return () => ctx.revert();
  }, [result]);

  // Tab change transition
  useEffect(() => {
    if (tabContentRef.current) {
      animateTabTransition(tabContentRef.current);
    }
  }, [activeSection]);

  const analyzePrescription = async (text) => {
    const tx = (text || rawText).trim();
    if (!tx) { setError('Please paste or type the prescription text first.'); return; }
    setError(''); setLoading(true); setResult(null);
    try {
      const res = await fetch(`${API_BASE}/api/ai/parse-prescription`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ raw_text: tx, patient_name: patientName, patient_age: patientAge }),
      });
      const data = await res.json();
      if (data.error && !data.medicines?.length) throw new Error(data.error);
      setResult(data);
      setActiveSection('medicines');
    } catch (err) {
      setError(err.message || 'Prescription AI engine unavailable.');
    } finally {
      setLoading(false);
    }
  };

  const loadDemo = () => { setRawText(DEMO_TEXT); setResult(null); setError(''); };

  const printRx = () => {
    const el = printRef.current;
    if (!el) return;
    const w = window.open('', '_blank');
    w.document.write(`<!DOCTYPE html><html><head><title>Rx Analysis - VAIDYcare-AI</title><style>
      *{margin:0;padding:0;box-sizing:border-box}body{font-family:Arial,sans-serif;font-size:11px;color:#1e293b;padding:20px}
      h1{font-size:18px;font-weight:900}h2{font-size:13px;font-weight:800;margin-bottom:6px}
      h3{font-size:11px;font-weight:700;color:#475569;text-transform:uppercase;margin-bottom:4px}
      .header{display:flex;justify-content:space-between;border-bottom:2px solid #e2e8f0;padding-bottom:10px;margin-bottom:14px}
      .section{margin-bottom:12px;border:1px solid #e2e8f0;border-radius:6px;padding:10px}
      .med{margin-bottom:8px;padding:8px;border-radius:4px;border:1px solid #e2e8f0}
      .red{background:#fff1f2;border-color:#fca5a5}.yellow{background:#fffbeb;border-color:#fde68a}.green{background:#f0fdf4;border-color:#bbf7d0}
      .tag{display:inline-block;padding:1px 6px;border-radius:999px;font-size:9px;font-weight:800;margin:1px;border:1px solid}
      footer{margin-top:16px;padding-top:8px;border-top:1px solid #e2e8f0;font-size:9px;color:#94a3b8;text-align:center}
    </style></head><body>${el.innerHTML}</body></html>`);
    w.document.close();
    setTimeout(() => { w.focus(); w.print(); w.close(); }, 400);
  };

  const risk = result?.rx_risk_level || 'LOW';
  const riskStyle = RISK_BANNER[risk] || RISK_BANNER.LOW;

  return (
    <div ref={containerRef} className="space-y-4">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <span className="text-[10px] font-black text-clinical-600 uppercase tracking-widest block">AI Prescription Analyzer</span>
          <h3 ref={titleRef} className="text-base font-black text-slate-900">Handwritten Rx Keyword Extractor</h3>
          <p className="text-[11px] text-slate-400 mt-0.5">Paste OCR text or type the prescription → AI extracts drugs, doses, frequencies & flags</p>
        </div>
        <button onClick={loadDemo} className="px-3 py-1.5 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-200 text-[10px] font-black hover:bg-indigo-100 transition-all">
          Load Demo Rx
        </button>
      </div>

      {/* ── Input textarea ─────────────────────────────────────────────────── */}
      <div>
        <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1.5">
          Prescription Text (OCR or Typed)
        </label>
        <textarea
          rows={7}
          value={rawText}
          onChange={(e) => setRawText(e.target.value)}
          placeholder={`Paste handwritten prescription OCR text here...\n\nExample:\nDx: Hypertension\nMetformin 500mg BD after food x 30 days\nAmlodipine 5mg OD morning\nAvoid alcohol. Low salt diet.`}
          className="w-full px-4 py-3 text-xs font-mono text-slate-700 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:bg-white focus:border-clinical-400 resize-none transition-all leading-relaxed"
        />
        {error && <p className="text-xs text-rose-600 font-bold mt-1">⚠️ {error}</p>}
        <button
          onClick={() => analyzePrescription()}
          disabled={loading || !rawText.trim()}
          className="mt-2 w-full py-3 rounded-2xl bg-gradient-to-r from-clinical-600 to-brand-600 text-white font-black text-sm shadow-md hover:shadow-lg disabled:opacity-50 transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          {loading ? <><span className="animate-spin text-lg">⟳</span> Analyzing Prescription...</> : '🔍 Extract & Analyze Prescription'}
        </button>
      </div>

      {/* ── Results ────────────────────────────────────────────────────────── */}
      {result && (
        <div ref={resultsRef} className="space-y-4">

          {/* Risk banner */}
          <div ref={bannerRef} className={`${riskStyle.bg} rounded-2xl px-4 py-3 flex items-center justify-between text-white shadow-md`}>
            <div className="flex items-center gap-2">
              <span className="text-2xl">{riskStyle.icon}</span>
              <div>
                <span className="text-xs font-black uppercase tracking-wider">{riskStyle.text}</span>
                <div className="flex items-center gap-3 text-white/80 text-[10px] font-bold mt-0.5">
                  <span>🔴 {result.red_drugs_count} High-Risk</span>
                  <span>🟡 {result.yellow_drugs_count} Moderate</span>
                  <span>🟢 {result.green_drugs_count} Routine</span>
                  <span>Total: {result.total_medicines} medicines</span>
                </div>
              </div>
            </div>
            <button onClick={printRx} className="px-3 py-2 rounded-xl bg-white/20 hover:bg-white/30 text-white text-[10px] font-black transition-all">
              🖨 Print Rx
            </button>
          </div>

          {/* Diagnoses + Instructions strip */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {result.diagnoses?.length > 0 && (
              <div className="bg-indigo-50 rounded-2xl p-3 border border-indigo-200 rx-stat-card">
                <span className="text-[9px] font-black text-indigo-500 uppercase tracking-wider block mb-1.5">Dx — Extracted Diagnoses</span>
                <div className="flex flex-wrap gap-1">
                  {result.diagnoses.map((d, i) => (
                    <span key={i} className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 border border-indigo-200">{d}</span>
                  ))}
                </div>
              </div>
            )}
            {result.allergen_warnings?.length > 0 && (
              <div className="bg-rose-50 rounded-2xl p-3 border border-rose-200 rx-stat-card">
                <span className="text-[9px] font-black text-rose-500 uppercase tracking-wider block mb-1.5">⚠️ Allergen / Warnings</span>
                {result.allergen_warnings.map((w, i) => (
                  <div key={i} className="text-[10px] font-bold text-rose-700 flex items-center gap-1">
                    <span className="text-[8px] font-black px-1 py-0.5 bg-rose-100 border border-rose-200 rounded uppercase">{w.type}</span>
                    <span>{w.detail}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Instructions */}
          {result.special_instructions?.length > 0 && (
            <div className="bg-slate-50 rounded-xl px-4 py-2.5 border border-slate-200 flex flex-wrap gap-1.5 items-center rx-stat-card">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider mr-1">Instructions:</span>
              {result.special_instructions.map((ins, i) => (
                <span key={i} className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-white border border-slate-200 text-slate-600">{ins}</span>
              ))}
            </div>
          )}

          {/* Section tabs */}
          <div className="flex gap-1 bg-slate-50 rounded-2xl p-1 border border-slate-200 w-fit">
            {[
              { id: 'medicines', label: `💊 Medicines (${result.total_medicines})` },
              { id: 'symptoms', label: `🔬 Symptom Flags (${result.flagged_symptoms?.length || 0})` },
            ].map(tab => (
              <button key={tab.id} onClick={() => setActiveSection(tab.id)}
                className={`px-4 py-1.5 rounded-xl text-xs font-black transition-all ${activeSection === tab.id ? 'bg-clinical-600 text-white shadow-sm' : 'text-slate-500 hover:bg-white hover:text-slate-800'}`}>
                {tab.label}
              </button>
            ))}
          </div>

          {/* ── Tab Content Container with Micro-transition ─────────────────── */}
          <div ref={tabContentRef}>
            {/* ── Medicines tab ────────────────────────────────────────────── */}
            {activeSection === 'medicines' && (
              <div className="space-y-2">
                {result.medicines.length === 0 ? (
                  <div className="text-center py-8 text-slate-400 text-xs">No recognized drug names found. Try adding more details to the prescription text.</div>
                ) : (
                  result.medicines.map((med, i) => {
                    const st = FLAG_STYLES[med.flag] || FLAG_STYLES.GREEN;
                    return (
                      <div key={i} className={`rounded-2xl border-2 p-4 ${st.card} transition-all hover:shadow-md rx-med-card`}>
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <div className="flex items-center gap-2">
                            <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${st.dot} mt-0.5`}></span>
                            <div>
                              <span className="text-sm font-black text-slate-900">{med.drug_name}</span>
                              <span className="ml-2 text-[10px] font-bold text-slate-500">{med.drug_class}</span>
                            </div>
                          </div>
                          <span className={`text-[8px] font-black px-2 py-0.5 rounded-full border uppercase flex-shrink-0 ${st.badge}`}>
                            {st.icon} {st.label}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-2 ml-4">
                          {med.dosage && (
                            <span className="flex items-center gap-1 text-[10px] font-bold bg-white rounded-lg px-2 py-0.5 border border-slate-200">
                              <span className="text-slate-400">Dose:</span> {med.dosage}
                            </span>
                          )}
                          {med.frequency && (
                            <span className="flex items-center gap-1 text-[10px] font-bold bg-white rounded-lg px-2 py-0.5 border border-slate-200">
                              <span className="text-slate-400">Freq:</span> {med.frequency}
                            </span>
                          )}
                          {med.route && (
                            <span className="flex items-center gap-1 text-[10px] font-bold bg-white rounded-lg px-2 py-0.5 border border-slate-200">
                              <span className="text-slate-400">Route:</span> {med.route}
                            </span>
                          )}
                          {med.duration && (
                            <span className="flex items-center gap-1 text-[10px] font-bold bg-white rounded-lg px-2 py-0.5 border border-slate-200">
                              <span className="text-slate-400">For:</span> {med.duration}
                            </span>
                          )}
                          <span className="flex items-center gap-1 text-[10px] font-bold bg-white rounded-lg px-2 py-0.5 border border-slate-200">
                            <span className="text-slate-400">Use:</span> {med.typical_use}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* ── Symptom Flags tab ────────────────────────────────────────── */}
            {activeSection === 'symptoms' && (
              <div>
                {(!result.flagged_symptoms || result.flagged_symptoms.length === 0) ? (
                  <div className="text-center py-8 text-slate-400 text-xs">No clinical symptom keywords detected in this prescription.</div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {result.flagged_symptoms.map((k, i) => {
                      const st = FLAG_STYLES[k.priority] || FLAG_STYLES.GREEN;
                      return (
                        <div key={i} title={`${k.suspected_disease} (ICD: ${k.icd_code})`}
                          className={`border rounded-xl px-3 py-2 cursor-help ${st.card} rx-stat-card`}>
                          <div className="flex items-center gap-1.5">
                            <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`}></span>
                            <span className="text-xs font-black text-slate-800">{k.keyword}</span>
                          </div>
                          <div className="mt-0.5 ml-3 text-[9px] font-bold text-slate-500">{k.suspected_disease}</div>
                          {k.icd_code && <div className="ml-3 text-[8px] font-mono text-slate-400">ICD: {k.icd_code}</div>}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── Hidden printable area ────────────────────────────────────── */}
          <div ref={printRef} style={{ display: 'none' }}>
            <div className="header" style={{ display:'flex', justifyContent:'space-between', borderBottom:'2px solid #e2e8f0', paddingBottom:'10px', marginBottom:'14px' }}>
              <div>
                <h1 style={{ fontSize:'18px', fontWeight:'900' }}>VAIDYcare-AI — Rx Analysis</h1>
                <span style={{ fontSize:'10px', color:'#64748b', textTransform:'uppercase', fontWeight:'800' }}>Prescription Keyword Report</span>
              </div>
              <div style={{ textAlign:'right', fontSize:'11px', color:'#64748b' }}>{new Date().toLocaleDateString()} {new Date().toLocaleTimeString()}</div>
            </div>

            {result.diagnoses?.length > 0 && (
              <div className="section" style={{ border:'1px solid #e2e8f0', borderRadius:'6px', padding:'10px', marginBottom:'12px' }}>
                <h3 style={{ fontSize:'11px', fontWeight:'800', textTransform:'uppercase', marginBottom:'6px' }}>Diagnoses</h3>
                <p style={{ fontSize:'12px' }}>{result.diagnoses.join(', ')}</p>
              </div>
            )}

            <div className="section" style={{ border:'1px solid #e2e8f0', borderRadius:'6px', padding:'10px', marginBottom:'12px' }}>
              <h3 style={{ fontSize:'11px', fontWeight:'800', textTransform:'uppercase', marginBottom:'6px' }}>Medicines ({result.total_medicines})</h3>
              {result.medicines.map((med, i) => (
                <div key={i} className={`med ${med.flag.toLowerCase()}`} style={{ marginBottom:'6px', padding:'6px', borderRadius:'4px', border:'1px solid #e2e8f0', backgroundColor: med.flag === 'RED' ? '#fff1f2' : med.flag === 'YELLOW' ? '#fffbeb' : '#f0fdf4' }}>
                  <strong style={{ fontSize:'12px' }}>{i+1}. {med.drug_name}</strong>
                  <span style={{ marginLeft:'8px', fontSize:'10px', color:'#64748b' }}>[{med.flag}] {med.drug_class}</span>
                  <div style={{ fontSize:'10px', color:'#334155', marginTop:'2px' }}>
                    {[med.dosage && `Dose: ${med.dosage}`, med.frequency && `Freq: ${med.frequency}`, med.route && `Route: ${med.route}`, med.duration && `Duration: ${med.duration}`].filter(Boolean).join('  |  ')}
                  </div>
                </div>
              ))}
            </div>

            {result.allergen_warnings?.length > 0 && (
              <div style={{ border:'1px solid #fca5a5', borderRadius:'6px', padding:'10px', backgroundColor:'#fff1f2', marginBottom:'12px' }}>
                <h3 style={{ fontSize:'11px', fontWeight:'800', textTransform:'uppercase', marginBottom:'4px', color:'#991b1b' }}>⚠️ Allergen / Warnings</h3>
                {result.allergen_warnings.map((w, i) => (
                  <div key={i} style={{ fontSize:'11px', color:'#7f1d1d', fontWeight:'700' }}>[{w.type}] {w.detail}</div>
                ))}
              </div>
            )}

            {result.special_instructions?.length > 0 && (
              <div style={{ border:'1px solid #e2e8f0', borderRadius:'6px', padding:'10px', marginBottom:'12px' }}>
                <h3 style={{ fontSize:'11px', fontWeight:'800', textTransform:'uppercase', marginBottom:'4px' }}>Special Instructions</h3>
                <p style={{ fontSize:'11px' }}>{result.special_instructions.join(' · ')}</p>
              </div>
            )}

            <footer style={{ marginTop:'16px', paddingTop:'8px', borderTop:'1px solid #e2e8f0', fontSize:'9px', color:'#94a3b8', textAlign:'center' }}>
              Generated by VAIDYcare-AI Prescription Analyzer · AI-assisted only · Verify with prescribing physician
            </footer>
          </div>

        </div>
      )}
    </div>
  );
}
