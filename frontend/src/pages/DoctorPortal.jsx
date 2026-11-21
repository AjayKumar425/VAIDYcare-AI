import React, { useState, useEffect, useRef } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { API_BASE } from '../utils/api';
import PrescriptionScanner from '../components/PrescriptionScanner';
import { animateSplitText, animateStaggerCards, animateTabTransition, animateScaleIn, gsap } from '../utils/animations';

const AYUSH_PARAM_LABELS = {
  prakriti: 'Prakriti (Constitution)', vikriti: 'Vikriti (Imbalance)',
  sara: 'Sara (Tissue Quality)', samhanana: 'Samhanana (Body Build)',
  satmya: 'Satmya (Food Adaptation)', sattva: 'Sattva (Mental Strength)',
  agni: 'Agni (Digestive Fire)', koshtha: 'Koshtha (Bowel Habit)',
  vyayama_shakti: 'Vyayama Shakti (Exercise Capacity)',
  vaya: 'Vaya (Life Stage)', ahara_shakti: 'Ahara Shakti (Appetite)',
  nidana: 'Nidana (Causative Factors)',
};

// ─────────────────────────────────────────────────────────────────────────────
// KEYWORD PANEL — Enhanced ML classification display for the Doctor Portal
// Groups by organ system, shows ICD-10 codes + suspected diseases + confidence
// ─────────────────────────────────────────────────────────────────────────────

