import React, { useState, useRef, useEffect, useCallback } from 'react';
import { API_BASE } from '../utils/api';
import { useLanguage } from '../context/LanguageContext';
import { animateSplitText, animateStaggerCards, animateTabTransition, animateScaleIn, gsap } from '../utils/animations';

const GENERAL_FLOW = [
  { key: 'onset', section: 'HPI', type: 'choice', text: 'When did this start?', text_hi: 'यह कब शुरू हुआ?', options: ['Today', 'Last 2-3 days', 'This week', 'This month', 'Longer than a month'] },
  { key: 'character', section: 'HPI', type: 'choice', text: 'How does it feel?', text_hi: 'यह कैसा महसूस होता है?', options: ['Sharp / Stabbing', 'Dull / Aching', 'Burning', 'Throbbing / Pulsing', 'Pressure / Tightness'] },
  { key: 'radiation', section: 'HPI', type: 'choice', text: 'Does it spread or move to another area?', text_hi: 'क्या यह दूसरी जगह फैलता है?', options: ['Stays in one spot', 'Spreads to back / arm / neck', 'Spreads to legs', 'Spreads to chest', 'Not applicable'] },
  { key: 'timing', section: 'HPI', type: 'choice', text: 'Is it constant, or does it come and go?', text_hi: 'क्या यह लगातार है या रुक-रुक कर आता है?', options: ['Constant', 'Comes and goes', 'Worse in morning', 'Worse at night', 'After eating'] },
  { key: 'severity', section: 'HPI', type: 'choice', text: 'Rate your pain or discomfort (1=mild, 10=worst):', text_hi: 'दर्द की तीव्रता बताएं (1=हल्का, 10=असहनीय):', options: ['1-3 (Mild)', '4-6 (Moderate)', '7-9 (Severe)', '10 (Worst Possible)'] },
  { key: 'aggravating', section: 'HPI', type: 'choice', text: 'What makes it worse?', text_hi: 'किससे तकलीफ बढ़ती है?', options: ['Movement / Walking', 'Eating / Drinking', 'Stress / Anxiety', 'Cold weather', 'Nothing in particular'] },
  { key: 'relieving', section: 'HPI', type: 'choice', text: 'What gives you relief?', text_hi: 'किससे आराम मिलता है?', options: ['Rest', 'Medication / Painkillers', 'Heat / Ice pack', 'Food / Water', 'Nothing helps'] },
  { key: 'past_medical_history', section: 'Past History', type: 'multi', text: 'Any existing medical conditions? (Select all)', text_hi: 'कोई पुरानी बीमारी? (सभी चुनें)', options: ['None', 'Diabetes', 'Hypertension (High BP)', 'Asthma / COPD', 'Heart Disease', 'Thyroid', 'Kidney Disease', 'Liver Disease', 'Cancer', 'Arthritis'] },
  { key: 'past_surgical_history', section: 'Past History', type: 'choice', text: 'Have you had any surgeries before?', text_hi: 'क्या पहले कोई सर्जरी हुई है?', options: ['No surgeries', 'Yes — Heart surgery', 'Yes — Abdominal surgery', 'Yes — Orthopaedic surgery', 'Yes — Other surgery'] },
  { key: 'current_medications', section: 'Drug History', type: 'choice', text: 'Are you currently taking any medicines?', text_hi: 'क्या आप अभी कोई दवाई ले रहे हैं?', options: ['No medicines', 'Yes — Blood pressure medicine', 'Yes — Diabetes medicine', 'Yes — Pain killers', 'Yes — Multiple medicines', 'Yes — Herbal / Ayurvedic'] },
  { key: 'allergy_history', section: 'Allergy History', type: 'choice', text: 'Do you have any known allergies?', text_hi: 'क्या आपको किसी दवा या खाने से एलर्जी है?', options: ['No known allergies', 'Allergic to Penicillin / Antibiotics', 'Allergic to Aspirin / NSAIDs', 'Allergic to certain foods', 'Allergic to other medicines'] },
  { key: 'family_history', section: 'Family History', type: 'multi', text: 'Family history of conditions? (Select all)', text_hi: 'परिवार में किसी को ये बीमारियाँ हैं?', options: ['None', 'Diabetes', 'Heart Disease / Heart Attack', 'High Blood Pressure', 'Cancer', 'Kidney Disease', 'Mental Illness', 'Stroke'] },
  { key: 'smoking_history', section: 'Personal History', type: 'choice', text: 'Do you smoke or use tobacco?', text_hi: 'क्या आप धूम्रपान करते हैं?', options: ['Never smoked', 'Ex-smoker (quit)', 'Current smoker - less than 10/day', 'Current smoker - 10 or more/day', 'Chewing tobacco / Gutka'] },
  { key: 'alcohol_history', section: 'Personal History', type: 'choice', text: 'Do you drink alcohol?', text_hi: 'क्या आप शराब पीते हैं?', options: ['No alcohol', 'Occasionally (social drinking)', 'Regularly - moderate', 'Regularly - heavy', 'Stopped recently'] },
  { key: 'diet_history', section: 'Personal History', type: 'choice', text: 'What best describes your diet?', text_hi: 'आपका आहार कैसा है?', options: ['Balanced / Mixed diet', 'Vegetarian', 'Vegan', 'High sugar / Junk food', 'Fasting frequently'] },
  { key: 'ros_fever', section: 'Review of Systems', type: 'choice', text: 'Have you had fever recently?', text_hi: 'क्या हाल ही में बुखार आया है?', options: ['No fever', 'Low grade fever (below 100F)', 'High fever (above 101F)', 'Fever with chills / shivering'] },
  { key: 'ros_gi', section: 'Review of Systems', type: 'choice', text: 'Any stomach or digestion problems?', text_hi: 'पेट की कोई तकलीफ?', options: ['None', 'Nausea / Vomiting', 'Diarrhea / Loose motions', 'Constipation', 'Acidity / Heartburn', 'Loss of appetite'] },
  { key: 'ros_respiratory', section: 'Review of Systems', type: 'choice', text: 'Any breathing or chest symptoms?', text_hi: 'सांस या सीने में कोई तकलीफ?', options: ['None', 'Cough (dry)', 'Cough with phlegm', 'Shortness of breath', 'Wheezing', 'Chest pain or tightness'] },
  { key: 'ros_neuro', section: 'Review of Systems', type: 'choice', text: 'Any headache, dizziness or neurological symptoms?', text_hi: 'सिरदर्द, चक्कर, या कोई और लक्षण?', options: ['None', 'Headache', 'Dizziness / Vertigo', 'Numbness or tingling', 'Memory problems', 'Sleep disturbance'] },
];

const AYUSH_FLOW = [
  { key: 'prakriti', section: 'Dashavidha - Prakriti', type: 'choice', text: 'Your body constitution (Prakriti)?', text_hi: 'आपकी प्रकृति क्या है?', options: ['Vata dominant (Light / Quick)', 'Pitta dominant (Warm / Intense)', 'Kapha dominant (Calm / Heavy)', 'Mixed Vata-Pitta', 'Mixed Pitta-Kapha', 'Mixed / Tridoshic'] },
  { key: 'vikriti', section: 'Dashavidha - Vikriti', type: 'choice', text: 'Current imbalance (Vikriti)?', text_hi: 'अभी आपकी विकृति क्या है?', options: ['Vata (Dryness / Anxiety / Pain)', 'Pitta (Inflammation / Acidity)', 'Kapha (Heaviness / Congestion)', 'No apparent imbalance', 'Not sure'] },
  { key: 'sara', section: 'Dashavidha - Sara', type: 'choice', text: 'Your tissue quality (Sara)?', text_hi: 'धातुओं की गुणवत्ता?', options: ['Excellent (Pravara Sara)', 'Moderate (Madhyama Sara)', 'Poor (Avara Sara)'] },
  { key: 'samhanana', section: 'Dashavidha - Samhanana', type: 'choice', text: 'Your body build (Samhanana)?', text_hi: 'शारीरिक बनावट?', options: ['Compact / Well-built (Pravara)', 'Average / Moderate (Madhyama)', 'Lean / Loosely built (Avara)'] },
  { key: 'satmya', section: 'Dashavidha - Satmya', type: 'choice', text: 'Food type adapted to (Satmya)?', text_hi: 'आप किस आहार के अभ्यस्त हैं?', options: ['Sarvarasa (All six tastes)', 'Madhura & Laghu (Sweet & Light)', 'Katu & Tikta (Pungent & Bitter)', 'Single taste diet'] },
  { key: 'sattva', section: 'Dashavidha - Sattva', type: 'choice', text: 'Mental strength (Sattva)?', text_hi: 'मनोबल शक्ति?', options: ['Pravara (High - handles stress well)', 'Madhyama (Moderate)', 'Avara (Low - easily upset)'] },
  { key: 'agni', section: 'Dashavidha - Agni', type: 'choice', text: 'Your digestive fire (Agni)?', text_hi: 'पाचन शक्ति (अग्नि)?', options: ['Samagni (Balanced)', 'Tikshnagni (Sharp - always hungry)', 'Mandagni (Sluggish - heavy meals)', 'Vishamagni (Irregular appetite)'] },
  { key: 'koshtha', section: 'Dashavidha - Koshtha', type: 'choice', text: 'Your bowel habit (Koshtha)?', text_hi: 'मल त्याग?', options: ['Madhyama (Regular)', 'Krura (Constipated / Dry)', 'Mridu (Loose / Frequent)'] },
  { key: 'vyayama_shakti', section: 'Dashavidha - Vyayama Shakti', type: 'choice', text: 'Physical exercise capacity (Vyayama Shakti)?', text_hi: 'व्यायाम क्षमता?', options: ['Pravara (High - regular exercise)', 'Madhyama (Moderate)', 'Avara (Low - tires easily)'] },
  { key: 'vaya', section: 'Dashavidha - Vaya', type: 'choice', text: 'Your life stage (Vaya)?', text_hi: 'जीवन अवस्था?', options: ['Bala (Child - up to 16 years)', 'Madhyama (Young adult - 16-60 years)', 'Vriddha (Elderly - above 60 years)'] },
  { key: 'ahara_shakti', section: 'Dashavidha - Ahara Shakti', type: 'choice', text: 'Appetite and food intake (Ahara Shakti)?', text_hi: 'भूख और खाने की क्षमता?', options: ['Good intake (full meals)', 'Moderate intake (half portions)', 'Poor intake (very little food)', 'Good digestion of whatever eaten'] },
  { key: 'nidana', section: 'Nidana (Causative Factors)', type: 'multi', text: 'What caused this condition? (Select all)', text_hi: 'इस तकलीफ का कारण?', options: ['Dietary imbalance (Ahara)', 'Lifestyle change (Vihara)', 'Seasonal change', 'Stress / Mental factors', 'Hereditary / Family history', 'Previous illness', 'Unknown'] },
];

const RED_FLAG_PATTERNS = [
  /chest pain/i, /can.t breathe/i, /difficulty breathing/i, /gasping/i,
  /suicid/i, /self harm/i, /heavy bleeding/i, /coughing blood/i, /vomiting blood/i,
  /unconscious/i, /fainted/i, /seizure/i, /severe abdominal pain/i, /slurred speech/i,
];
function detectRedFlagFrontend(text) {
  if (!text) return false;
  return RED_FLAG_PATTERNS.some((r) => r.test(text));
}

const SECTION_ICONS = {
  'HPI': 'O', 'Past History': 'P', 'Drug History': 'D', 'Allergy History': 'A',
  'Family History': 'F', 'Personal History': 'Ps', 'Review of Systems': 'R',
};

function speak(text, voiceCode) {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = voiceCode || 'en-IN';
  u.rate = 0.9;
  window.speechSynthesis.speak(u);
}