const SYSTEM_ICONS = {
  Cardiac:          { icon: '♥', color: 'text-rose-600',    bg: 'bg-rose-50',    border: 'border-rose-200'   },
  Respiratory:      { icon: '🫁', color: 'text-sky-600',     bg: 'bg-sky-50',     border: 'border-sky-200'    },
  Neurological:     { icon: '🧠', color: 'text-violet-600',  bg: 'bg-violet-50',  border: 'border-violet-200' },
  Gastrointestinal: { icon: '○', color: 'text-orange-600',  bg: 'bg-orange-50',  border: 'border-orange-200' },
  Musculoskeletal:  { icon: '⊕', color: 'text-amber-700',   bg: 'bg-amber-50',   border: 'border-amber-200'  },
  Urological:       { icon: '◉', color: 'text-cyan-600',    bg: 'bg-cyan-50',    border: 'border-cyan-200'   },
  Endocrine:        { icon: '⚡', color: 'text-yellow-700',  bg: 'bg-yellow-50',  border: 'border-yellow-200' },
  Psychiatric:      { icon: '◈', color: 'text-purple-600',  bg: 'bg-purple-50',  border: 'border-purple-200' },
  Dermatological:   { icon: '◌', color: 'text-pink-600',    bg: 'bg-pink-50',    border: 'border-pink-200'   },
  Infectious:       { icon: '⚠', color: 'text-teal-600',    bg: 'bg-teal-50',    border: 'border-teal-200'   },
  Oncological:      { icon: '◎', color: 'text-red-700',     bg: 'bg-red-50',     border: 'border-red-200'    },
  Haematological:   { icon: '◈', color: 'text-rose-700',    bg: 'bg-rose-50',    border: 'border-rose-200'   },
  Vascular:         { icon: '→', color: 'text-indigo-600',  bg: 'bg-indigo-50',  border: 'border-indigo-200' },
  Hepatic:          { icon: '◉', color: 'text-lime-700',    bg: 'bg-lime-50',    border: 'border-lime-200'   },
  Obstetric:        { icon: '♀', color: 'text-fuchsia-600', bg: 'bg-fuchsia-50', border: 'border-fuchsia-200'},
  Immunological:    { icon: '◎', color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200'},
  Metabolic:        { icon: '⚡', color: 'text-yellow-600',  bg: 'bg-yellow-50',  border: 'border-yellow-200' },
  Ophthalmological: { icon: '◉', color: 'text-blue-600',    bg: 'bg-blue-50',    border: 'border-blue-200'   },
  Preventive:       { icon: '✓', color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200'},
  General:          { icon: '○', color: 'text-slate-600',   bg: 'bg-slate-50',   border: 'border-slate-200'  },
};

const PRIORITY_STYLES = {
  RED:    { badge: 'bg-rose-50 text-rose-800 border-rose-300',   dot: 'bg-rose-500 animate-pulse', label: 'CRITICAL', icon: '!' },
  YELLOW: { badge: 'bg-amber-50 text-amber-800 border-amber-300', dot: 'bg-amber-500',              label: 'MODERATE', icon: '~' },
  GREEN:  { badge: 'bg-emerald-50 text-emerald-800 border-emerald-200', dot: 'bg-emerald-500',       label: 'STABLE',   icon: '✓' },
};

// ─────────────────────────────────────────────────────────────────────────────
// MEDICAL KEYWORD COLORIZER
// Dynamically highlights critical conditions (RED), warnings (YELLOW), and
// normal findings (GREEN) directly inline within report results & bullet points.
// ─────────────────────────────────────────────────────────────────────────────

const RED_MEDICAL_TERMS = [
  'brain tumor', 'brain mass', 'intracranial mass', 'intracranial neoplasm', 'intracranial hemorrhage',
  'subarachnoid hemorrhage', 'subdural hematoma', 'epidural hematoma', 'midline shift', 'mass effect',
  'cerebral edema', 'glioblastoma', 'glioma', 'meningioma', 'astrocytoma', 'carcinomatosis',
  'pulmonary embolism', 'tension pneumothorax', 'pneumothorax', 'aortic dissection',
  'myocardial infarction', 'cardiac arrest', 'ventricular tachycardia', 'ventricular fibrillation',
  'displaced fracture', 'comminuted fracture', 'depressed skull fracture', 'compound fracture',
  'perforated viscus', 'viscus perforation', 'perforation', 'perforated', 'ruptured aneurysm',
  'ruptured appendix', 'rupture', 'ruptured', 'respiratory failure', 'septic shock', 'sepsis',
  'active bleeding', 'massive hemorrhage', 'haemorrhage', 'hemorrhage', 'tumor', 'tumour',
  'malignant', 'malignancy', 'carcinoma', 'cancer', 'metastasis', 'metastatic', 'sarcoma',
  'infarction', 'stroke', 'ischemia', 'ischemic', 'fracture', 'consolidation', 'lobar pneumonia',
  'pneumonia', 'abscess', 'gangrene', 'necrosis', 'critical', 'emergency', 'life-threatening',
  'acute abdomen', 'severe'
];

const YELLOW_MEDICAL_TERMS = [
  'ground glass opacity', 'pleural effusion', 'pericardial effusion', 'joint effusion',
  'pulmonary nodule', 'tissue nodule', 'soft tissue mass', 'suspicious lesion', 'calcification',
  'cardiomegaly', 'hepatomegaly', 'splenomegaly', 'lymphadenopathy', 'disc herniation',
  'disc bulge', 'spondylolisthesis', 'spondylosis', 'severe arthritis', 'elevated creatinine',
  'elevated troponin', 'elevated d-dimer', 'elevated wbc', 'reduced ejection fraction',
  'hyperglycemia', 'hypoglycemia', 'hypokalemia', 'hyponatremia', 'atrial fibrillation',
  'tachycardia', 'bradycardia', 'hypertension', 'hypotension', 'effusion', 'nodule',
  'lesion', 'mass', 'opacity', 'infiltrate', 'shadow', 'edema', 'oedema', 'swelling',
  'anemia', 'anaemia', 'thrombocytopenia', 'leukocytosis', 'infection', 'inflammation',
  'fever', 'chills', 'vomiting', 'diarrhea', 'diarrhoea', 'elevated', 'increased',
  'reduced', 'decreased', 'borderline', 'suspicious', 'mild', 'moderate', 'irregular',
  'abnormal', 'infiltrative', 'proteinuria', 'glycosuria'
];

const GREEN_MEDICAL_TERMS = [
  'within normal limits', 'normal study', 'unremarkable', 'no acute abnormality',
  'no evidence of malignancy', 'no focal lesion', 'no acute fracture', 'clear lung fields',
  'intact', 'preserved', 'patent', 'well-aerated', 'symmetric', 'benign', 'stable',
  'negative', 'normal', 'resolved'
];

const buildMedicalRegex = () => {
  const allTerms = [...RED_MEDICAL_TERMS, ...YELLOW_MEDICAL_TERMS, ...GREEN_MEDICAL_TERMS];
  const sorted = allTerms.sort((a, b) => b.length - a.length);
  const escaped = sorted.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
  return new RegExp(`(\\b(?:${escaped})\\b)`, 'gi');
};

const ALL_MEDICAL_REGEX = buildMedicalRegex();
const RED_SET = new Set(RED_MEDICAL_TERMS.map(t => t.toLowerCase()));
const YELLOW_SET = new Set(YELLOW_MEDICAL_TERMS.map(t => t.toLowerCase()));
const GREEN_SET = new Set(GREEN_MEDICAL_TERMS.map(t => t.toLowerCase()));

export function HighlightMedicalText({ text, className = '' }) {
  if (!text || typeof text !== 'string') return <span className={className}>{text || ''}</span>;

  const parts = text.split(ALL_MEDICAL_REGEX);

  return (
    <span className={`leading-relaxed ${className}`}>
      {parts.map((part, idx) => {
        if (!part) return null;
        const lower = part.toLowerCase();
        const isRed = RED_SET.has(lower);
        const isYellow = !isRed && YELLOW_SET.has(lower);
        const isGreen = !isRed && !isYellow && GREEN_SET.has(lower);

        if (isRed) {
          return (
            <span
              key={idx}
              className="inline-flex items-center gap-1 px-1.5 py-0.5 mx-0.5 rounded-md font-black text-rose-700 bg-rose-100 border border-rose-300 shadow-xs text-[11px] align-baseline print:text-rose-900 print:bg-rose-100 print:border-rose-400"
              title="Critical Clinical Finding"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-pulse flex-shrink-0 print:hidden" />
              {part}
            </span>
          );
        }
        if (isYellow) {
          return (
            <span
              key={idx}
              className="inline-flex items-center gap-1 px-1.5 py-0.5 mx-0.5 rounded-md font-bold text-amber-800 bg-amber-100 border border-amber-300 shadow-xs text-[11px] align-baseline print:text-amber-900 print:bg-amber-100"
              title="Moderate / Watch Indicator"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 flex-shrink-0 print:hidden" />
              {part}
            </span>
          );
        }
        if (isGreen) {
          return (
            <span
              key={idx}
              className="inline-flex items-center gap-0.5 px-1 py-0.5 mx-0.5 rounded-md font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 text-[11px] align-baseline print:text-emerald-900 print:bg-emerald-100"
              title="Normal Finding"
            >
              {part}
            </span>
          );
        }
        return <span key={idx}>{part}</span>;
      })}
    </span>
  );
}

function KeywordPanel({ keywords = [], overallCondition = 'STABLE', overallColor = 'GREEN', clinicalNote = '' }) {
  const [view, setView] = useState('system');   // 'system' | 'priority'
  const [copied, setCopied] = useState(false);

  const redKws    = keywords.filter(k => k.priority === 'RED');
  const yellowKws = keywords.filter(k => k.priority === 'YELLOW');
  const greenKws  = keywords.filter(k => k.priority === 'GREEN');

  // Group by organ system
  const bySystem = keywords.reduce((acc, k) => {
    const sys = k.organ_system || 'General';
    if (!acc[sys]) acc[sys] = [];
    acc[sys].push(k);
    return acc;
  }, {});

  // Sort systems: systems with RED first, then YELLOW, then GREEN
  const sortedSystems = Object.entries(bySystem).sort(([, a], [, b]) => {
    const rank = (arr) => arr.some(k => k.priority === 'RED') ? 3 : arr.some(k => k.priority === 'YELLOW') ? 2 : 1;
    return rank(b) - rank(a);
  });

  const copyToClipboard = () => {
    const lines = [
      `CLINICAL KEYWORD SUMMARY`,
      `Overall Condition: ${overallCondition}`,
      ``,
      `CRITICAL (${redKws.length}): ${redKws.map(k => `${k.keyword} [${k.icd_code || 'N/A'}]`).join(', ') || 'None'}`,
      `MODERATE (${yellowKws.length}): ${yellowKws.map(k => `${k.keyword} [${k.icd_code || 'N/A'}]`).join(', ') || 'None'}`,
      `ROUTINE  (${greenKws.length}): ${greenKws.map(k => k.keyword).join(', ') || 'None'}`,
      ``,
      `SUSPECTED CONDITIONS:`,
      ...redKws.concat(yellowKws).map(k => `  • ${k.keyword} → ${k.suspected_disease || k.rationale} (ICD-10: ${k.icd_code || 'N/A'}, Confidence: ${k.confidence || 'N/A'})`),
      ``,
      clinicalNote,
    ].join('\n');
    navigator.clipboard.writeText(lines).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2500); });
  };

  const headerBg = overallColor === 'RED' ? 'from-rose-600 to-rose-700' : overallColor === 'YELLOW' ? 'from-amber-500 to-amber-600' : 'from-emerald-600 to-emerald-700';

  return (
    <div className="rounded-2xl border border-slate-200 overflow-hidden shadow-sm">

      {/* ── Header bar ──────────────────────────────────────────────────── */}
      <div className={`bg-gradient-to-r ${headerBg} px-4 py-2.5`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-white text-xs font-black uppercase tracking-wider">🤖 AI Keyword Analysis</span>
            <span className={`text-[10px] font-black px-2 py-0.5 rounded-full bg-white/20 text-white`}>
              {overallCondition}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-white/80 text-[10px] font-bold hidden sm:block">
              {redKws.length} critical · {yellowKws.length} moderate · {greenKws.length} routine
            </span>
            <button
              onClick={copyToClipboard}
              className="text-[10px] font-black px-2.5 py-1 rounded-lg bg-white/20 hover:bg-white/30 text-white transition-all flex items-center gap-1"
            >
              {copied ? '✓ Copied' : '⎘ Export'}
            </button>
          </div>
        </div>

        {/* Severity meter */}
        <div className="mt-2 flex items-center gap-2">
          <div className="flex-1 h-1.5 bg-white/30 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-white transition-all duration-700"
              style={{ width: `${overallColor === 'RED' ? 95 : overallColor === 'YELLOW' ? 55 : 15}%` }}
            />
          </div>
          <span className="text-white/70 text-[9px] font-bold whitespace-nowrap">
            {overallColor === 'RED' ? 'High Severity' : overallColor === 'YELLOW' ? 'Moderate Severity' : 'Low Severity'}
          </span>
        </div>
      </div>

      {/* ── View toggle ──────────────────────────────────────────────────── */}
      <div className="flex gap-1 p-2 bg-slate-50 border-b border-slate-100">
        <button
          onClick={() => setView('system')}
          className={`px-3 py-1 rounded-lg text-[10px] font-extrabold transition-all ${view === 'system' ? 'bg-white text-slate-800 shadow-sm border border-slate-200' : 'text-slate-500 hover:text-slate-700'}`}
        >
          By Organ System
        </button>
        <button
          onClick={() => setView('priority')}
          className={`px-3 py-1 rounded-lg text-[10px] font-extrabold transition-all ${view === 'priority' ? 'bg-white text-slate-800 shadow-sm border border-slate-200' : 'text-slate-500 hover:text-slate-700'}`}
        >
          By Priority
        </button>
        <div className="ml-auto flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
          <span className="text-[9px] font-bold text-rose-600">{redKws.length} CRIT</span>
          <span className="w-2 h-2 rounded-full bg-amber-500 ml-1" />
          <span className="text-[9px] font-bold text-amber-600">{yellowKws.length} MOD</span>
          <span className="w-2 h-2 rounded-full bg-emerald-500 ml-1" />
          <span className="text-[9px] font-bold text-emerald-600">{greenKws.length} STABLE</span>
        </div>
      </div>

      {/* ── SYSTEM VIEW ─────────────────────────────────────────────────── */}
      {view === 'system' && (
        <div className="p-3 bg-white space-y-2.5">
          {sortedSystems.map(([system, kws]) => {
            const sysStyle = SYSTEM_ICONS[system] || SYSTEM_ICONS.General;
            const hasRed    = kws.some(k => k.priority === 'RED');
            const hasYellow = kws.some(k => k.priority === 'YELLOW');
            const systemBorder = hasRed ? 'border-rose-200 bg-rose-50/30' : hasYellow ? 'border-amber-200 bg-amber-50/20' : 'border-slate-100 bg-slate-50/40';
            return (
              <div key={system} className={`rounded-xl border p-3 ${systemBorder}`}>
                {/* System header */}
                <div className="flex items-center gap-1.5 mb-2">
                  <span className={`text-sm font-black ${sysStyle.color}`}>{sysStyle.icon}</span>
                  <span className="text-[10px] font-black text-slate-700 uppercase tracking-wide">{system}</span>
                  {hasRed && <span className="text-[9px] font-black text-rose-600 bg-rose-100 px-1.5 py-0.5 rounded-full">CRITICAL</span>}
                  {!hasRed && hasYellow && <span className="text-[9px] font-black text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded-full">MODERATE</span>}
                </div>
                {/* Keyword chips in this system */}
                <div className="flex flex-wrap gap-1.5">
                  {kws.map((k, i) => {
                    const ps = PRIORITY_STYLES[k.priority] || PRIORITY_STYLES.GREEN;
                    const tooltip = [
                      k.suspected_disease,
                      k.icd_code ? `ICD-10: ${k.icd_code}` : null,
                      k.confidence ? `Confidence: ${k.confidence}` : null,
                      k.organ_system ? `System: ${k.organ_system}` : null,
                    ].filter(Boolean).join(' · ');
                    return (
                      <span
                        key={i}
                        title={tooltip}
                        className={`inline-flex items-center gap-1 text-[10px] font-black px-2.5 py-1 rounded-full border cursor-help transition-all hover:shadow-sm ${ps.badge}`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${ps.dot}`} />
                        {k.keyword}
                        {k.icd_code && (
                          <span className="text-[8px] font-bold opacity-60 ml-0.5">{k.icd_code}</span>
                        )}
                      </span>
                    );
                  })}
                </div>
                {/* Suspected diseases from this system */}
                {kws.filter(k => k.suspected_disease && k.priority !== 'GREEN').length > 0 && (
                  <div className="mt-2 pt-2 border-t border-white/60">
                    <div className="flex flex-wrap gap-1">
                      {[...new Set(kws.filter(k => k.suspected_disease && k.priority !== 'GREEN').map(k => k.suspected_disease))].map((disease, di) => (
                        <span key={di} className="text-[9px] font-bold px-2 py-0.5 bg-white/80 text-slate-600 rounded-full border border-slate-200">
                          {disease}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── PRIORITY VIEW ────────────────────────────────────────────────── */}
      {view === 'priority' && (
        <div className="p-3 bg-white space-y-2">
          {/* RED */}
          {redKws.length > 0 && (
            <div className="rounded-xl border border-rose-200 bg-rose-50/40 p-3">
              <span className="text-[9px] font-black text-rose-600 uppercase tracking-widest block mb-2">🔴 Critical / Emergency</span>
              <div className="flex flex-wrap gap-1.5">
                {redKws.map((k, i) => (
                  <span key={i}
                    title={`${k.suspected_disease || k.rationale}${k.icd_code ? ' · ICD-10: ' + k.icd_code : ''}${k.confidence ? ' · ' + k.confidence : ''}`}
                    className="inline-flex items-center gap-1 text-[10px] font-black px-2.5 py-1 rounded-full border bg-rose-50 text-rose-800 border-rose-300 cursor-help hover:shadow-sm transition-all">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse flex-shrink-0" />
                    {k.keyword}
                    {k.icd_code && <span className="text-[8px] opacity-60">{k.icd_code}</span>}
                    {k.confidence && <span className="text-[9px] font-bold text-rose-500 bg-rose-100 px-1 rounded">{k.confidence}</span>}
                  </span>
                ))}
              </div>
            </div>
          )}
          {/* YELLOW */}
          {yellowKws.length > 0 && (
            <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-3">
              <span className="text-[9px] font-black text-amber-700 uppercase tracking-widest block mb-2">🟡 Moderate / Monitor</span>
              <div className="flex flex-wrap gap-1.5">
                {yellowKws.map((k, i) => (
                  <span key={i}
                    title={`${k.suspected_disease || k.rationale}${k.icd_code ? ' · ICD-10: ' + k.icd_code : ''}${k.confidence ? ' · ' + k.confidence : ''}`}
                    className="inline-flex items-center gap-1 text-[10px] font-black px-2.5 py-1 rounded-full border bg-amber-50 text-amber-800 border-amber-300 cursor-help hover:shadow-sm transition-all">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 flex-shrink-0" />
                    {k.keyword}
                    {k.icd_code && <span className="text-[8px] opacity-60">{k.icd_code}</span>}
                    {k.confidence && <span className="text-[9px] font-bold text-amber-600 bg-amber-100 px-1 rounded">{k.confidence}</span>}
                  </span>
                ))}
              </div>
            </div>
          )}
          {/* GREEN */}
          {greenKws.length > 0 && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/30 p-3">
              <span className="text-[9px] font-black text-emerald-700 uppercase tracking-widest block mb-2">🟢 Routine / Stable</span>
              <div className="flex flex-wrap gap-1.5">
                {greenKws.map((k, i) => (
                  <span key={i}
                    title={`${k.suspected_disease || k.rationale}${k.icd_code ? ' · ICD-10: ' + k.icd_code : ''}`}
                    className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full border bg-emerald-50 text-emerald-800 border-emerald-200 cursor-help hover:shadow-sm transition-all">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0" />
                    {k.keyword}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="px-3 pb-2 bg-white">
        <p className="text-[9px] text-slate-400 font-semibold">
          Hover any keyword for suspected disease, ICD-10 code &amp; ML confidence score. Click "Export" to copy clinical summary.
        </p>
      </div>
    </div>
  );
}

export const getImageUrl = (filePath) => {
  if (!filePath) return '';
  if (filePath.startsWith('http://') || filePath.startsWith('https://') || filePath.startsWith('data:')) {
    return filePath;
  }
  const cleanPath = filePath.startsWith('/') ? filePath : `/${filePath}`;
  return `${API_BASE}${cleanPath}`;
};

// ─────────────────────────────────────────────────────────────────────────────
// DIAGNOSTIC IMAGE VIEWER MODAL (Patient Uploaded Scans & Reports)
// Supports High-Res Zoom, Rotate, Invert (X-Ray Negative Film), and New Tab
// ─────────────────────────────────────────────────────────────────────────────
function ImageViewerModal({ image, onClose }) {
  const [zoom, setZoom] = useState(1);
  const [inverted, setInverted] = useState(false);
  const [rotation, setRotation] = useState(0);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!image) return null;

  const imageUrl = typeof image === 'string' ? image : image.url;
  const imageTitle = typeof image === 'object' ? (image.title || image.docType || 'Patient Diagnostic Scan') : 'Patient Diagnostic Scan';
  const docType = typeof image === 'object' ? image.docType : null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 cursor-pointer animate-in fade-in duration-200"
    >
      <div
        className="bg-slate-900 border border-slate-700/80 text-white rounded-3xl max-w-5xl w-full max-h-[95vh] flex flex-col overflow-hidden shadow-2xl cursor-default"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header & Controls */}
        <div className="flex flex-wrap items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-slate-950/70 gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-clinical-600/30 border border-clinical-500/40 flex items-center justify-center text-xl shadow-inner">
              🩻
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-black text-white">{imageTitle}</span>
                {docType && (
                  <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-clinical-500/20 text-clinical-300 border border-clinical-500/30">
                    {docType}
                  </span>
                )}
              </div>
              <span className="text-[10px] text-slate-400 font-semibold">Patient Uploaded Medical Scan Viewer</span>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {/* Zoom Out */}
            <button
              onClick={() => setZoom((z) => Math.max(0.5, Number((z - 0.25).toFixed(2))))}
              className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 border border-slate-700 active:scale-95 transition-all"
              title="Zoom Out"
            >
              −
            </button>
            <span className="text-[11px] font-mono px-1.5 text-slate-300 font-black min-w-[45px] text-center">
              {Math.round(zoom * 100)}%
            </span>
            {/* Zoom In */}
            <button
              onClick={() => setZoom((z) => Math.min(3, Number((z + 0.25).toFixed(2))))}
              className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 border border-slate-700 active:scale-95 transition-all"
              title="Zoom In"
            >
              +
            </button>
            {/* Reset Zoom */}
            <button
              onClick={() => { setZoom(1); setRotation(0); setInverted(false); }}
              className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-[11px] font-bold text-slate-300 border border-slate-700 active:scale-95 transition-all"
              title="Reset Zoom & Rotation"
            >
              Reset
            </button>

            {/* Rotate */}
            <button
              onClick={() => setRotation((r) => (r + 90) % 360)}
              className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-[11px] font-bold text-slate-300 border border-slate-700 active:scale-95 transition-all"
              title="Rotate 90°"
            >
              ↻ Rotate
            </button>

            {/* Invert / Negative (X-ray film mode) */}
            <button
              onClick={() => setInverted((inv) => !inv)}
              className={`px-3 py-1.5 rounded-xl text-[11px] font-bold border transition-all ${
                inverted
                  ? 'bg-amber-400 text-slate-950 border-amber-300 font-black shadow-sm'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
              }`}
              title="Invert Image (X-ray Film View)"
            >
              🌓 {inverted ? 'Normal' : 'Invert (X-ray)'}
            </button>

            {/* Open in New Window */}
            <a
              href={imageUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3.5 py-1.5 rounded-xl bg-clinical-600 hover:bg-clinical-500 text-white text-xs font-black shadow-md flex items-center gap-1 active:scale-95 transition-all"
              title="Open full resolution image in new browser tab"
            >
              ↗ Open Full Tab
            </a>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded-xl bg-rose-600/80 hover:bg-rose-600 text-white text-xs font-black transition-all ml-1 active:scale-95"
            >
              ✕ Close
            </button>
          </div>
        </div>

        {/* Viewport */}
        <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-slate-950/90 min-h-[50vh] max-h-[78vh]">
          <img
            src={imageUrl}
            alt={imageTitle}
            style={{
              transform: `scale(${zoom}) rotate(${rotation}deg)`,
              filter: inverted ? 'invert(1) contrast(1.2)' : 'none',
              transition: 'transform 0.15s ease-out',
            }}
            className="max-h-[75vh] w-auto max-w-full object-contain rounded-xl shadow-2xl select-none"
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = 'https://placehold.co/800x600/1e293b/ffffff?text=Document+Image+Unavailable';
            }}
          />
        </div>

        {/* Footer info bar */}
        <div className="px-5 py-2 border-t border-slate-800/80 bg-slate-950 text-slate-400 text-[10px] flex items-center justify-between">
          <span>Tip: Click and drag, use zoom buttons, or press <kbd className="bg-slate-800 px-1 py-0.5 rounded text-slate-300 font-mono">ESC</kbd> to exit viewer.</span>
          <span className="font-mono text-slate-500 max-w-xs truncate">{imageUrl}</span>
        </div>
      </div>
    </div>
  );
}

export default function DoctorPortal({ doctor }) {
  const [tokenInput, setTokenInput] = useState('');
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeImage, setActiveImage] = useState(null);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [editFields, setEditFields] = useState({ chief_complaint: '', clinical_note: '', doctor_notes: '', status: 'IN_PROGRESS' });
  const [activeTab, setActiveTab] = useState('summary');
  const reportRef = useRef(null);

  const printReport = () => {
    const el = reportRef.current;
    if (!el) return;
    const w = window.open('', '_blank');
    w.document.write(`<!DOCTYPE html><html><head><title>VAIDYcare-AI Clinical Report - ${encounter.token_number || tokenInput}</title>
      <script src="https://cdn.tailwindcss.com"></script>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 11px; color: #0f172a; background: #fff; padding: 24px; }
        @media print {
          body { padding: 12px; }
          .no-print { display: none !important; }
        }
      </style>
    </head><body><div class="max-w-4xl mx-auto">${el.innerHTML}</div></body></html>`);
    w.document.close();
    setTimeout(() => { w.focus(); w.print(); }, 600);
  };

  const fetchEncounter = async (tokenToFetch) => {
    const targetToken = (tokenToFetch || tokenInput).trim();
    if (!targetToken) return;
    setError(''); setData(null); setLoading(true); setSaveSuccess(false); setEditMode(false);
    try {
      const res = await fetch(`${API_BASE}/api/doctor/encounter/${targetToken}`);
      const result = await res.json();
      if (!result.success) throw new Error(result.message || result.error || 'Encounter record not found');
      setData(result.encounter || result);
      setTokenInput(targetToken);
      setScannerOpen(false);
      const enc = result.encounter?.session || result.encounter || {};
      setEditFields({
        chief_complaint: enc.chief_complaint || '',
        clinical_note: enc.triage_summary?.clinical_note || '',
        doctor_notes: enc.doctor_notes || '',
        status: enc.status || 'IN_PROGRESS',
      });
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  const saveEdits = async () => {
    const targetToken = tokenInput.trim();
    if (!targetToken) return;
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/api/doctor/encounter/${targetToken}/summary`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editFields),
      });
      const result = await res.json();
      if (!result.success) throw new Error(result.message || 'Save failed');
      setSaveSuccess(true);
      setEditMode(false);
      await fetchEncounter(targetToken);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) { setError(err.message); }
    finally { setSaving(false); }
  };

  useEffect(() => {
    let qrScanner = null;
    if (scannerOpen) {
      qrScanner = new Html5QrcodeScanner('qr-reader-container', { fps: 10, qrbox: { width: 240, height: 240 } }, false);
      qrScanner.render((decodedText) => {
        try { const parsed = JSON.parse(decodedText); if (parsed.tokenNumber) fetchEncounter(parsed.tokenNumber); else fetchEncounter(decodedText); }
        catch { fetchEncounter(decodedText); }
        qrScanner.clear();
      }, () => {});
    }
    return () => { if (qrScanner) qrScanner.clear().catch(() => {}); };
  }, [scannerOpen]);

  const encounter = data?.session || data?.encounter || data || {};
  const patient = encounter.patient || { full_name: encounter.full_name || 'Patient', age: encounter.age || 'N/A', gender: encounter.gender || 'N/A', phone: encounter.phone || 'N/A', abha_id: encounter.abha_id || null };
  const triage = encounter.triage_summary || { risk_level: 'SAFE', risk_score: 10, clinical_note: 'Routine intake registered.', highlighted_keywords: [], suspected_diseases: [] };
  const docs = encounter.documents || data?.documents || [];
  const hpi = encounter.structured_hpi || {};
  const ayushData = hpi.ayush_dashavidha_pariksha || null;
  const careMode = encounter.care_mode || 'general';

  const parsedSymptoms = (() => {
    if (!encounter.symptoms) return [];
    if (Array.isArray(encounter.symptoms)) return encounter.symptoms;
    try { return JSON.parse(encounter.symptoms); } catch { return [encounter.symptoms]; }
  })();

  const getDocTypeBadge = (type) => {
    const t = (type || '').toUpperCase();
    if (t.includes('XRAY') || t.includes('X_RAY') || t.includes('RADIOLOGY')) return { label: 'Radiology / X-Ray', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' };
    if (t.includes('CBC') || t.includes('PATHOLOGY') || t.includes('BLOOD')) return { label: 'Pathology / CBC Panel', color: 'bg-rose-50 text-rose-700 border-rose-200' };
    if (t.includes('BIOCHEM') || t.includes('LIPID') || t.includes('LFT') || t.includes('KFT')) return { label: 'Biochemistry Panel', color: 'bg-teal-50 text-teal-700 border-teal-200' };
    if (t.includes('RX') || t.includes('PRESCRIPTION')) return { label: 'Prescription (Rx)', color: 'bg-amber-50 text-amber-700 border-amber-200' };
    if (t.includes('ECG') || t.includes('CARDIOLOGY')) return { label: 'Cardiology / ECG', color: 'bg-purple-50 text-purple-700 border-purple-200' };
    return { label: 'Clinical Record', color: 'bg-slate-100 text-slate-700 border-slate-200' };
  };

  const getFindingFlagStyle = (flag) => {
    const f = (flag || 'GREEN').toUpperCase();
    if (f === 'RED' || f === 'CRITICAL' || f === 'SEVERE') return { badge: 'bg-rose-50/90 text-rose-900 border-rose-200', dot: 'bg-rose-600 animate-pulse', icon: 'CRIT', label: 'CRITICAL' };
    if (f === 'YELLOW' || f === 'WARNING' || f === 'MODERATE') return { badge: 'bg-amber-50/90 text-amber-900 border-amber-200', dot: 'bg-amber-500', icon: 'WARN', label: 'WARNING' };
    return { badge: 'bg-emerald-50/90 text-emerald-900 border-emerald-200', dot: 'bg-emerald-500', icon: 'OK', label: 'NORMAL' };
  };

  const getKeywordStyle = (kw) => {
    const k = (kw || '').toUpperCase();
    const red = ['FRACTURE','DISPLACED','PNEUMONIA','SEVERE','CRITICAL','CHEST PAIN','BLEEDING','CONSOLIDATION'];
    const yellow = ['ANEMIA','ELEVATED','DIABETES','FEVER','MODERATE','BORDERLINE','DEFICIENCY','INFLAMMATION'];
    if (red.some(p => k.includes(p))) return 'bg-rose-100 text-rose-800 border-rose-300';
    if (yellow.some(p => k.includes(p))) return 'bg-amber-100 text-amber-800 border-amber-300';
    return 'bg-emerald-100 text-emerald-800 border-emerald-300';
  };

  // Classify each interview answer as RED / YELLOW / GREEN for quick doctor triage
  const getAnswerFlag = (label, value) => {
    const v = (Array.isArray(value) ? value.join(' ') : (value || '')).toUpperCase();
    const l = (label || '').toUpperCase();

    // RED — always critical regardless of field
    const redValues = [
      'SEVERE','10 (WORST','7-9','CHEST PAIN','HEAVY BLEEDING','COUGHING BLOOD','VOMITING BLOOD',
      'HEART SURGERY','HEART DISEASE','CANCER','KIDNEY DISEASE','LIVER DISEASE',
      'ALLERGIC TO PENICILLIN','ALLERGIC TO ASPIRIN','MULTIPLE MEDICINES',
      'SPREADS TO BACK','SPREADS TO CHEST','SHORTNESS OF BREATH','WHEEZING',
      'HIGH FEVER','CURRENT SMOKER - 10 OR MORE','HEAVY','STROKE'
    ];
    // YELLOW — borderline / needs attention
    const yellowValues = [
      'MODERATE','4-6','DIABETES','HYPERTENSION','ASTHMA','THYROID','ARTHRITIS',
      'HEART DISEASE','ABDOMINAL SURGERY','ORTHOPAEDIC SURGERY','BLOOD PRESSURE MEDICINE',
      'DIABETES MEDICINE','PAIN KILLERS','ALLERGIC TO','EX-SMOKER','REGULARLY - MODERATE',
      'LOW GRADE FEVER','NAUSEA','DIARRHEA','CONSTIPATION','ACIDITY',
      'COUGH WITH PHLEGM','DRY COUGH','HEADACHE','DIZZINESS','NUMBNESS',
      'COMES AND GOES','WORSE AT NIGHT','WORSE IN MORNING','SPREADS TO LEGS',
      'HIGH SUGAR','FASTING FREQUENTLY','CHEWING TOBACCO'
    ];

    if (redValues.some(r => v.includes(r))) return 'RED';
    if (yellowValues.some(y => v.includes(y))) return 'YELLOW';
    // Field-level RED triggers
    if ((l.includes('SEVERITY') || l.includes('PAIN')) && (v.includes('SEVERE') || v.includes('10') || v.includes('7-9'))) return 'RED';
    if (l.includes('ALLERGY') && !v.includes('NO KNOWN')) return 'YELLOW';
    if (l.includes('PAST MEDICAL') && !v.includes('NONE')) return 'YELLOW';
    if (l.includes('FAMILY') && !v.includes('NONE')) return 'YELLOW';
    if (l.includes('SMOKING') && !v.includes('NEVER')) return 'YELLOW';
    if (l.includes('ALCOHOL') && !v.includes('NO ALCOHOL') && !v.includes('OCCASIONALLY')) return 'YELLOW';
    return 'GREEN';
  };

  const answerFlagStyles = {
    RED:    { card: 'bg-rose-50 border-rose-200',   label: 'text-rose-400',   value: 'text-rose-800',   dot: 'bg-rose-500 animate-pulse', badge: 'bg-rose-100 text-rose-700 border-rose-300' },
    YELLOW: { card: 'bg-amber-50 border-amber-200', label: 'text-amber-500',  value: 'text-amber-900',  dot: 'bg-amber-400', badge: 'bg-amber-100 text-amber-700 border-amber-300' },
    GREEN:  { card: 'bg-emerald-50/60 border-emerald-100', label: 'text-emerald-500', value: 'text-slate-800', dot: 'bg-emerald-400', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  };

  const riskColor = triage.risk_level === 'SEVERE' ? 'bg-rose-100 text-rose-800 border-rose-300' : triage.risk_level === 'MODERATE' ? 'bg-amber-100 text-amber-800 border-amber-300' : 'bg-emerald-100 text-emerald-800 border-emerald-300';

  return (
    <div className="space-y-5">

      {/* ── SEARCH HEADER ─────────────────────────────────────────────── */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-[11px] font-extrabold text-clinical-600 tracking-widest uppercase">OPD Physician Desk</span>
          <h2 className="text-2xl font-black font-heading text-slate-900 tracking-tight">Clinical Diagnostic Console</h2>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <button onClick={() => setScannerOpen(!scannerOpen)} className={`px-4 py-2.5 rounded-2xl text-xs font-extrabold transition-all flex items-center gap-2 shadow-sm ${scannerOpen ? 'bg-rose-600 text-white' : 'bg-slate-100 text-slate-700 border border-slate-200'}`}>
            {scannerOpen ? 'X Close Camera' : 'Scan QR Slip'}
          </button>
          <input placeholder="Token (e.g. V-4821)" value={tokenInput} onChange={e => setTokenInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && fetchEncounter()} className="w-48 px-4 py-2.5 text-sm font-mono font-bold rounded-2xl border border-slate-200 bg-slate-50 focus:bg-white outline-none uppercase text-slate-800 placeholder:text-slate-400" />
          <button onClick={() => fetchEncounter()} disabled={loading} className="px-6 py-2.5 rounded-2xl bg-gradient-to-r from-clinical-600 to-clinical-700 text-white text-xs font-extrabold shadow-md">{loading ? 'Loading...' : 'Load Case'}</button>
        </div>
      </div>

      {scannerOpen && (
        <div className="bg-white rounded-3xl border-2 border-clinical-400 p-6 shadow-xl max-w-md mx-auto text-center">
          <h3 className="text-base font-extrabold font-heading text-slate-900 mb-1">Align Patient QR Slip in Viewfinder</h3>
          <p className="text-xs text-slate-400 mb-4">Point camera at the QR code on the patient slip</p>
          <div id="qr-reader-container" className="rounded-2xl overflow-hidden border border-slate-200"></div>
        </div>
      )}

      {error && <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold">Error: {error}</div>}
      {saveSuccess && <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold">Summary saved successfully!</div>}

      {/* ── PATIENT CARD ───────────────────────────────────────────────── */}
      {data && (
        <div className="space-y-4">
          <div className="bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-clinical-500 to-brand-500 flex items-center justify-center text-white font-black text-xl shadow-md flex-shrink-0">
                  {(patient.full_name || 'P')[0].toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-black font-heading text-slate-900">{patient.full_name || 'Patient'}</h3>
                    {careMode === 'ayush' && <span className="px-2 py-0.5 rounded-lg bg-emerald-100 text-emerald-700 text-[10px] font-black border border-emerald-200">AYUSH OPD</span>}
                  </div>
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    <span className="text-xs text-slate-400 font-bold">{patient.age}Y - {patient.gender}</span>
                    {patient.phone && <span className="text-xs text-slate-400 font-bold">Ph: {patient.phone}</span>}
                    {patient.abha_id && <span className="text-[10px] font-mono bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-md font-bold">ABHA: {patient.abha_id}</span>}
                  </div>
                  <div className="mt-1 text-xs text-slate-600 font-semibold">"{encounter.chief_complaint}"</div>
                  {parsedSymptoms.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {parsedSymptoms.map((s, i) => <span key={i} className="text-[10px] font-bold px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full border border-slate-200">{s}</span>)}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex flex-col items-end gap-2">
                <div className="text-center bg-slate-900 text-white rounded-2xl px-5 py-3 shadow-md">
                  <span className="text-[10px] font-black uppercase tracking-widest block text-slate-400">Token</span>
                  <span className="text-2xl font-black font-heading">{encounter.token_number || tokenInput}</span>
                </div>
                <span className={`text-[11px] font-black px-3 py-1 rounded-full uppercase border tracking-wide ${riskColor}`}>
                  {triage.risk_level || 'SAFE'} RISK
                </span>
              </div>
            </div>
          </div>

          {/* ── TABS ─────────────────────────────────────────────────────── */}
          <div className="flex flex-wrap gap-1 bg-white border border-slate-200 rounded-2xl p-1 shadow-sm w-fit">
            {[
              {id:'summary',label:'Clinical Summary'},
              {id:'report',label:'Essential Report'},
              {id:'history',label:'Full History'},
              {id:'ayush',label:'Dashavidha Pariksha',disabled:!ayushData},
              {id:'documents',label:`Documents (${docs.length})`},
              {id:'rx',label:'💊 Rx Scanner'},
            ].map(tab => (
              <button key={tab.id} disabled={tab.disabled} onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all disabled:opacity-30 disabled:cursor-not-allowed ${
                  activeTab === tab.id
                    ? tab.id === 'report' ? 'bg-gradient-to-r from-rose-600 to-clinical-600 text-white shadow-sm' : tab.id === 'rx' ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-sm' : 'bg-clinical-600 text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                }`}>{tab.label}</button>
            ))}
          </div>

          {/* ── TAB: CLINICAL SUMMARY ─────────────────────────────────────── */}
          {activeTab === 'summary' && (
            <div className="space-y-4">
              {/* Triage banner */}
              <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[11px] font-black text-clinical-600 uppercase tracking-wider">AI Triage Summary</span>
                  <div className="flex gap-2">
                    {!editMode ? (
                      <button onClick={() => setEditMode(true)} className="px-3 py-1.5 text-xs font-extrabold rounded-xl bg-slate-100 text-slate-700 border border-slate-200 hover:bg-clinical-50 hover:border-clinical-200 hover:text-clinical-700 transition-all">Edit Summary</button>
                    ) : (
                      <>
                        <button onClick={() => setEditMode(false)} className="px-3 py-1.5 text-xs font-bold rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50">Cancel</button>
                        <button onClick={saveEdits} disabled={saving} className="px-4 py-1.5 text-xs font-extrabold rounded-xl bg-clinical-600 text-white hover:bg-clinical-700 disabled:opacity-60">{saving ? 'Saving...' : 'Confirm & Save'}</button>
                      </>
                    )}
                  </div>
                </div>
                {!editMode ? (
                  <div className="space-y-4">
                    <p className="text-sm text-slate-700 leading-relaxed font-medium">{triage.clinical_note}</p>

                    {/* ── Enhanced Python ML Keyword Flagging Panel ── */}
                    {triage.flagged_keywords?.length > 0 && (
                      <KeywordPanel keywords={triage.flagged_keywords} overallCondition={triage.overall_condition} overallColor={triage.overall_condition_color} clinicalNote={triage.clinical_note} />
                    )}

                    {/* Fallback: plain keyword pills (old format) */}
                    {!triage.flagged_keywords?.length && triage.highlighted_keywords?.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {triage.highlighted_keywords.map((kw, i) => <span key={i} className={`text-[10px] font-black px-2.5 py-0.5 rounded-full border ${getKeywordStyle(kw)}`}>{kw}</span>)}
                      </div>
                    )}

                    {triage.suspected_diseases?.length > 0 && (
                      <div>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">🧠 Differential Diagnoses (Python AI)</span>
                        <div className="flex flex-wrap gap-1.5">
                          {triage.suspected_diseases.map((d, i) => (
                            <span key={i} className="px-2.5 py-1 rounded-xl text-xs font-bold bg-indigo-50 text-indigo-800 border border-indigo-200">
                              {typeof d === 'string' ? d : d.disease || d.condition || 'Unknown Condition'}{d.confidence ? ` (${d.confidence})` : ''}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {docs.length > 0 && (
                      <div className="mt-4 border-t border-slate-100 pt-4">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-2">📄 AI Document Analysis Summaries</span>
                        <div className="space-y-3">
                          {docs.map((d, i) => (
                            <div key={i} className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-xs font-bold text-slate-700">{d.doc_type || d.original_name}</span>
                                <div className="flex items-center gap-1.5">
                                  {d.file_path && (
                                    <button
                                      type="button"
                                      onClick={() => setActiveImage({ url: getImageUrl(d.file_path), title: d.original_name || d.doc_type, docType: d.doc_type })}
                                      className="text-[10px] font-black px-2.5 py-1 rounded-lg bg-clinical-50 text-clinical-700 hover:bg-clinical-100 border border-clinical-200 transition-all flex items-center gap-1 active:scale-95"
                                    >
                                      👁️ Open Image
                                    </button>
                                  )}
                                  {d.extracted_data && d.extracted_data.doc_type && <span className="text-[9px] px-2 py-0.5 bg-blue-100 text-blue-700 rounded-md font-bold uppercase border border-blue-200">AI Analyzed</span>}
                                </div>
                              </div>
                              {d.extracted_data ? (
                                <>
                                  <div className="text-xs text-slate-700 italic mb-2.5 bg-white p-2.5 rounded-lg border border-slate-200">
                                    <span className="text-[9px] font-black uppercase text-clinical-600 block mb-0.5 not-italic">Impression</span>
                                    <HighlightMedicalText text={d.extracted_data.one_line_summary} />
                                  </div>
                                  {Array.isArray(d.extracted_data.essential_bullet_points) && (
                                    <ul className="space-y-1.5">
                                      {d.extracted_data.essential_bullet_points.map((bp, j) => {
                                        const text = typeof bp === 'object' ? bp.text : bp;
                                        const flag = typeof bp === 'object' ? bp.flag : 'GREEN';
                                        const flagBadge = flag === 'RED' ? 'bg-rose-100 text-rose-800 border-rose-300' : flag === 'YELLOW' ? 'bg-amber-100 text-amber-800 border-amber-300' : 'bg-emerald-100 text-emerald-800 border-emerald-300';
                                        return (
                                          <li key={j} className="flex gap-2 text-xs text-slate-800 items-start bg-white p-2 rounded-lg border border-slate-100">
                                            <span className={`text-[8px] font-black px-1.5 py-0.5 rounded border mt-0.5 ${flagBadge}`}>{flag}</span>
                                            <div className="leading-snug flex-1"><HighlightMedicalText text={text} /></div>
                                          </li>
                                        );
                                      })}
                                    </ul>
                                  )}
                                </>
                              ) : (
                                <p className="text-xs text-slate-400 italic">Document uploaded but no AI summary available.</p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                ) : (
                  <div className="space-y-3">
                    <div><label className="text-xs font-extrabold text-slate-600 block mb-1">Chief Complaint</label><input value={editFields.chief_complaint} onChange={e => setEditFields(p => ({...p, chief_complaint: e.target.value}))} className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 outline-none bg-slate-50 focus:bg-white" /></div>
                    <div><label className="text-xs font-extrabold text-slate-600 block mb-1">Clinical Note (AI Summary — editable)</label><textarea rows={4} value={editFields.clinical_note} onChange={e => setEditFields(p => ({...p, clinical_note: e.target.value}))} className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 outline-none bg-slate-50 focus:bg-white resize-none" /></div>
                    <div><label className="text-xs font-extrabold text-slate-600 block mb-1">Doctor Notes (private)</label><textarea rows={3} value={editFields.doctor_notes} onChange={e => setEditFields(p => ({...p, doctor_notes: e.target.value}))} className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 outline-none bg-slate-50 focus:bg-white resize-none" placeholder="Add clinical observations, examination findings, plan..." /></div>
                    <div><label className="text-xs font-extrabold text-slate-600 block mb-1">Encounter Status</label><select value={editFields.status} onChange={e => setEditFields(p => ({...p, status: e.target.value}))} className="px-3 py-2 text-sm rounded-xl border border-slate-200 outline-none bg-slate-50 font-bold"><option value="PENDING">Pending</option><option value="IN_PROGRESS">In Progress</option><option value="COMPLETED">Completed</option></select></div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── TAB: ESSENTIAL REPORT (PRINTABLE) ────────────────────────── */}
          {activeTab === 'report' && (
            <div className="space-y-5">
              {/* Executive Action Bar (Screen Only) */}
              <div className="bg-gradient-to-r from-slate-900 via-clinical-950 to-slate-900 text-white rounded-3xl p-5 sm:p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4 border border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-clinical-600/30 border border-clinical-400/40 flex items-center justify-center text-2xl shadow-inner">
                    📋
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black uppercase tracking-widest text-clinical-400 bg-clinical-950/80 px-2 py-0.5 rounded-md border border-clinical-800/60">
                        Official Clinical Summary
                      </span>
                      <span className="text-[10px] font-bold text-slate-400">
                        Encounter #{encounter.token_number || tokenInput}
                      </span>
                    </div>
                    <h3 className="text-xl font-black font-heading text-white tracking-tight mt-0.5">
                      Essential Medical &amp; Diagnostic Report
                    </h3>
                  </div>
                </div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <button
                    onClick={() => {
                      const textToCopy = `VAIDYcare-AI CLINICAL REPORT\nToken: ${encounter.token_number || tokenInput}\nPatient: ${patient.full_name || 'Patient'} (${patient.age}Y - ${patient.gender})\nTriage Risk: ${triage.risk_level || 'SAFE'} (${triage.overall_condition})\n\nCHIEF COMPLAINT:\n${encounter.chief_complaint}\n\nDIAGNOSTIC FINDINGS:\n${docs.flatMap(d => (d.extracted_data?.essential_bullet_points || []).map(b => `• [${typeof b === 'object' ? b.flag : 'NOTE'}] ${typeof b === 'object' ? b.text : b}`)).join('\n')}\n\nCLINICAL NOTE:\n${triage.clinical_note}`;
                      navigator.clipboard.writeText(textToCopy);
                      alert('✓ Clinical summary copied to clipboard!');
                    }}
                    className="px-4 py-2.5 rounded-2xl text-xs font-black bg-white/10 hover:bg-white/20 text-white border border-white/20 transition-all flex items-center gap-2 shadow-sm"
                  >
                    ⎘ Copy Text Summary
                  </button>
                  <button
                    onClick={printReport}
                    className="px-5 py-2.5 rounded-2xl text-xs font-black bg-gradient-to-r from-clinical-500 to-clinical-600 hover:from-clinical-400 hover:to-clinical-500 text-white transition-all flex items-center gap-2 shadow-lg shadow-clinical-900/40 border border-clinical-400/30 hover:scale-[1.02]"
                  >
                    🖨 Print Official Report (PDF)
                  </button>
                </div>
              </div>

              {/* Printable Medical Sheet Container */}
              <div
                ref={reportRef}
                className="bg-white rounded-3xl border-2 border-slate-200/90 p-6 sm:p-8 shadow-sm space-y-6 text-slate-800 print:p-0 print:border-none print:shadow-none"
              >
                {/* 1. Hospital / Clinic Official Document Header */}
                <div className="border-b-2 border-slate-900/80 pb-5 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-clinical-700 text-white flex items-center justify-center font-black text-2xl shadow-md">
                      +
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h1 className="text-2xl font-black font-heading text-slate-900 tracking-tight">
                          VAIDYcare<span className="text-clinical-600">-AI</span>
                        </h1>
                        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-clinical-100 text-clinical-800 border border-clinical-200">
                          Verified OPD
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 font-semibold tracking-wide mt-0.5">
                        Clinical Diagnostic Engine &amp; Multi-Modal Triage Report
                      </p>
                    </div>
                  </div>

                  <div className="text-left sm:text-right space-y-1">
                    <div className="inline-flex items-center gap-2 bg-slate-900 text-white px-3.5 py-1.5 rounded-xl font-mono text-sm font-black shadow-sm">
                      <span>TOKEN</span>
                      <span className="text-clinical-400">{encounter.token_number || tokenInput}</span>
                    </div>
                    <div className="text-[11px] text-slate-500 font-bold">
                      Date: {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })} • {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                    <div className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">
                      Care Mode: <span className="text-slate-800">{careMode.toUpperCase()} OPD</span>
                    </div>
                  </div>
                </div>

                {/* 2. Patient Profile & Triage Risk Overview (Executive Cards) */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Demographics Card */}
                  <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-200 space-y-2">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block border-b border-slate-200 pb-1">
                      Patient Information
                    </span>
                    <div className="space-y-1.5 text-xs">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500 font-medium">Full Name:</span>
                        <span className="font-black text-slate-900 text-sm">{patient.full_name || 'Patient'}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500 font-medium">Age / Gender:</span>
                        <span className="font-bold text-slate-800">{patient.age} Y • {patient.gender}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500 font-medium">Phone:</span>
                        <span className="font-mono font-bold text-slate-800">{patient.phone || 'N/A'}</span>
                      </div>
                      {patient.abha_id && (
                        <div className="flex justify-between items-center pt-1 border-t border-dashed border-slate-200">
                          <span className="text-slate-500 font-medium">ABHA ID:</span>
                          <span className="font-mono text-[11px] font-extrabold text-clinical-700 bg-clinical-50 px-1.5 py-0.5 rounded border border-clinical-200">{patient.abha_id}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Triage Assessment Card */}
                  <div className={`rounded-2xl p-4 border-2 space-y-2 ${
                    triage.risk_level === 'SEVERE'
                      ? 'bg-rose-50/90 border-rose-300'
                      : triage.risk_level === 'MODERATE'
                        ? 'bg-amber-50/90 border-amber-300'
                        : 'bg-emerald-50/90 border-emerald-300'
                  }`}>
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider block border-b border-slate-200/60 pb-1">
                      AI Triage Severity
                    </span>
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-xl font-black text-white shadow-md ${
                        triage.risk_level === 'SEVERE' ? 'bg-rose-600' : triage.risk_level === 'MODERATE' ? 'bg-amber-500' : 'bg-emerald-600'
                      }`}>
                        {triage.risk_level === 'SEVERE' ? '🚨' : triage.risk_level === 'MODERATE' ? '⚠️' : '✓'}
                      </div>
                      <div>
                        <div className={`text-sm font-black tracking-wide ${
                          triage.risk_level === 'SEVERE' ? 'text-rose-800' : triage.risk_level === 'MODERATE' ? 'text-amber-800' : 'text-emerald-800'
                        }`}>
                          {triage.risk_level || 'SAFE'} RISK LEVEL
                        </div>
                        <div className="text-xs font-bold text-slate-700 mt-0.5">
                          {triage.overall_condition || 'Routine Stable Presentation'}
                        </div>
                      </div>
                    </div>
                    <div className="pt-2 text-[10px] font-bold text-slate-500 flex items-center justify-between border-t border-slate-200/60">
                      <span>Severity Score:</span>
                      <span className="font-mono font-black text-xs text-slate-800">{triage.risk_score || 10}/100</span>
                    </div>
                  </div>

                  {/* Consultation / Care Mode Card */}
                  <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-200 space-y-2">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block border-b border-slate-200 pb-1">
                      Clinical Assignment
                    </span>
                    <div className="space-y-1.5 text-xs">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500 font-medium">Department:</span>
                        <span className="font-black text-slate-800">{careMode === 'ayush' ? 'AYUSH Holistic Care' : 'General OPD'}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500 font-medium">Physician:</span>
                        <span className="font-bold text-slate-800">{doctor?.name || 'Assigned Duty Medical Officer'}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500 font-medium">Status:</span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-100 text-blue-800 border border-blue-200">
                          {encounter.status || 'IN_PROGRESS'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center pt-1 border-t border-dashed border-slate-200">
                        <span className="text-slate-500 font-medium">Documents:</span>
                        <span className="font-bold text-slate-800">{docs.length} diagnostic scan(s)</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3. Chief Complaint & Reported Symptoms */}
                <div className="bg-white rounded-2xl border-2 border-slate-200 p-4 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-clinical-500"></span>
                      Chief Clinical Complaint &amp; History
                    </span>
                  </div>
                  <div className="p-3.5 bg-slate-50/80 rounded-xl border border-slate-200 text-sm font-semibold text-slate-800 leading-relaxed">
                    "<HighlightMedicalText text={encounter.chief_complaint} />"
                  </div>

                  {triage.red_flags?.length > 0 && (
                    <div className="p-3 rounded-xl bg-rose-50 border border-rose-200">
                      <span className="text-[10px] font-black text-rose-700 uppercase tracking-wider block mb-1.5 flex items-center gap-1">
                        🚨 Direct Emergency Red Flags
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {triage.red_flags.map((rf, i) => (
                          <span key={i} className="text-xs font-black px-2.5 py-1 rounded-lg bg-rose-100 text-rose-900 border border-rose-300">
                            {rf}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {parsedSymptoms.length > 0 && (
                    <div>
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1.5">
                        Recorded Symptoms
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {parsedSymptoms.map((s, i) => (
                          <span key={i} className="text-xs font-bold px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 border border-slate-200">
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* 4. AI Diagnostic Documents & Analysis (ALL REPORTS WITH INLINE COLOR HIGHLIGHTING) */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b-2 border-slate-200 pb-2">
                    <div>
                      <span className="text-[10px] font-black text-clinical-600 uppercase tracking-wider block">
                        Diagnostic Modality Findings
                      </span>
                      <h4 className="text-base font-black text-slate-900">
                        Essential Report &amp; Diagnostic Scan Results ({docs.length} Uploaded)
                      </h4>
                    </div>
                    <span className="text-xs font-bold text-slate-400">
                      AI Computer Vision &amp; Clinical Extraction
                    </span>
                  </div>

                  {docs.length === 0 ? (
                    <div className="p-6 rounded-2xl border-2 border-dashed border-slate-200 text-center bg-slate-50/50">
                      <p className="text-sm font-bold text-slate-500">No diagnostic scans or laboratory reports uploaded for this patient.</p>
                      <p className="text-xs text-slate-400 mt-1">Intake recorded via digital clinical interview.</p>
                    </div>
                  ) : (
                    docs.map((d, i) => {
                      const extracted = d.extracted_data || d.ai_prediction || {};
                      const bullets = extracted.essential_bullet_points || extracted.findings || [];
                      const biomarkers = extracted.biomarkers || d.biomarkers || [];
                      const medications = extracted.extracted_medications || [];
                      const docTypeStr = (d.doc_type || extracted.doc_type || d.original_name || '').toLowerCase();
                      
                      const hasCritical = bullets.some(bp => (typeof bp === 'object' ? bp.flag : 'GREEN') === 'RED');
                      const hasWarning = !hasCritical && bullets.some(bp => (typeof bp === 'object' ? bp.flag : 'GREEN') === 'YELLOW');
                      
                      const modalityIcon = docTypeStr.includes('x-ray') || docTypeStr.includes('xray') ? '🩻'
                        : docTypeStr.includes('brain') || docTypeStr.includes('mri') || docTypeStr.includes('ct') ? '🧠'
                        : docTypeStr.includes('blood') || docTypeStr.includes('cbc') || docTypeStr.includes('lab') ? '🧪'
                        : docTypeStr.includes('ecg') ? '📈'
                        : docTypeStr.includes('presc') || docTypeStr.includes('rx') ? '💊'
                        : '📄';

                      return (
                        <div key={i} className={`rounded-2xl border-2 overflow-hidden shadow-xs ${
                          hasCritical ? 'border-rose-200 bg-white' : hasWarning ? 'border-amber-200 bg-white' : 'border-slate-200 bg-white'
                        }`}>
                          {/* Report Header */}
                          <div className={`px-4 py-3 border-b flex flex-wrap items-center justify-between gap-2 ${
                            hasCritical ? 'bg-rose-50/80 border-rose-200' : hasWarning ? 'bg-amber-50/80 border-amber-200' : 'bg-slate-50 border-slate-200'
                          }`}>
                            <div className="flex items-center gap-2.5">
                              <span className="text-xl">{modalityIcon}</span>
                              <div>
                                <div className="flex items-center gap-2">
                                  <h5 className="text-sm font-black text-slate-900">
                                    {d.doc_type || d.original_name}
                                  </h5>
                                  {hasCritical && (
                                    <span className="text-[9px] font-black px-2 py-0.5 rounded-md bg-rose-600 text-white uppercase shadow-xs">
                                      CRITICAL REPORT
                                    </span>
                                  )}
                                  {hasWarning && (
                                    <span className="text-[9px] font-black px-2 py-0.5 rounded-md bg-amber-500 text-white uppercase shadow-xs">
                                      WATCH FINDINGS
                                    </span>
                                  )}
                                </div>
                                <span className="text-[10px] text-slate-500 font-semibold">
                                  {extracted.category_label || 'Diagnostic Imaging & Findings'}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              {d.file_path && (
                                <button
                                  type="button"
                                  onClick={() => setActiveImage({ url: getImageUrl(d.file_path), title: d.original_name || d.doc_type, docType: d.doc_type })}
                                  className="text-[11px] font-black px-3 py-1.5 rounded-xl bg-clinical-600 hover:bg-clinical-700 text-white transition-all shadow-xs flex items-center gap-1.5 active:scale-95"
                                >
                                  👁️ View Scan
                                </button>
                              )}
                              <span className="text-[9px] font-black px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-600 uppercase shadow-xs">
                                AI Analyzed ✓
                              </span>
                            </div>
                          </div>

                          <div className="p-4 sm:p-5 space-y-4">
                            {/* Patient Uploaded Scan Attachment Card */}
                            {d.file_path && (
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 bg-slate-50/90 rounded-2xl border border-slate-200 gap-3">
                                <div className="flex items-center gap-3">
                                  <div
                                    onClick={() => setActiveImage({ url: getImageUrl(d.file_path), title: d.original_name || d.doc_type, docType: d.doc_type })}
                                    className="w-16 h-16 rounded-xl overflow-hidden border-2 border-slate-200 bg-slate-900 cursor-pointer hover:scale-105 transition-transform flex-shrink-0 relative group shadow-sm"
                                    title="Click to open image viewer"
                                  >
                                    <img
                                      src={getImageUrl(d.file_path)}
                                      alt="Scan Thumbnail"
                                      className="w-full h-full object-cover"
                                      onError={(e) => { e.target.onerror = null; e.target.src = 'https://placehold.co/100x100?text=Scan'; }}
                                    />
                                    <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-xs font-black transition-opacity">
                                      🔍
                                    </div>
                                  </div>
                                  <div>
                                    <span className="text-[10px] font-black uppercase text-clinical-600 tracking-wider block">Patient Uploaded Document</span>
                                    <h6 className="text-xs font-bold text-slate-900 line-clamp-1">{d.original_name || 'Medical Scan Attachment'}</h6>
                                    <span className="text-[10px] text-slate-400 font-medium">Click thumbnail or button to inspect in full diagnostic viewer</span>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 flex-shrink-0">
                                  <button
                                    type="button"
                                    onClick={() => setActiveImage({ url: getImageUrl(d.file_path), title: d.original_name || d.doc_type, docType: d.doc_type })}
                                    className="px-4 py-2 rounded-xl bg-clinical-600 hover:bg-clinical-700 text-white text-xs font-black transition-all shadow-sm flex items-center gap-1.5 active:scale-95"
                                  >
                                    🔍 Open Image
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => window.open(getImageUrl(d.file_path), '_blank')}
                                    className="px-3 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-bold transition-all"
                                    title="Open raw file in new tab"
                                  >
                                    ↗ Tab
                                  </button>
                                </div>
                              </div>
                            )}

                            {/* Primary Clinical Impression Banner */}
                            {(extracted.predicted_condition || extracted.one_line_summary) && (
                              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1">
                                <span className="text-[9px] font-black uppercase tracking-widest text-clinical-600 block">
                                  Primary Clinical Impression
                                </span>
                                <div className="text-sm font-bold text-slate-900 leading-snug">
                                  <HighlightMedicalText text={extracted.predicted_condition || extracted.one_line_summary} />
                                </div>
                              </div>
                            )}

                            {/* Bullet Points with Inline Colored Medical Keywords */}
                            {bullets.length > 0 && (
                              <div className="space-y-2">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                                  Key Findings &amp; Observations ({bullets.length})
                                </span>
                                <div className="space-y-2">
                                  {bullets.map((bp, j) => {
                                    const text = typeof bp === 'object' ? bp.text : bp;
                                    const flag = typeof bp === 'object' ? (bp.flag || 'GREEN').toUpperCase() : 'GREEN';
                                    const isRed = flag === 'RED';
                                    const isYellow = flag === 'YELLOW';
                                    
                                    return (
                                      <div
                                        key={j}
                                        className={`p-3 rounded-xl border text-xs flex items-start gap-3 transition-all ${
                                          isRed
                                            ? 'bg-rose-50/70 border-rose-200 shadow-xs'
                                            : isYellow
                                              ? 'bg-amber-50/70 border-amber-200 shadow-xs'
                                              : 'bg-emerald-50/40 border-emerald-200'
                                        }`}
                                      >
                                        <div className="mt-0.5 flex-shrink-0">
                                          {isRed && (
                                            <span className="px-2 py-0.5 rounded-md bg-rose-600 text-white text-[9px] font-black tracking-wide uppercase shadow-xs flex items-center gap-1">
                                              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
                                              CRITICAL
                                            </span>
                                          )}
                                          {isYellow && (
                                            <span className="px-2 py-0.5 rounded-md bg-amber-500 text-white text-[9px] font-black tracking-wide uppercase shadow-xs">
                                              WATCH
                                            </span>
                                          )}
                                          {!isRed && !isYellow && (
                                            <span className="px-2 py-0.5 rounded-md bg-emerald-600 text-white text-[9px] font-black tracking-wide uppercase shadow-xs">
                                              ROUTINE
                                            </span>
                                          )}
                                        </div>

                                        <div className="flex-1 font-semibold leading-relaxed text-slate-800 text-xs">
                                          <HighlightMedicalText text={text} />
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}

                            {/* Biomarkers table if lab document */}
                            {biomarkers.length > 0 && (
                              <div className="pt-2 border-t border-slate-100">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-2">
                                  Extracted Lab Biomarkers ({biomarkers.length})
                                </span>
                                <div className="overflow-x-auto rounded-xl border border-slate-200">
                                  <table className="w-full text-xs text-left">
                                    <thead className="bg-slate-50 text-[10px] font-black uppercase text-slate-500 border-b border-slate-200">
                                      <tr>
                                        <th className="px-3 py-2">Parameter</th>
                                        <th className="px-3 py-2">Observed Value</th>
                                        <th className="px-3 py-2">Reference Range</th>
                                        <th className="px-3 py-2 text-right">Clinical Status</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                      {biomarkers.map((b, bIdx) => {
                                        const val = b.value ?? b.measured_value ?? 'N/A';
                                        const ref = b.normal_range || (b.ref_min && b.ref_max ? `${b.ref_min} - ${b.ref_max}` : 'N/A');
                                        const flag = (b.flag || b.status || 'NORMAL').toUpperCase();
                                        const isCrit = flag === 'CRITICAL' || flag === 'HIGH';
                                        const isLow = flag === 'LOW';
                                        return (
                                          <tr key={bIdx} className="hover:bg-slate-50/50">
                                            <td className="px-3 py-2 font-black text-slate-800">{b.name}</td>
                                            <td className="px-3 py-2 font-mono font-bold text-slate-900">{val} <span className="text-[10px] text-slate-400">{b.unit || ''}</span></td>
                                            <td className="px-3 py-2 font-mono text-[11px] text-slate-500">{ref}</td>
                                            <td className="px-3 py-2 text-right">
                                              <span className={`px-2 py-0.5 rounded text-[10px] font-black border ${
                                                isCrit ? 'bg-rose-100 text-rose-800 border-rose-300' : isLow ? 'bg-amber-100 text-amber-800 border-amber-300' : 'bg-emerald-100 text-emerald-800 border-emerald-200'
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
                              </div>
                            )}

                            {/* Extracted Medications if prescription */}
                            {medications.length > 0 && (
                              <div className="pt-2 border-t border-slate-100">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-2">
                                  Prescription Medicines ({medications.length})
                                </span>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                  {medications.map((m, mIdx) => (
                                    <div key={mIdx} className="p-2.5 rounded-xl bg-amber-50/60 border border-amber-200 text-xs flex justify-between items-center">
                                      <div>
                                        <span className="font-black text-slate-900">{m.drug_name}</span>
                                        {m.dosage && <span className="ml-1 text-[11px] font-bold text-amber-800">({m.dosage})</span>}
                                        {m.notes && <div className="text-[10px] text-slate-500">{m.notes}</div>}
                                      </div>
                                      <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-900 font-extrabold text-[10px]">
                                        {m.frequency}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* 5. AI Differential Diagnoses & Clinical Suspicions */}
                {triage.suspected_diseases?.length > 0 && (
                  <div className="bg-white rounded-2xl border-2 border-slate-200 p-4 sm:p-5 space-y-3">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                      🧠 AI Differential Diagnoses (Machine Learning Engine)
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {triage.suspected_diseases.map((sd, i) => {
                        const name = typeof sd === 'string' ? sd : sd.disease || sd.condition || 'Unknown Condition';
                        const conf = typeof sd === 'object' ? sd.confidence : null;
                        const trigger = typeof sd === 'object' ? sd.trigger : null;
                        const isHigh = conf === 'HIGH' || parseFloat(conf) >= 0.75;
                        return (
                          <div key={i} className={`p-3.5 rounded-xl border ${
                            isHigh ? 'bg-rose-50/70 border-rose-200' : 'bg-slate-50 border-slate-200'
                          }`}>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs font-black text-slate-900">{name}</span>
                              {conf && (
                                <span className={`text-[9px] font-black px-1.5 py-0.5 rounded ${
                                  isHigh ? 'bg-rose-200 text-rose-800' : 'bg-slate-200 text-slate-700'
                                }`}>
                                  Conf: {conf}
                                </span>
                              )}
                            </div>
                            {trigger && (
                              <p className="text-[11px] text-slate-500 font-medium">
                                Trigger: <HighlightMedicalText text={trigger} />
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 6. Clinical Narrative & Physician Addendum */}
                <div className="bg-white rounded-2xl border-2 border-slate-200 p-4 sm:p-5 space-y-3">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                    Clinical Assessment &amp; Notes
                  </span>
                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 leading-relaxed">
                    <HighlightMedicalText text={triage.clinical_note || 'Routine consultation recorded.'} />
                  </div>

                  {editFields.doctor_notes && (
                    <div className="pt-3 border-t border-dashed border-slate-200">
                      <span className="text-[10px] font-black text-clinical-600 uppercase tracking-wider block mb-1">
                        Physician Addendum &amp; Treatment Plan
                      </span>
                      <p className="p-3 bg-clinical-50/40 rounded-xl border border-clinical-200 text-xs text-slate-800 italic leading-relaxed">
                        {editFields.doctor_notes}
                      </p>
                    </div>
                  )}
                </div>

                {/* 7. Official Physician Attestation / Sign-off */}
                <div className="pt-4 border-t-2 border-slate-900/80 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div>
                    <div className="text-xs font-black text-slate-900">
                      Attending Physician: {doctor?.name || 'Dr. Medical Officer, MD'}
                    </div>
                    <div className="text-[10px] text-slate-500 font-semibold">
                      Medical Registration No: MCI-2024-883491 • Verified Electronic Health Record
                    </div>
                  </div>

                  <div className="text-center sm:text-right">
                    <div className="inline-block border-b border-slate-400 w-44 pb-1 text-center font-mono text-[10px] text-slate-400 italic">
                      [Digital Physician Attestation]
                    </div>
                    <div className="text-[9px] text-slate-400 font-bold mt-1">Authorized Electronic Signature</div>
                  </div>
                </div>

                {/* Document Legal Footer */}
                <div className="text-center pt-2 border-t border-slate-100">
                  <p className="text-[9px] text-slate-400 font-semibold">
                    CONFIDENTIAL PATIENT RECORD • Generated by VAIDYcare-AI Clinical Engine • Requires physician review and sign-off before clinical administration.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ── TAB: FULL HISTORY ─────────────────────────────────────────── */}
          {activeTab === 'history' && (
            <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-black text-clinical-600 uppercase tracking-wider">Complete Clinical History (SOCRATES)</span>
                <div className="flex items-center gap-3 text-[9px] font-black uppercase tracking-wider">
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-rose-500 inline-block"></span> Critical</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400 inline-block"></span> Watch</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400 inline-block"></span> Normal</span>
                </div>
              </div>

              {[
                { label: 'History of Present Illness', icon: 'O', obj: hpi.history_of_present_illness, keys: ['onset','character','radiation','timing','severity','aggravating_factors','relieving_factors'] },
                { label: 'Past Medical & Surgical History', icon: 'P', fields: [['Past Medical', hpi.past_medical_history], ['Past Surgical', hpi.past_surgical_history]] },
                { label: 'Drug & Allergy History', icon: 'D', fields: [['Current Medications', hpi.drug_history?.current_medications], ['Allergies', hpi.drug_history?.allergies]] },
                { label: 'Family History', icon: 'F', fields: [['Family History', hpi.family_history]] },
                { label: 'Personal & Social History', icon: 'Ps', fields: [['Smoking', hpi.personal_history?.smoking], ['Alcohol', hpi.personal_history?.alcohol], ['Diet', hpi.personal_history?.diet]] },
                { label: 'Review of Systems', icon: 'R', fields: [['Fever', hpi.review_of_systems?.fever], ['Gastrointestinal', hpi.review_of_systems?.gastrointestinal], ['Respiratory', hpi.review_of_systems?.respiratory], ['Neurological', hpi.review_of_systems?.neurological]] },
              ].map((section, si) => {
                // Compute flag summary for the section header
                const allVals = [
                  ...(section.obj ? section.keys.map(k => [k, section.obj[k]]) : []),
                  ...(section.fields || [])
                ].filter(([,v]) => v && v !== 'Not reported');
                const sectionFlags = allVals.map(([k, v]) => getAnswerFlag(k, v));
                const sectionHasRed = sectionFlags.includes('RED');
                const sectionHasYellow = !sectionHasRed && sectionFlags.includes('YELLOW');
                const sectionBorder = sectionHasRed ? 'border-rose-200 bg-rose-50/30' : sectionHasYellow ? 'border-amber-200 bg-amber-50/20' : 'border-slate-100 bg-slate-50/50';

                return (
                <div key={si} className={`rounded-2xl border p-4 ${sectionBorder}`}>
                  <div className="flex items-center gap-2 mb-3">
                    <span className={`w-6 h-6 rounded-lg text-white text-[10px] font-black flex items-center justify-center ${
                      sectionHasRed ? 'bg-rose-500' : sectionHasYellow ? 'bg-amber-500' : 'bg-clinical-600'
                    }`}>{section.icon}</span>
                    <span className="text-xs font-extrabold text-slate-700 uppercase tracking-wide">{section.label}</span>
                    {sectionHasRed && <span className="ml-auto text-[8px] font-black px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 border border-rose-200 uppercase tracking-wide">🔴 Needs Attention</span>}
                    {sectionHasYellow && <span className="ml-auto text-[8px] font-black px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200 uppercase tracking-wide">🟡 Watch</span>}
                  </div>
                  {section.obj && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {section.keys.map(k => {
                        const val = section.obj[k];
                        if (!val || val === 'Not reported') return null;
                        const flag = getAnswerFlag(k, val);
                        const st = answerFlagStyles[flag];
                        return (
                          <div key={k} className={`p-2.5 rounded-xl border ${st.card} relative`}>
                            <div className="flex items-center gap-1 mb-0.5">
                              <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${st.dot}`}></span>
                              <span className={`text-[9px] block font-bold uppercase ${st.label}`}>{k.replace(/_/g,' ')}</span>
                            </div>
                            <span className={`text-xs font-extrabold ${st.value}`}>{val}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {section.fields && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {section.fields.filter(([,v]) => v && v !== 'Not reported').map(([label, value]) => {
                        const flag = getAnswerFlag(label, value);
                        const st = answerFlagStyles[flag];
                        const displayVal = Array.isArray(value) ? value.join(', ') : value;
                        return (
                          <div key={label} className={`p-2.5 rounded-xl border ${st.card} relative`}>
                            <div className="flex items-center gap-1 mb-0.5">
                              <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${st.dot}`}></span>
                              <span className={`text-[9px] block font-bold uppercase ${st.label}`}>{label}</span>
                            </div>
                            <span className={`text-xs font-extrabold ${st.value}`}>{displayVal}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
              })}
            </div>
          )}

          {/* ── TAB: AYUSH DASHAVIDHA PARIKSHA ────────────────────────────── */}
          {activeTab === 'ayush' && ayushData && (
            <div className="bg-white rounded-3xl border border-emerald-200 p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-xl">Y</span>
                <div>
                  <span className="text-[11px] font-black text-emerald-600 uppercase tracking-wider block">Dashavidha Pariksha</span>
                  <span className="text-xs text-slate-400 font-semibold">10-Parameter Ayurvedic Examination</span>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {Object.entries(ayushData).map(([key, value]) => value && value !== 'Not reported' && (
                  <div key={key} className="p-3.5 rounded-2xl border border-emerald-100 bg-emerald-50/50">
                    <span className="text-[10px] font-black text-emerald-600 uppercase tracking-wider block mb-0.5">{AYUSH_PARAM_LABELS[key] || key}</span>
                    <span className="text-sm font-bold text-slate-800 leading-snug">{Array.isArray(value) ? value.join(', ') : value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── TAB: DOCUMENTS ────────────────────────────────────────────── */}
          {activeTab === 'documents' && docs.length > 0 && (
            <div className="space-y-4">
              <span className="text-[11px] font-black text-clinical-600 uppercase tracking-wider block px-1">Multimodal Diagnostic Analysis ({docs.length} Records)</span>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {docs.map((doc, idx) => {
                  const extracted = doc.extracted_data || doc.ai_prediction || {};
                  const badge = getDocTypeBadge(doc.doc_type || extracted.doc_type);
                  const bullets = extracted.essential_bullet_points || extracted.findings || [];
                  const medications = extracted.extracted_medications || [];
                  const biomarkers = extracted.biomarkers || doc.biomarkers || [];
                  const imageUrl = getImageUrl(doc.file_path);
                  return (
                    <div key={idx} className="bg-white rounded-3xl border-2 border-slate-200/90 p-5 shadow-sm hover:border-clinical-300 hover:shadow-md transition-all">
                      <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                        <span className={`px-3 py-1 rounded-xl text-[10px] font-black uppercase border ${badge.color}`}>{extracted.category_label || badge.label}</span>
                        {doc.file_path && (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setActiveImage({ url: imageUrl, title: doc.original_name || doc.doc_type, docType: doc.doc_type })}
                              className="text-xs font-black text-clinical-600 hover:text-clinical-800 bg-clinical-50 px-2.5 py-1 rounded-lg border border-clinical-200 flex items-center gap-1 active:scale-95"
                            >
                              👁️ View Scan
                            </button>
                            <button
                              onClick={() => window.open(imageUrl, '_blank')}
                              className="text-xs font-bold text-slate-500 hover:text-slate-800 bg-slate-50 px-2 py-1 rounded-lg border border-slate-200"
                              title="Open in new tab"
                            >
                              ↗
                            </button>
                          </div>
                        )}
                      </div>
                      {doc.file_path && (
                        <div
                          onClick={() => setActiveImage({ url: imageUrl, title: doc.original_name || doc.doc_type, docType: doc.doc_type })}
                          className="w-full h-44 rounded-2xl overflow-hidden mb-4 bg-slate-900 border border-slate-200 cursor-pointer group relative shadow-inner"
                        >
                          <img src={imageUrl} alt="Scan" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" onError={e => { e.target.onerror=null; e.target.src='https://placehold.co/600x300?text=Document'; }} />
                          <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white font-black text-xs transition-opacity gap-1.5">
                            <span>🔍 Click to Inspect Scan</span>
                          </div>
                        </div>
                      )}
                      <div className="mb-3 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                        <span className="text-[9px] font-black uppercase tracking-widest text-clinical-600 block">Primary Clinical Impression</span>
                        <h4 className="text-sm font-black text-slate-900 mt-0.5 leading-snug">
                          <HighlightMedicalText text={extracted.predicted_condition || extracted.one_line_summary || doc.original_name} />
                        </h4>
                      </div>
                      {bullets.length > 0 && (
                        <div className="space-y-2 mb-3">
                          {bullets.map((bullet, bIdx) => {
                            const isObj = typeof bullet === 'object' && bullet !== null;
                            const text = isObj ? bullet.text : bullet;
                            const flag = isObj ? bullet.flag : 'GREEN';
                            const flagStyle = getFindingFlagStyle(flag);
                            return (
                              <div key={bIdx} className={`p-2.5 rounded-xl border text-xs flex items-start gap-2 ${flagStyle.badge}`}>
                                <span className="text-[10px] font-black mt-0.5 flex-shrink-0">[{flagStyle.icon}]</span>
                                <div className="font-bold leading-snug flex-1">
                                  <HighlightMedicalText text={text} />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                      {medications.length > 0 && (
                        <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200 mb-3">
                          <span className="text-[10px] font-black uppercase text-amber-800 block mb-2">Extracted Medicines</span>
                          {medications.map((med, mIdx) => (
                            <div key={mIdx} className="bg-white p-2 rounded-xl border border-amber-200 text-xs flex justify-between mb-1">
                              <span className="font-black">{med.drug_name} <span className="text-slate-400 font-bold">({med.dosage})</span></span>
                              <span className="text-[10px] font-bold bg-amber-100 text-amber-900 px-2 py-0.5 rounded">{med.frequency}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      {biomarkers.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-slate-100 overflow-x-auto">
                          <span className="text-[10px] font-black uppercase text-slate-400 block mb-2">Lab Biomarkers</span>
                          <table className="w-full text-xs">
                            <thead><tr className="text-slate-400 font-extrabold uppercase text-[10px] border-b"><th className="pb-1 text-left">Parameter</th><th className="pb-1 text-left">Value</th><th className="pb-1 text-left">Reference</th><th className="pb-1 text-right">Flag</th></tr></thead>
                            <tbody className="divide-y divide-slate-100">
                              {biomarkers.map((b, bIdx) => {
                                const val = b.value ?? b.measured_value ?? 'N/A';
                                const ref = b.normal_range || (b.ref_min && b.ref_max ? `${b.ref_min}-${b.ref_max}` : 'N/A');
                                const flag = (b.flag || b.status || 'NORMAL').toUpperCase();
                                const flagStyle = flag === 'CRITICAL' || flag === 'HIGH' ? 'bg-rose-100 text-rose-800 border-rose-300' : flag === 'LOW' ? 'bg-amber-100 text-amber-800 border-amber-300' : 'bg-emerald-50 text-emerald-700 border-emerald-200';
                                return (
                                  <tr key={bIdx} className="hover:bg-slate-50/50">
                                    <td className="py-1.5 font-bold">{b.name}</td>
                                    <td className="py-1.5 font-mono font-bold">{val} <span className="text-[10px] text-slate-400">{b.unit || ''}</span></td>
                                    <td className="py-1.5 font-mono text-[11px] text-slate-400">{ref}</td>
                                    <td className="py-1.5 text-right"><span className={`px-2 py-0.5 rounded-lg border text-[10px] font-black ${flagStyle}`}>{flag}</span></td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          {activeTab === 'documents' && docs.length === 0 && (
            <div className="bg-white rounded-3xl border border-slate-200 p-10 text-center text-slate-400">
              <p className="text-2xl mb-2">No documents uploaded</p>
              <p className="text-xs font-semibold">Patient did not upload any diagnostic records during registration.</p>
            </div>
          )}

          {/* ── TAB: RX SCANNER ──────────────────────────────────────── */}
          {activeTab === 'rx' && (
            <div className="bg-white rounded-3xl border border-violet-200 p-5 shadow-sm">
              <PrescriptionScanner
                patientName={patient?.full_name}
                patientAge={patient?.age}
              />
            </div>
          )}

        </div>
      )}

      {/* ── DIAGNOSTIC IMAGE VIEWER MODAL ────────────────────────────── */}
      {activeImage && (
        <ImageViewerModal
          image={activeImage}
          onClose={() => setActiveImage(null)}
        />
      )}
    </div>
  );
}