export default function PatientKiosk({ user }) {
  const { lang, t, currentVoiceCode } = useLanguage();
  const [step, setStep] = useState(0);
  const [careMode, setCareMode] = useState('general');
  const [formData, setFormData] = useState({
    fullName: user?.name || '', age: user?.age || '', gender: user?.gender || 'Male',
    phone: user?.phone || '', abhaId: user?.abhaId || '', bloodGroup: user?.bloodGroup || '', chiefComplaint: '', symptoms: [],
  });
  const [answers, setAnswers] = useState({});
  const [multiSelected, setMultiSelected] = useState([]);
  const [qIndex, setQIndex] = useState(0);
  const [fileList, setFileList] = useState([]);
  const [isListening, setIsListening] = useState(false);
  const [completedSession, setCompletedSession] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showEmergency, setShowEmergency] = useState(false);
  const slipRef = useRef(null);
  const headingRef = useRef(null);
  const cardRef = useRef(null);
  const qCardRef = useRef(null);

  // Subtle step transition & SplitText heading
  useEffect(() => {
    const ctx = gsap.context(() => {
      if (headingRef.current) {
        animateSplitText(headingRef.current, { y: 6, duration: 0.38, stagger: 0.025 });
      }
      if (cardRef.current) {
        animateTabTransition(cardRef.current, { y: 8, duration: 0.28 });
      }
      const optCards = document.querySelectorAll('.care-mode-opt');
      if (optCards.length > 0) {
        animateStaggerCards(optCards, { y: 10, stagger: 0.04 });
      }
    });

    return () => ctx.revert();
  }, [step]);

  // Subtle interview question change micro-transition
  useEffect(() => {
    if (step === 3 && qCardRef.current) {
      animateTabTransition(qCardRef.current, { y: 6, duration: 0.2 });
    }
  }, [qIndex, step]);

  // Subtle appointment slip entrance
  useEffect(() => {
    if (completedSession && slipRef.current) {
      animateScaleIn(slipRef.current, { fromScale: 0.97, y: 14, duration: 0.45 });
    }
  }, [completedSession]);

  // ── Live ML keyword analysis state ────────────────────────────────────────
  const [liveKeywords, setLiveKeywords] = useState([]);
  const [liveCondition, setLiveCondition] = useState('STABLE');
  const [liveAnalyzing, setLiveAnalyzing] = useState(false);
  const debounceRef = useRef(null);

  // Debounced live keyword analysis — fires 600ms after the patient stops typing
  const runLiveAnalysis = useCallback(async (text) => {
    if (!text || text.trim().length < 3) {
      setLiveKeywords([]);
      setLiveCondition('STABLE');
      return;
    }
    setLiveAnalyzing(true);
    try {
      const res = await fetch(`${API_BASE}/api/ai/classify-intake`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      if (res.ok) {
        const data = await res.json();
        setLiveKeywords(data.flagged_keywords || []);
        setLiveCondition(data.overall_color || 'GREEN');
      }
    } catch {
      // Silently degrade if Python service is offline
    } finally {
      setLiveAnalyzing(false);
    }
  }, []);

  const handleComplaintChange = (value) => {
    setFormData(p => ({ ...p, chiefComplaint: value }));
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => runLiveAnalysis(value), 600);
  };

  useEffect(() => () => clearTimeout(debounceRef.current), []);

  const flow = careMode === 'ayush' ? [...GENERAL_FLOW, ...AYUSH_FLOW] : GENERAL_FLOW;
  const currentQ = flow[qIndex] || null;
  const progress = Math.round((qIndex / flow.length) * 100);

  const startVoice = (onResult) => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { alert('Voice is supported on Chrome & Edge.'); return; }
    const r = new SR();
    r.lang = currentVoiceCode;
    r.continuous = false;
    r.onstart = () => setIsListening(true);
    r.onend = () => setIsListening(false);
    r.onerror = () => setIsListening(false);
    r.onresult = (e) => onResult(e.results[0][0].transcript);
    r.start();
  };

  const symptomOptions = [
    { label: 'Fever & Chills', icon: 'T' }, { label: 'Chest Pain', icon: 'H' },
    { label: 'Shortness of Breath', icon: 'B' }, { label: 'Persistent Cough', icon: 'C' },
    { label: 'Severe Headache', icon: 'N' }, { label: 'Abdominal Pain', icon: 'Ab' },
    { label: 'Body Aches & Fatigue', icon: 'F' }, { label: 'Nausea / Vomiting', icon: 'N' },
  ];
  const toggleSymptom = (s) => setFormData(p => ({...p, symptoms: p.symptoms.includes(s) ? p.symptoms.filter(x => x !== s) : [...p.symptoms, s]}));
  const handleAddFiles = (e) => { if (e.target.files) setFileList(p => [...p, ...Array.from(e.target.files).map(f => ({file: f, preview: URL.createObjectURL(f), name: f.name}))]); };
  const removeFile = (i) => setFileList(p => p.filter((_, idx) => idx !== i));

  const answerQuestion = (value) => {
    const newAnswers = { ...answers, [currentQ.key]: value };
    setAnswers(newAnswers);
    setMultiSelected([]);
    const combined = `${formData.chiefComplaint} ${Object.values(newAnswers).join(' ')}`;
    if (detectRedFlagFrontend(combined)) { setShowEmergency(true); return; }
    if (qIndex + 1 < flow.length) setQIndex(qIndex + 1);
    else setStep(4);
  };
  const answerMulti = () => answerQuestion(multiSelected.join(', ') || 'None');
  const toggleMulti = (opt) => { if (opt === 'None') { setMultiSelected(['None']); return; } setMultiSelected(p => p.includes(opt) ? p.filter(x => x !== opt) : [...p.filter(x => x !== 'None'), opt]); };
  const skipQuestion = () => { setAnswers(p => ({...p, [currentQ.key]: 'Not reported'})); setMultiSelected([]); if (qIndex + 1 < flow.length) setQIndex(qIndex + 1); else setStep(4); };
  const goBack = () => { if (qIndex > 0) { setQIndex(qIndex - 1); setMultiSelected([]); } else setStep(2); };
  const speakQuestion = () => { if (!currentQ) return; speak(t(currentQ.key, currentQ.text), currentVoiceCode); };

  const handleSubmit = async () => {
    setError(''); setLoading(true);
    try {
      const fd = new FormData();
      fd.append('fullName', formData.fullName); fd.append('age', formData.age);
      fd.append('gender', formData.gender); fd.append('phone', formData.phone);
      fd.append('abhaId', formData.abhaId); fd.append('bloodGroup', formData.bloodGroup || '');
      fd.append('chiefComplaint', formData.chiefComplaint);
      fd.append('careMode', careMode); fd.append('symptoms', JSON.stringify(formData.symptoms));
      fd.append('interviewAnswers', JSON.stringify(answers));
      fileList.forEach(item => { if (item.file) fd.append('documents', item.file); });
      const res = await fetch(`${API_BASE}/api/intake/submit`, { method: 'POST', body: fd });
      const ct = res.headers.get('content-type') || '';
      if (!ct.includes('application/json')) throw new Error('Backend is waking up. Please retry in 10s.');
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || data.error || 'Submission failed.');
      setCompletedSession({ tokenNumber: data.tokenNumber || 'V-1001', qrCodeBase64: data.qrCodeBase64 || '', triage: data.triage || { risk_level: 'SAFE', risk_score: 10 } });
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  };

  const stepLabels = ['Details', 'Care Mode', 'Complaint', 'Interview', 'Documents', 'Submit'];
  const StepBar = () => (
    <div className="flex items-center gap-1 mb-6">
      {stepLabels.map((label, i) => (
        <React.Fragment key={i}>
          <div className="flex flex-col items-center">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black border-2 transition-all ${i < step ? 'bg-clinical-600 text-white border-clinical-600' : i === step ? 'bg-white text-clinical-700 border-clinical-600 shadow-md' : 'bg-slate-100 text-slate-400 border-slate-200'}`}>{i < step ? 'v' : i + 1}</div>
            <span className={`text-[9px] font-bold mt-0.5 hidden sm:block ${i === step ? 'text-clinical-700' : 'text-slate-400'}`}>{label}</span>
          </div>
          {i < stepLabels.length - 1 && <div className={`flex-1 h-0.5 rounded-full transition-all ${i < step ? 'bg-clinical-500' : 'bg-slate-200'}`} />}
        </React.Fragment>
      ))}
    </div>
  );

  if (showEmergency) return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-red-900/95 backdrop-blur-sm p-6">
      <div className="max-w-md w-full bg-white rounded-3xl p-8 text-center shadow-2xl border-4 border-red-500">
        <div className="text-6xl mb-4 animate-bounce">!</div>
        <h2 className="text-2xl font-black text-red-700 mb-2">Emergency Detected!</h2>
        <p className="text-slate-700 font-semibold text-sm mb-6">Your symptoms suggest a <span className="text-red-600 font-black">medical emergency</span>. Please go to the <strong>Emergency Department immediately</strong> or call for help. Alert logged.</p>
        <div className="text-3xl font-black text-red-600 mb-6">Emergency: 112</div>
        <button onClick={() => setShowEmergency(false)} className="w-full py-3 rounded-2xl bg-slate-800 text-white font-bold text-sm">I understand - continue registration</button>
      </div>
    </div>
  );

  if (completedSession) {
    const risk = completedSession.triage?.risk_level || 'SAFE';
    const riskColor = risk === 'SEVERE' ? 'bg-rose-100 text-rose-800 border-rose-300' : risk === 'MODERATE' ? 'bg-amber-100 text-amber-800 border-amber-300' : 'bg-emerald-100 text-emerald-800 border-emerald-300';
    return (
      <div className="max-w-md mx-auto my-6">
        <div ref={slipRef} id="printable-slip" className="bg-white rounded-3xl p-6 sm:p-8 border-2 border-slate-300 shadow-2xl text-slate-800">
          <div className="flex items-center justify-between pb-4 border-b-2 border-dashed border-slate-200">
            <div><h2 className="text-xl font-black font-heading text-slate-900">VAIDYcare-AI</h2><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Official OPD Appointment Slip</p></div>
            <span className="text-[10px] font-bold px-2 py-1 bg-slate-100 rounded text-slate-600">{new Date().toLocaleDateString()}</span>
          </div>
          <div className="my-5 p-5 rounded-2xl bg-slate-50 border border-slate-200 text-center">
            <span className="text-[10px] font-extrabold text-clinical-600 tracking-widest uppercase">Queue Token Number</span>
            <div className="text-4xl font-black font-heading text-slate-900 my-1">{completedSession.tokenNumber}</div>
            <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase inline-block border ${riskColor}`}>Triage: {risk} Priority</span>
          </div>
          <div className="space-y-1.5 text-xs border-y border-slate-100 py-3 mb-4">
            <div className="flex justify-between"><span className="text-slate-400 font-semibold">Patient:</span><span className="font-extrabold">{formData.fullName}</span></div>
            <div className="flex justify-between"><span className="text-slate-400 font-semibold">Age / Gender:</span><span className="font-bold">{formData.age} Y - {formData.gender}</span></div>
            {formData.bloodGroup && (
              <div className="flex justify-between"><span className="text-slate-400 font-semibold">Blood Group:</span><span className="font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">{formData.bloodGroup}</span></div>
            )}
            <div className="flex justify-between"><span className="text-slate-400 font-semibold">Care Mode:</span><span className="font-bold uppercase">{careMode}</span></div>
            <div className="flex justify-between"><span className="text-slate-400 font-semibold">Interview:</span><span className="font-bold text-emerald-700">{Object.keys(answers).length} questions answered</span></div>
          </div>
          {completedSession.qrCodeBase64 && (
            <div className="text-center">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Scan at Doctor Desk</p>
              <div className="p-2 bg-white inline-block border-2 border-slate-200 rounded-2xl"><img src={completedSession.qrCodeBase64} alt="Encounter QR" className="w-36 h-36 mx-auto rounded-lg" /></div>
            </div>
          )}
          <p className="text-[9px] text-center text-slate-400 mt-4">Show this slip at OPD Desk. AI clinical summary synced to doctor screen.</p>
        </div>
        <div className="flex gap-3 mt-4">
          <button onClick={() => window.print()} className="flex-1 py-3 rounded-xl bg-clinical-600 text-white text-xs font-bold shadow-md">Print Slip</button>
          <button onClick={() => window.location.reload()} className="flex-1 py-3 rounded-xl bg-slate-900 text-white text-xs font-bold">New Check-In</button>
        </div>
      </div>
    );
  }

  if (step === 0) return (
    <div className="max-w-2xl mx-auto">
      <div ref={cardRef} className="bg-white/90 backdrop-blur-xl rounded-3xl border border-slate-200/80 shadow-xl p-6 sm:p-10">
        <StepBar />
        <div className="flex items-center justify-between mb-6">
          <div><span className="text-xs font-bold text-clinical-600 uppercase tracking-wider">{t('kiosk.step1', 'Step 1 of 6')}</span><h1 ref={headingRef} className="text-2xl font-black font-heading text-slate-900 mt-0.5">{t('kiosk.patientDetails', 'Patient Details')}</h1></div>
        </div>
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2"><label className="block text-xs font-bold text-slate-700 mb-1.5">{t('kiosk.fullName', 'Full Name')} *</label><input required value={formData.fullName} onChange={e => setFormData(p => ({...p, fullName: e.target.value}))} className="w-full px-4 py-2.5 text-sm rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-clinical-500/20 outline-none" placeholder={t('kiosk.fullName')} /></div>
            <div><label className="block text-xs font-bold text-slate-700 mb-1.5">{t('kiosk.age', 'Age')} *</label><input type="number" required value={formData.age} onChange={e => setFormData(p => ({...p, age: e.target.value}))} className="w-full px-4 py-2.5 text-sm rounded-xl border border-slate-200 bg-slate-50 outline-none" placeholder="Years" /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-xs font-bold text-slate-700 mb-1.5">{t('kiosk.gender', 'Gender')}</label><select value={formData.gender} onChange={e => setFormData(p => ({...p, gender: e.target.value}))} className="w-full px-4 py-2.5 text-sm rounded-xl border border-slate-200 bg-slate-50 outline-none"><option>Male</option><option>Female</option><option>Other</option></select></div>
            <div><label className="block text-xs font-bold text-slate-700 mb-1.5">{t('kiosk.phone', 'Phone Number')} *</label><input type="tel" required value={formData.phone} onChange={e => setFormData(p => ({...p, phone: e.target.value}))} className="w-full px-4 py-2.5 text-sm rounded-xl border border-slate-200 bg-slate-50 outline-none" placeholder="+91 9876543210" /></div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">{t('kiosk.abhaId', 'ABHA ID')}</label>
              <input value={formData.abhaId} onChange={e => setFormData(p => ({...p, abhaId: e.target.value}))} className="w-full px-4 py-2.5 text-sm rounded-xl border border-slate-200 bg-slate-50 outline-none font-mono" placeholder="XX-XXXX-XXXX-XXXX" maxLength={19} />
              {formData.abhaId && !/^\d{2}-\d{4}-\d{4}-\d{4}$/.test(formData.abhaId) && <p className="text-[11px] text-amber-600 mt-1 font-semibold">Format: XX-XXXX-XXXX-XXXX</p>}
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">{t('kiosk.bloodGroup', 'Blood Group (Optional)')}</label>
              <select value={formData.bloodGroup} onChange={e => setFormData(p => ({...p, bloodGroup: e.target.value}))} className="w-full px-4 py-2.5 text-sm rounded-xl border border-slate-200 bg-slate-50 outline-none">
                <option value="">Don't Know / Not Tested</option>
                <option value="A+">A+ (A Positive)</option>
                <option value="A-">A- (A Negative)</option>
                <option value="B+">B+ (B Positive)</option>
                <option value="B-">B- (B Negative)</option>
                <option value="O+">O+</option>
                <option value="O-">O-</option>
                <option value="AB+">AB+</option>
                <option value="AB-">AB-</option>
              </select>
            </div>
          </div>
          <button onClick={() => { if (!formData.fullName || !formData.age || !formData.phone) { setError('Please fill in Name, Age and Phone.'); return; } setError(''); setStep(1); }} className="w-full py-4 rounded-2xl bg-gradient-to-r from-clinical-600 to-brand-600 text-white font-black text-sm shadow-lg">{t('kiosk.continue', 'Continue')} &rarr;</button>
          {error && <p className="text-xs text-red-600 font-bold text-center">{error}</p>}
        </div>
      </div>
    </div>
  );

  if (step === 1) return (
    <div className="max-w-2xl mx-auto">
      <div ref={cardRef} className="bg-white/90 backdrop-blur-xl rounded-3xl border border-slate-200/80 shadow-xl p-6 sm:p-10">
        <StepBar />
        <span className="text-xs font-bold text-clinical-600 uppercase tracking-wider">{t('kiosk.step2', 'Step 2 of 6')}</span>
        <h2 ref={headingRef} className="text-2xl font-black font-heading text-slate-900 mt-0.5 mb-6">{t('kiosk.selectCareMode', 'Select Care Mode')}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {[{value:'general',icon:'H',title:t('kiosk.generalOpd', 'General / Allopathy OPD'),desc:t('kiosk.generalDesc', 'Standard SOCRATES clinical history - 19 questions covering all medical systems')},
            {value:'ayush',icon:'Y',title:t('kiosk.ayushOpd', 'AYUSH / Ayurveda OPD'),desc:t('kiosk.ayushDesc', 'Full Dashavidha Pariksha (all 10 Ayurvedic parameters) + standard history - 31 questions')}
          ].map(opt => (
            <button key={opt.value} onClick={() => setCareMode(opt.value)} className={`care-mode-opt p-6 rounded-2xl border-2 text-left transition-all ${careMode === opt.value ? (opt.value === 'ayush' ? 'border-emerald-500 bg-emerald-50' : 'border-clinical-500 bg-clinical-50') : 'border-slate-200 hover:border-slate-300 bg-white'}`}>
              <div className="text-2xl font-black mb-3">{opt.icon}</div>
              <div className={`font-black text-base ${careMode === opt.value ? (opt.value === 'ayush' ? 'text-emerald-700' : 'text-clinical-700') : 'text-slate-800'}`}>{opt.title}</div>
              <div className="text-xs text-slate-500 mt-1 font-medium leading-relaxed">{opt.desc}</div>
              {careMode === opt.value && <div className={`mt-3 text-[10px] font-black px-2 py-0.5 rounded-full inline-block ${opt.value === 'ayush' ? 'bg-emerald-600 text-white' : 'bg-clinical-600 text-white'}`}>Selected</div>}
            </button>
          ))}
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={() => setStep(0)} className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold">{t('kiosk.back', 'Back')}</button>
          <button onClick={() => setStep(2)} className="flex-2 flex-grow-[2] py-3 rounded-2xl bg-gradient-to-r from-clinical-600 to-brand-600 text-white font-black text-sm shadow-lg">{t('kiosk.continue','Continue')} &rarr;</button>
        </div>
      </div>
    </div>
  );

  if (step === 2) return (
    <div className="max-w-2xl mx-auto">
      <div ref={cardRef} className="bg-white/90 backdrop-blur-xl rounded-3xl border border-slate-200/80 shadow-xl p-6 sm:p-10">
        <StepBar />
        <span className="text-xs font-bold text-clinical-600 uppercase tracking-wider">{t('kiosk.step3', 'Step 3 of 6')}</span>
        <h2 ref={headingRef} className="text-2xl font-black font-heading text-slate-900 mt-0.5 mb-1">{t('kiosk.chiefComplaint','Chief Complaint')}</h2>
        <p className="text-xs text-slate-400 mb-5">{t('kiosk.describeComplaint','Describe your main complaint')}</p>
        <div className="mb-4">
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-bold text-slate-700">{t('kiosk.describeComplaint','Describe your main complaint')}</label>
            <button onClick={() => startVoice(txt => setFormData(p => ({...p, chiefComplaint: p.chiefComplaint ? p.chiefComplaint + ' ' + txt : txt})))} className={`text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1.5 transition-all ${isListening ? 'bg-rose-500 text-white animate-pulse' : 'bg-clinical-50 text-clinical-700 border border-clinical-200'}`}>{isListening ? t('kiosk.listening', 'Listening...') : t('kiosk.voiceInput', 'Voice Input')}</button>
          </div>
          <textarea
            required rows={3}
            value={formData.chiefComplaint}
            onChange={e => handleComplaintChange(e.target.value)}
            className={`w-full p-3.5 text-sm rounded-xl border bg-slate-50 focus:bg-white outline-none resize-none transition-all ${
              liveCondition === 'RED' ? 'border-rose-400 ring-2 ring-rose-200' :
              liveCondition === 'YELLOW' ? 'border-amber-400 ring-1 ring-amber-100' :
              'border-slate-200'
            }`}
            placeholder="Describe your symptoms in your own words..."
          />

          {/* ── Emergency banner ───────────────────────────────────────── */}
          {detectRedFlagFrontend(formData.chiefComplaint) && (
            <div className="mt-2 p-3 bg-red-50 border border-red-300 rounded-xl text-xs font-bold text-red-700 flex items-center gap-2">
              <span className="text-base animate-pulse">🚨</span>
              EMERGENCY: Please proceed to the Emergency Department immediately!
            </div>
          )}

          {/* ── Live ML keyword analysis panel ─────────────────────────── */}
          {(liveKeywords.length > 0 || liveAnalyzing) && (
            <div className="mt-3 rounded-2xl border overflow-hidden shadow-sm">
              {/* Header bar — colour reflects overall condition */}
              <div className={`px-3 py-2 flex items-center justify-between ${
                liveCondition === 'RED'    ? 'bg-rose-600' :
                liveCondition === 'YELLOW' ? 'bg-amber-500' : 'bg-emerald-600'
              }`}>
                <span className="text-white text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5">
                  {liveAnalyzing ? (
                    <span className="inline-block w-3 h-3 border-2 border-white/60 border-t-white rounded-full animate-spin" />
                  ) : '🤖'}
                  AI Live Keyword Scan
                </span>
                <span className="text-white/80 text-[10px] font-bold">
                  {liveCondition === 'RED' ? 'CRITICAL' : liveCondition === 'YELLOW' ? 'MODERATE' : 'STABLE'}
                </span>
              </div>

              {/* Keyword badges by priority */}
              {liveKeywords.length > 0 && (
                <div className="p-3 bg-white space-y-2">
                  {/* RED */}
                  {liveKeywords.some(k => k.priority === 'RED') && (
                    <div>
                      <span className="text-[9px] font-black text-rose-600 uppercase tracking-widest block mb-1">🔴 Critical</span>
                      <div className="flex flex-wrap gap-1.5">
                        {liveKeywords.filter(k => k.priority === 'RED').map((k, i) => (
                          <span key={i}
                            title={`${k.suspected_disease}${k.icd_code ? ' · ICD ' + k.icd_code : ''}`}
                            className="inline-flex items-center gap-1 text-[10px] font-black px-2.5 py-1 rounded-full border bg-rose-50 text-rose-700 border-rose-300 cursor-help animate-pulse-slow">
                            <span>!</span>{k.keyword}
                            <span className="text-rose-400 font-bold">{k.confidence}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {/* YELLOW */}
                  {liveKeywords.some(k => k.priority === 'YELLOW') && (
                    <div>
                      <span className="text-[9px] font-black text-amber-600 uppercase tracking-widest block mb-1">🟡 Moderate</span>
                      <div className="flex flex-wrap gap-1.5">
                        {liveKeywords.filter(k => k.priority === 'YELLOW').map((k, i) => (
                          <span key={i}
                            title={`${k.suspected_disease}${k.icd_code ? ' · ICD ' + k.icd_code : ''}`}
                            className="inline-flex items-center gap-1 text-[10px] font-black px-2.5 py-1 rounded-full border bg-amber-50 text-amber-700 border-amber-300 cursor-help">
                            <span>~</span>{k.keyword}
                            <span className="text-amber-400 font-bold">{k.confidence}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {/* GREEN */}
                  {liveKeywords.some(k => k.priority === 'GREEN') && (
                    <div>
                      <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest block mb-1">🟢 Routine</span>
                      <div className="flex flex-wrap gap-1.5">
                        {liveKeywords.filter(k => k.priority === 'GREEN').map((k, i) => (
                          <span key={i}
                            title={`${k.suspected_disease}${k.icd_code ? ' · ICD ' + k.icd_code : ''}`}
                            className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full border bg-emerald-50 text-emerald-700 border-emerald-200 cursor-help">
                            <span>✓</span>{k.keyword}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  <p className="text-[9px] text-slate-400 font-semibold mt-1">Hover keywords for suspected disease &amp; ICD-10 code. Analysis updates as you type.</p>
                </div>
              )}
            </div>
          )}
        </div>
        <div className="mb-6">
          <label className="block text-xs font-bold text-slate-700 mb-2">{t('Also experiencing (select all)','अन्य लक्षण')}</label>
          <div className="flex flex-wrap gap-2">
            {symptomOptions.map(({label, icon}) => { const sel = formData.symptoms.includes(label); return (
              <button type="button" key={label} onClick={() => toggleSymptom(label)} className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition-all ${sel ? 'bg-clinical-600 text-white border-clinical-600 shadow-sm' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'}`}><span>{icon}</span><span>{label}</span></button>
            );})}
          </div>
        </div>
        <div className="flex gap-3">
          <button onClick={() => setStep(1)} className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold">{t('kiosk.back', 'Back')}</button>
          <button onClick={() => { if (!formData.chiefComplaint.trim()) { setError('Please describe your chief complaint.'); return; } setError(''); setQIndex(0); setStep(3); }} className="flex-2 flex-grow-[2] py-3 rounded-2xl bg-gradient-to-r from-clinical-600 to-brand-600 text-white font-black text-sm shadow-lg">{t('kiosk.startInterview','Start Interview')} &rarr;</button>
        </div>
        {error && <p className="text-xs text-red-600 font-bold text-center mt-2">{error}</p>}
      </div>
    </div>
  );

  if (step === 3 && currentQ) {
    const questionText = t(currentQ.key, currentQ.text);
    return (
      <div className="max-w-2xl mx-auto">
        <div ref={cardRef} className="bg-white/90 backdrop-blur-xl rounded-3xl border border-slate-200/80 shadow-xl p-6 sm:p-10">
          <StepBar />
          <div className="mb-5">
            <div className="flex items-center justify-between text-xs font-bold text-slate-500 mb-1.5">
              <span>{t('kiosk.clinicalInterview')} - {currentQ.section}</span>
              <span>{qIndex + 1} / {flow.length}</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2"><div className="bg-gradient-to-r from-clinical-500 to-brand-500 h-2 rounded-full transition-all duration-500" style={{width:`${progress}%`}} /></div>
          </div>
          <div ref={qCardRef} className="bg-gradient-to-br from-clinical-50 to-slate-50 border border-clinical-100 rounded-2xl p-6 mb-5">
            <div className="flex items-start gap-3">
              <div className="flex-1">
                <span className="text-[11px] font-extrabold text-clinical-600 uppercase tracking-wider">{currentQ.section}</span>
                <h3 ref={headingRef} className="text-lg sm:text-xl font-black text-slate-900 mt-1 leading-snug">{questionText}</h3>
              </div>
              <button onClick={speakQuestion} title="Read aloud" className="w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-sm hover:bg-slate-50 shadow-sm transition font-bold">&#128266;</button>
            </div>
          </div>
          {currentQ.type === 'choice' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {currentQ.options.map(opt => (
                <button key={opt} onClick={() => answerQuestion(opt)} className="px-4 py-3 text-sm font-semibold rounded-xl border-2 border-slate-200 bg-white hover:border-clinical-400 hover:bg-clinical-50 text-slate-700 transition-all text-left flex items-center gap-2 group">
                  <span className="w-4 h-4 rounded-full border-2 border-slate-300 group-hover:border-clinical-500 transition-all flex-shrink-0" />{opt}
                </button>
              ))}
            </div>
          )}
          {currentQ.type === 'multi' && (
            <div>
              <p className="text-xs text-slate-500 mb-2 font-semibold">{t('Select all that apply:','सभी लागू विकल्प चुनें:')}</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {currentQ.options.map(opt => { const sel = multiSelected.includes(opt); return (
                  <button key={opt} onClick={() => toggleMulti(opt)} className={`px-4 py-3 text-sm font-semibold rounded-xl border-2 transition-all text-left flex items-center gap-2 ${sel ? 'border-clinical-500 bg-clinical-50 text-clinical-800' : 'border-slate-200 bg-white text-slate-700 hover:border-clinical-300'}`}>
                    <span className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 text-[10px] transition-all ${sel ? 'bg-clinical-600 border-clinical-600 text-white' : 'border-slate-300'}`}>{sel ? 'v' : ''}</span>{opt}
                  </button>
                );})}
              </div>
              <button onClick={answerMulti} disabled={multiSelected.length === 0} className="w-full mt-3 py-3 rounded-2xl bg-clinical-600 text-white font-black text-sm disabled:opacity-40 hover:bg-clinical-700">Confirm Selection &rarr;</button>
            </div>
          )}
          <div className="flex gap-2 mt-4">
            <button onClick={() => startVoice(val => answerQuestion(val))} className={`flex-1 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 border transition-all ${isListening ? 'bg-rose-500 text-white border-rose-500 animate-pulse' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'}`}>{isListening ? t('kiosk.listening', 'Listening...') : t('kiosk.answerVoice', 'Answer by Voice')}</button>
            <button onClick={skipQuestion} className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-400 border border-slate-200 hover:bg-slate-50">{t('kiosk.skip', 'Skip')}</button>
            <button onClick={goBack} className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-400 border border-slate-200 hover:bg-slate-50">{t('kiosk.back', 'Back')}</button>
          </div>
        </div>
      </div>
    );
  }

  if (step === 4) return (
    <div className="max-w-2xl mx-auto">
      <div ref={cardRef} className="bg-white/90 backdrop-blur-xl rounded-3xl border border-slate-200/80 shadow-xl p-6 sm:p-10">
        <StepBar />
        <span className="text-xs font-bold text-clinical-600 uppercase tracking-wider">{t('kiosk.step5', 'Step 5 of 6')}</span>
        <h2 ref={headingRef} className="text-2xl font-black font-heading text-slate-900 mt-0.5 mb-1">{t('kiosk.uploadRecords','Upload Medical Records')}</h2>
        <p className="text-xs text-slate-400 mb-6">Upload X-Rays, Lab Reports, Prescriptions. AI will analyze them.</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {fileList.map((item, idx) => (
            <div key={idx} className="relative group rounded-2xl border border-slate-200 overflow-hidden bg-slate-100 aspect-square shadow-sm">
              <img src={item.preview} alt="Upload" className="w-full h-full object-cover" />
              <button onClick={() => removeFile(idx)} className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-rose-600 text-white flex items-center justify-center text-xs font-bold">X</button>
              <div className="absolute bottom-0 inset-x-0 bg-black/60 px-2 py-1 text-[10px] text-white truncate text-center">{item.name}</div>
            </div>
          ))}
          <label className="border-2 border-dashed border-clinical-300 hover:border-clinical-500 bg-clinical-50/40 rounded-2xl flex flex-col items-center justify-center cursor-pointer aspect-square transition-all group">
            <input type="file" multiple accept="image/*,.pdf" onChange={handleAddFiles} className="hidden" />
            <div className="w-10 h-10 rounded-full bg-clinical-600 text-white flex items-center justify-center text-2xl font-bold shadow-md group-hover:scale-110 transition-transform">+</div>
            <span className="text-xs font-bold text-clinical-700 mt-2">Add File</span>
          </label>
        </div>
        <div className="flex gap-3">
          <button onClick={() => { setQIndex(flow.length - 1); setStep(3); }} className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold">{t('kiosk.back', 'Back')}</button>
          <button onClick={() => setStep(5)} className="flex-2 flex-grow-[2] py-3 rounded-2xl bg-gradient-to-r from-clinical-600 to-brand-600 text-white font-black text-sm shadow-lg">{fileList.length > 0 ? `Continue with ${fileList.length} file(s)` : t('kiosk.skip', 'Skip') + ' & ' + t('kiosk.continue', 'Continue')} &rarr;</button>
        </div>
      </div>
    </div>
  );

  if (step === 5) {
    const printReview = () => {
      const content = document.getElementById('review-print-area');
      if (!content) return;
      const w = window.open('', '_blank');
      w.document.write(`<!DOCTYPE html><html><head><title>VAIDYcare-AI Pre-Submission Review</title><style>
        * { margin:0;padding:0;box-sizing:border-box; }
        body { font-family: Arial, sans-serif; font-size: 11px; color: #1e293b; background:#fff; padding:20px; }
        h1 { font-size:18px; font-weight:900; } h2 { font-size:13px; font-weight:800; margin-bottom:6px; }
        h3 { font-size:11px; font-weight:700; color:#475569; text-transform:uppercase; letter-spacing:.05em; margin-bottom:4px; }
        .header { display:flex; justify-content:space-between; border-bottom:2px solid #e2e8f0; padding-bottom:10px; margin-bottom:14px; }
        .section { margin-bottom:14px; border:1px solid #e2e8f0; border-radius:8px; padding:10px; }
        .red { background:#fff1f2; border-color:#fca5a5; } .yellow { background:#fffbeb; border-color:#fde68a; }
        .badge { display:inline-block; padding:2px 8px; border-radius:999px; font-size:9px; font-weight:800; margin:2px; border:1px solid; }
        .row { display:flex; justify-content:space-between; padding:2px 0; border-bottom:1px dashed #f1f5f9; }
        .label { color:#64748b; } .val { font-weight:700; }
        .img-grid { display:flex; flex-wrap:wrap; gap:8px; margin-top:8px; }
        .img-grid img { width:120px; height:100px; object-fit:cover; border:1px solid #e2e8f0; border-radius:6px; }
        footer { margin-top:20px; padding-top:10px; border-top:1px solid #e2e8f0; font-size:9px; color:#94a3b8; text-align:center; }
      </style></head><body>${content.innerHTML}</body></html>`);
      w.document.close();
      setTimeout(() => { w.focus(); w.print(); w.close(); }, 400);
    };

    const hasCriticalKeywords = liveKeywords.some(k => k.priority === 'RED');
    const redKws = liveKeywords.filter(k => k.priority === 'RED');
    const yellowKws = liveKeywords.filter(k => k.priority === 'YELLOW');
    const greenKws = liveKeywords.filter(k => k.priority === 'GREEN');
    const imageFiles = fileList.filter(f => /\.(jpe?g|png|webp|gif)$/i.test(f.name) || (f.file && f.file.type?.startsWith('image/')));
    const nonImageFiles = fileList.filter(f => !(/\.(jpe?g|png|webp|gif)$/i.test(f.name) || (f.file && f.file.type?.startsWith('image/'))));

    return (
      <div className="max-w-2xl mx-auto">
        <div ref={cardRef} className="bg-white/90 backdrop-blur-xl rounded-3xl border border-slate-200/80 shadow-xl p-6 sm:p-8">
          <StepBar />

          {/* Header with print button */}
          <div className="flex items-start justify-between mb-5">
            <div>
              <span className="text-xs font-bold text-clinical-600 uppercase tracking-wider">Step 6 of 6</span>
              <h2 ref={headingRef} className="text-2xl font-black font-heading text-slate-900 mt-0.5">Review & Submit</h2>
              <p className="text-xs text-slate-400 mt-0.5">Verify your information before submitting to the OPD system.</p>
            </div>
            <button onClick={printReview} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold shadow hover:bg-slate-800 transition-all flex-shrink-0">
              🖨 Print Preview
            </button>
          </div>

          {/* Critical alert banner */}
          {hasCriticalKeywords && (
            <div className="mb-4 p-3 rounded-2xl bg-rose-50 border-2 border-rose-300 flex gap-3 items-start">
              <span className="text-xl mt-0.5">🚨</span>
              <div>
                <p className="text-xs font-black text-rose-700 uppercase tracking-wider">Critical Symptoms Detected</p>
                <p className="text-[11px] text-rose-600 font-semibold mt-0.5">
                  AI detected <strong>{redKws.length} critical keyword(s)</strong>: {redKws.map(k => k.keyword).join(', ')}. Please inform the receptionist immediately.
                </p>
              </div>
            </div>
          )}

          {/* ── Printable Content Area ── */}
          <div id="review-print-area" className="space-y-4">

            {/* Report header (for print) */}
            <div className="header hidden print:flex" style={{ display:'none' }}>
              <div>
                <h1>VAIDYcare-AI</h1>
                <span style={{ fontSize:'10px', color:'#64748b', textTransform:'uppercase', fontWeight:'800' }}>Patient Pre-Submission Review</span>
              </div>
              <div style={{ textAlign:'right', fontSize:'11px', color:'#64748b' }}>
                {new Date().toLocaleDateString()} {new Date().toLocaleTimeString()}
              </div>
            </div>

            {/* 1. Patient Details */}
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
              <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <span className="w-4 h-4 rounded bg-clinical-600 text-white flex items-center justify-center text-[8px] font-black">P</span>
                Patient Details
              </p>
              <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-xs">
                <div className="row" style={{ display:'flex', justifyContent:'space-between' }}><span className="text-slate-500">Name:</span><span className="font-bold">{formData.fullName || '—'}</span></div>
                <div className="row" style={{ display:'flex', justifyContent:'space-between' }}><span className="text-slate-500">Age / Gender:</span><span className="font-bold">{formData.age}Y – {formData.gender}</span></div>
                <div className="row" style={{ display:'flex', justifyContent:'space-between' }}><span className="text-slate-500">Phone:</span><span className="font-bold">{formData.phone || '—'}</span></div>
                <div className="row" style={{ display:'flex', justifyContent:'space-between' }}><span className="text-slate-500">Care Mode:</span><span className="font-bold uppercase">{careMode}</span></div>
                {formData.abhaId && <div className="col-span-2 row" style={{ display:'flex', justifyContent:'space-between' }}><span className="text-slate-500">ABHA ID:</span><span className="font-mono font-bold">{formData.abhaId}</span></div>}
              </div>
            </div>

            {/* 2. Chief Complaint + Live AI Keywords */}
            <div className={`rounded-2xl p-4 border-2 ${hasCriticalKeywords ? 'bg-rose-50 border-rose-200' : 'bg-white border-slate-200'}`}>
              <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <span className="w-4 h-4 rounded bg-rose-600 text-white flex items-center justify-center text-[8px] font-black">C</span>
                Chief Complaint & AI Analysis
              </p>
              <p className="text-sm font-bold text-slate-800 mb-3 bg-white px-3 py-2 rounded-xl border border-slate-100">
                "{formData.chiefComplaint || 'No complaint entered'}"
              </p>

              {/* Additional symptoms */}
              {formData.symptoms.length > 0 && (
                <div className="mb-3">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Additional Symptoms</span>
                  <div className="flex flex-wrap gap-1">
                    {formData.symptoms.map((s, i) => <span key={i} className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">{s}</span>)}
                  </div>
                </div>
              )}

              {/* AI flagged keywords */}
              {liveKeywords.length > 0 && (
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1.5">🤖 AI Keyword Flags</span>
                  <div className="flex flex-wrap gap-1.5">
                    {redKws.map((k, i) => (
                      <span key={i} title={k.suspected_disease} className="text-[10px] font-black px-2 py-0.5 rounded-full border bg-rose-100 text-rose-800 border-rose-300">
                        🔴 {k.keyword}{k.icd_code ? ` (${k.icd_code})` : ''}
                      </span>
                    ))}
                    {yellowKws.map((k, i) => (
                      <span key={i} title={k.suspected_disease} className="text-[10px] font-black px-2 py-0.5 rounded-full border bg-amber-100 text-amber-800 border-amber-300">
                        🟡 {k.keyword}
                      </span>
                    ))}
                    {greenKws.map((k, i) => (
                      <span key={i} className="text-[10px] font-bold px-2 py-0.5 rounded-full border bg-emerald-100 text-emerald-700 border-emerald-200">
                        🟢 {k.keyword}
                      </span>
                    ))}
                  </div>
                  {redKws.length > 0 && (
                    <div className="mt-2 text-[10px] text-rose-600 font-bold bg-rose-50 px-3 py-2 rounded-lg border border-rose-200">
                      ⚠️ Suspected: {[...new Set(redKws.filter(k => k.suspected_disease).map(k => k.suspected_disease))].join(' · ') || 'High-priority symptom pattern detected'}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 3. Interview Summary — color-coded flags */}
            {Object.keys(answers).length > 0 && (() => {
              // Inline flag classifier (mirrors DoctorPortal logic)
              const getFlag = (label, value) => {
                const v = (Array.isArray(value) ? value.join(' ') : (value || '')).toUpperCase();
                const l = (label || '').toUpperCase();
                const redVals = ['SEVERE','10 (WORST','7-9','CHEST PAIN','HEAVY BLEEDING','COUGHING BLOOD','VOMITING BLOOD','HEART SURGERY','HEART DISEASE','CANCER','KIDNEY DISEASE','LIVER DISEASE','ALLERGIC TO PENICILLIN','ALLERGIC TO ASPIRIN','MULTIPLE MEDICINES','SPREADS TO CHEST','SHORTNESS OF BREATH','WHEEZING','HIGH FEVER','CURRENT SMOKER - 10 OR MORE','STROKE'];
                const yellowVals = ['MODERATE','4-6','DIABETES','HYPERTENSION','ASTHMA','THYROID','ARTHRITIS','ABDOMINAL SURGERY','ORTHOPAEDIC SURGERY','BLOOD PRESSURE MEDICINE','DIABETES MEDICINE','PAIN KILLERS','ALLERGIC TO','EX-SMOKER','REGULARLY - MODERATE','LOW GRADE FEVER','NAUSEA','DIARRHEA','CONSTIPATION','ACIDITY','COUGH WITH PHLEGM','DRY COUGH','HEADACHE','DIZZINESS','NUMBNESS','COMES AND GOES','WORSE AT NIGHT','WORSE IN MORNING','HIGH SUGAR','CHEWING TOBACCO'];
                if (redVals.some(r => v.includes(r))) return 'RED';
                if (yellowVals.some(y => v.includes(y))) return 'YELLOW';
                if (l.includes('ALLERGY') && !v.includes('NO KNOWN')) return 'YELLOW';
                if (l.includes('PAST MEDICAL') && !v.includes('NONE')) return 'YELLOW';
                if (l.includes('FAMILY') && !v.includes('NONE')) return 'YELLOW';
                if (l.includes('SMOKING') && !v.includes('NEVER')) return 'YELLOW';
                return 'GREEN';
              };

              const flagStyles = {
                RED:    { card: 'bg-rose-50 border-rose-200', label: 'text-rose-400', value: 'text-rose-800 font-black', dot: 'bg-rose-500 animate-pulse' },
                YELLOW: { card: 'bg-amber-50 border-amber-200', label: 'text-amber-500', value: 'text-amber-900 font-bold', dot: 'bg-amber-400' },
                GREEN:  { card: 'bg-white border-slate-100', label: 'text-slate-400', value: 'text-slate-800 font-bold', dot: 'bg-emerald-400' },
              };

              const answeredQs = flow.filter(q => answers[q.key] && answers[q.key] !== 'Not reported');
              const redCount = answeredQs.filter(q => getFlag(q.text, answers[q.key]) === 'RED').length;
              const yellowCount = answeredQs.filter(q => getFlag(q.text, answers[q.key]) === 'YELLOW').length;

              return (
                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                      <span className="w-4 h-4 rounded bg-indigo-600 text-white flex items-center justify-center text-[8px] font-black">I</span>
                      Clinical Interview ({answeredQs.length}/{flow.length})
                    </p>
                    <div className="flex items-center gap-2">
                      {redCount > 0 && <span className="text-[8px] font-black px-1.5 py-0.5 rounded-full bg-rose-100 text-rose-700 border border-rose-200">{redCount} 🔴</span>}
                      {yellowCount > 0 && <span className="text-[8px] font-black px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200">{yellowCount} 🟡</span>}
                      <span className="text-[8px] font-black px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">{answeredQs.length - redCount - yellowCount} 🟢</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {answeredQs.map((q, i) => {
                      const flag = getFlag(q.text, answers[q.key]);
                      const st = flagStyles[flag];
                      return (
                        <div key={i} className={`rounded-xl px-3 py-2 border ${st.card}`}>
                          <div className="flex items-center gap-1 mb-0.5">
                            <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${st.dot}`}></span>
                            <span className={`text-[9px] font-extrabold uppercase truncate ${st.label}`}>{q.text.slice(0,45)}{q.text.length > 45 ? '…' : ''}</span>
                          </div>
                          <span className={`text-xs ${st.value}`}>{answers[q.key]}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            {/* 4. Uploaded Documents with Image Previews */}
            {fileList.length > 0 && (
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded bg-teal-600 text-white flex items-center justify-center text-[8px] font-black">D</span>
                  Uploaded Documents ({fileList.length} file{fileList.length !== 1 ? 's' : ''}) — AI will scan
                </p>

                {/* Image previews */}
                {imageFiles.length > 0 && (
                  <div className="mb-3">
                    <span className="text-[9px] font-bold text-slate-400 uppercase block mb-2">Medical Images / Scans</span>
                    <div className="img-grid" style={{ display:'flex', flexWrap:'wrap', gap:'8px' }}>
                      {imageFiles.map((item, idx) => (
                        <div key={idx} className="relative rounded-xl overflow-hidden border border-slate-200 shadow-sm" style={{ width:'120px' }}>
                          <img src={item.preview} alt={item.name} className="w-full h-24 object-cover" />
                          <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent px-1.5 py-1">
                            <span className="text-[8px] text-white font-bold truncate block">{item.name}</span>
                            <span className="text-[7px] text-blue-300 font-black">AI SCAN PENDING</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Non-image files */}
                {nonImageFiles.length > 0 && (
                  <div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase block mb-2">Other Documents</span>
                    <div className="space-y-1.5">
                      {nonImageFiles.map((item, idx) => (
                        <div key={idx} className="flex items-center gap-2 bg-white rounded-lg px-3 py-2 border border-slate-200">
                          <span className="text-lg">📄</span>
                          <div>
                            <span className="text-xs font-bold text-slate-700 block">{item.name}</span>
                            <span className="text-[9px] text-teal-600 font-black">AI SCAN PENDING</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

          </div>
          {/* ── End printable area ── */}

          {error && <div className="mt-3 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold">Error: {error}</div>}

          <div className="flex gap-3 mt-5">
            <button onClick={() => setStep(4)} className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold">{t('kiosk.back', 'Back')}</button>
            <button onClick={handleSubmit} disabled={loading} className="flex-2 flex-grow-[2] py-4 rounded-2xl bg-gradient-to-r from-clinical-600 to-brand-600 text-white font-black text-sm shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2">
              {loading ? (
                <><span className="animate-spin">⟳</span> Processing with AI...</>
              ) : (
                t('kiosk.submitGenerate', 'Submit & Generate OPD Slip')
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
