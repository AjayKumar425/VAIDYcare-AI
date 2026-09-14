// backend/services/aiEngine.js

const RED_FLAG_RULES = [
  { test: /chest pain/i, needs: [/breath/i, /sweat/i, /left arm/i, /jaw/i], label: 'CARDIAC_EMERGENCY: Chest pain with radiating / autonomic symptoms' },
  { test: /(sudden|slurred speech|face.*droop|one side.*weak|numbness on one side)/i, needs: [], label: 'STROKE_FAST: Acute neurological deficit detected' },
  { test: /(can'"'"'t breathe|difficulty breathing|breathless at rest|gasping)/i, needs: [], label: 'RESPIRATORY_DISTRESS: Severe airway / oxygenation compromise' },
  { test: /(suicid|self harm|end my life|kill myself)/i, needs: [], label: 'PSYCH_EMERGENCY: Immediate mental health triage needed' },
  { test: /(heavy bleeding|won'"'"'t stop bleeding|coughing blood|vomiting blood)/i, needs: [], label: 'HEMORRHAGE: Uncontrolled active bleeding' },
  { test: /(unconscious|fainted|passed out|seizure|fit)/i, needs: [], label: 'NEURO_CRITICAL: Loss of consciousness / active seizure' },
  { test: /(high fever).*(stiff neck|confusion)/i, needs: [], label: 'MENINGISM: High fever with neurological signs' },
  { test: /(severe abdominal pain|worst pain of my life)/i, needs: [], label: 'ACUTE_ABDOMEN: Severe acute abdominal pain' },
];

function detectRedFlags(text) {
  if (!text) return [];
  const flags = [];
  for (const rule of RED_FLAG_RULES) {
    if (rule.test.test(text)) {
      if (rule.needs.length === 0 || rule.needs.some((n) => n.test(text))) {
        flags.push(rule.label);
      }
    }
  }
  return flags;
}

const GENERAL_FLOW = [
  { key: 'onset', section: 'HPI', type: 'choice', text: 'When did this start?', text_hi: 'यह कब शुरू हुआ?', options: ['Today', 'Last 2-3 days', 'This week', 'This month', 'Longer than a month'] },
  { key: 'character', section: 'HPI', type: 'choice', text: 'How does it feel?', text_hi: 'यह कैसा महसूस होता है?', options: ['Sharp / Stabbing', 'Dull / Aching', 'Burning', 'Throbbing / Pulsing', 'Pressure / Tightness'] },
  { key: 'radiation', section: 'HPI', type: 'choice', text: 'Does it spread or move to another area?', text_hi: 'क्या यह दूसरी जगह फैलता है?', options: ['Stays in one spot', 'Spreads to back / arm / neck', 'Spreads to legs', 'Spreads to chest', 'Not applicable'] },
  { key: 'timing', section: 'HPI', type: 'choice', text: 'Is it constant, or does it come and go?', text_hi: 'क्या यह लगातार है या रुक-रुक कर आता है?', options: ['Constant', 'Comes and goes', 'Worse in morning', 'Worse at night', 'After eating'] },
  { key: 'severity', section: 'HPI', type: 'choice', text: 'Rate your pain or discomfort (1 = mild, 10 = worst):', text_hi: 'दर्द की तीव्रता बताएं (1 = हल्का, 10 = असहनीय):', options: ['1-3 (Mild)', '4-6 (Moderate)', '7-9 (Severe)', '10 (Worst Possible)'] },
  { key: 'aggravating', section: 'HPI', type: 'choice', text: 'What makes it worse?', text_hi: 'किससे तकलीफ बढ़ती है?', options: ['Movement / Walking', 'Eating / Drinking', 'Stress / Anxiety', 'Cold weather', 'Nothing in particular'] },
  { key: 'relieving', section: 'HPI', type: 'choice', text: 'What gives you relief?', text_hi: 'किससे आराम मिलता है?', options: ['Rest', 'Medication / Painkillers', 'Heat / Ice pack', 'Food / Water', 'Nothing helps'] },
  { key: 'past_medical_history', section: 'Past History', type: 'multi', text: 'Do you have any existing medical conditions? (Select all that apply)', text_hi: 'क्या आपको कोई पुरानी बीमारी है? (सभी चुनें)', options: ['None', 'Diabetes', 'Hypertension (High BP)', 'Asthma / COPD', 'Heart Disease', 'Thyroid', 'Kidney Disease', 'Liver Disease', 'Cancer', 'Arthritis'] },
  { key: 'past_surgical_history', section: 'Past History', type: 'choice', text: 'Have you had any surgeries or major procedures before?', text_hi: 'क्या आपकी पहले कोई सर्जरी हुई है?', options: ['No surgeries', 'Yes — Heart surgery', 'Yes — Abdominal surgery', 'Yes — Orthopaedic surgery', 'Yes — Other surgery'] },
  { key: 'current_medications', section: 'Drug History', type: 'choice', text: 'Are you currently taking any medicines?', text_hi: 'क्या आप अभी कोई दवाई ले रहे हैं?', options: ['No medicines', 'Yes — Blood pressure medicine', 'Yes — Diabetes medicine', 'Yes — Pain killers', 'Yes — Multiple medicines', 'Yes — Herbal / Ayurvedic'] },
  { key: 'allergy_history', section: 'Allergy History', type: 'choice', text: 'Do you have any known allergies to medicines or foods?', text_hi: 'क्या आपको किसी दवा या खाने से एलर्जी है?', options: ['No known allergies', 'Allergic to Penicillin / Antibiotics', 'Allergic to Aspirin / NSAIDs', 'Allergic to certain foods', 'Allergic to other medicines'] },
  { key: 'family_history', section: 'Family History', type: 'multi', text: 'Does anyone in your immediate family have these conditions? (Select all)', text_hi: 'आपके परिवार में किसी को ये बीमारियाँ हैं? (सभी चुनें)', options: ['None', 'Diabetes', 'Heart Disease / Heart Attack', 'High Blood Pressure', 'Cancer', 'Kidney Disease', 'Mental Illness', 'Stroke'] },
  { key: 'smoking_history', section: 'Personal History', type: 'choice', text: 'Do you smoke or use tobacco?', text_hi: 'क्या आप धूम्रपान या तम्बाकू का उपयोग करते हैं?', options: ['Never smoked', 'Ex-smoker (quit)', 'Current smoker — less than 10/day', 'Current smoker — 10 or more/day', 'Chewing tobacco / Gutka'] },
  { key: 'alcohol_history', section: 'Personal History', type: 'choice', text: 'Do you drink alcohol?', text_hi: 'क्या आप शराब पीते हैं?', options: ['No alcohol', 'Occasionally (social drinking)', 'Regularly — moderate', 'Regularly — heavy', 'Stopped recently'] },
  { key: 'diet_history', section: 'Personal History', type: 'choice', text: 'What best describes your diet?', text_hi: 'आपका आहार कैसा है?', options: ['Balanced / Mixed diet', 'Vegetarian', 'Vegan', 'High sugar / Junk food', 'Fasting frequently'] },
  { key: 'ros_fever', section: 'Review of Systems', type: 'choice', text: 'Have you had fever recently?', text_hi: 'क्या आपको हाल ही में बुखार आया है?', options: ['No fever', 'Low grade fever (below 100F)', 'High fever (above 101F)', 'Fever with chills / shivering'] },
  { key: 'ros_gi', section: 'Review of Systems', type: 'choice', text: 'Any stomach or digestion problems recently?', text_hi: 'क्या हाल ही में पेट की कोई तकलीफ हुई है?', options: ['None', 'Nausea / Vomiting', 'Diarrhea / Loose motions', 'Constipation', 'Acidity / Heartburn', 'Loss of appetite'] },
  { key: 'ros_respiratory', section: 'Review of Systems', type: 'choice', text: 'Any breathing or chest symptoms?', text_hi: 'क्या सांस या सीने में कोई तकलीफ है?', options: ['None', 'Cough (dry)', 'Cough with phlegm', 'Shortness of breath on exertion', 'Wheezing', 'Chest pain or tightness'] },
  { key: 'ros_neuro', section: 'Review of Systems', type: 'choice', text: 'Any headache, dizziness, or neurological symptoms?', text_hi: 'क्या सिरदर्द, चक्कर, या कोई और लक्षण है?', options: ['None', 'Headache', 'Dizziness / Vertigo', 'Numbness or tingling', 'Memory problems', 'Sleep disturbance'] },
];

const AYUSH_FLOW = [
  { key: 'prakriti', section: 'Dashavidha — Prakriti', type: 'choice', text: 'What is your body constitution (Prakriti)?', text_hi: 'आपकी प्रकृति क्या है?', options: ['Vata dominant (Light / Quick / Creative)', 'Pitta dominant (Warm / Intense / Sharp)', 'Kapha dominant (Calm / Heavy / Steady)', 'Mixed Vata-Pitta', 'Mixed Pitta-Kapha', 'Mixed / Tridoshic'] },
  { key: 'vikriti', section: 'Dashavidha — Vikriti', type: 'choice', text: 'What is your current imbalance (Vikriti)?', text_hi: 'अभी आपकी विकृति क्या है?', options: ['Vata imbalance (Dryness / Anxiety / Pain)', 'Pitta imbalance (Inflammation / Acidity / Anger)', 'Kapha imbalance (Heaviness / Congestion / Lethargy)', 'No apparent imbalance', 'Not sure'] },
  { key: 'sara', section: 'Dashavidha — Sara', type: 'choice', text: 'How would you describe your tissue quality (Sara)?', text_hi: 'आपके धातुओं की गुणवत्ता कैसी है?', options: ['Excellent (Pravara Sara — strong, lustrous)', 'Moderate (Madhyama Sara)', 'Poor (Avara Sara — weak, dull)'] },
  { key: 'samhanana', section: 'Dashavidha — Samhanana', type: 'choice', text: 'How would you describe your body build (Samhanana)?', text_hi: 'आपकी शारीरिक बनावट कैसी है?', options: ['Compact / Well-built (Pravara)', 'Average / Moderate (Madhyama)', 'Lean / Loosely built (Avara)'] },
  { key: 'satmya', section: 'Dashavidha — Satmya', type: 'choice', text: 'What type of food have you been adapted to (Satmya)?', text_hi: 'आप किस प्रकार के आहार के अभ्यस्त हैं?', options: ['Sarvarasa (All six tastes)', 'Madhura & Laghu (Sweet & Light foods)', 'Katu & Tikta (Pungent & Bitter foods)', 'Single taste dominated diet'] },
  { key: 'sattva', section: 'Dashavidha — Sattva', type: 'choice', text: 'How would you describe your mental strength (Sattva)?', text_hi: 'आपकी मनोबल शक्ति कैसी है?', options: ['Pravara (High — tolerates pain and stress well)', 'Madhyama (Moderate — sometimes affected)', 'Avara (Low — easily upset or fearful)'] },
  { key: 'agni', section: 'Dashavidha — Agni', type: 'choice', text: 'How is your digestive fire (Agni)?', text_hi: 'आपकी पाचन शक्ति (अग्नि) कैसी है?', options: ['Samagni (Balanced — digests well)', 'Tikshnagni (Sharp — always hungry, fast digestion)', 'Mandagni (Sluggish — slow, heavy after meals)', 'Vishamagni (Irregular — variable appetite)'] },
  { key: 'koshtha', section: 'Dashavidha — Koshtha', type: 'choice', text: 'What is your bowel habit (Koshtha)?', text_hi: 'आपका मल त्याग कैसा है?', options: ['Madhyama (Regular — once or twice daily)', 'Krura (Hard / Constipated / Dry stools)', 'Mridu (Loose / Frequent / Quick)'] },
  { key: 'vyayama_shakti', section: 'Dashavidha — Vyayama Shakti', type: 'choice', text: 'What is your physical exercise capacity (Vyayama Shakti)?', text_hi: 'आपकी शारीरिक व्यायाम क्षमता कितनी है?', options: ['Pravara (High — exercises regularly, good stamina)', 'Madhyama (Moderate — mild exercise tolerated)', 'Avara (Low — gets tired easily, no exercise)'] },
  { key: 'vaya', section: 'Dashavidha — Vaya', type: 'choice', text: 'Which life stage best describes you (Vaya)?', text_hi: 'आप किस जीवन अवस्था में हैं?', options: ['Bala (Child — up to 16 years)', 'Madhyama (Young adult — 16 to 60 years)', 'Vriddha (Elderly — above 60 years)'] },
  { key: 'ahara_shakti', section: 'Dashavidha — Ahara Shakti', type: 'choice', text: 'How is your appetite and food intake capacity (Ahara Shakti)?', text_hi: 'आपकी भूख और खाने की क्षमता कैसी है?', options: ['Good intake (eats full meals)', 'Moderate intake (half portions)', 'Poor intake (very little food)', 'Good digestion of whatever is eaten'] },
  { key: 'nidana', section: 'Nidana (Causative Factors)', type: 'multi', text: 'What do you think caused your current condition? (Select all)', text_hi: 'आपको क्या लगता है इस तकलीफ का कारण क्या है?', options: ['Dietary imbalance (Ahara)', 'Lifestyle change (Vihara)', 'Seasonal change', 'Stress / Mental factors', 'Hereditary / Family history', 'Previous illness', 'Unknown'] },
];

function getFlow(careMode) {
  return careMode === 'ayush' ? [...GENERAL_FLOW, ...AYUSH_FLOW] : GENERAL_FLOW;
}

function getNextQuestion(careMode, answeredKeys = []) {
  const flow = getFlow(careMode);
  const next = flow.find((q) => !answeredKeys.includes(q.key));
  if (!next) return null;
  const idx = flow.findIndex((q) => q.key === next.key);
  return { ...next, progress: Math.round(((idx) / flow.length) * 100) };
}

function buildStructuredSummary(answers = {}, careMode = 'general') {
  const get = (k) => answers[k] || 'Not reported';
  const summary = {
    history_of_present_illness: {
      onset: get('onset'),
      character: get('character'),
      radiation: get('radiation'),
      timing: get('timing'),
      severity: get('severity'),
      aggravating_factors: get('aggravating'),
      relieving_factors: get('relieving'),
    },
    past_medical_history: get('past_medical_history'),
    past_surgical_history: get('past_surgical_history'),
    drug_history: {
      current_medications: get('current_medications'),
      allergies: get('allergy_history'),
    },
    family_history: get('family_history'),
    personal_history: {
      smoking: get('smoking_history'),
      alcohol: get('alcohol_history'),
      diet: get('diet_history'),
    },
    review_of_systems: {
      fever: get('ros_fever'),
      gastrointestinal: get('ros_gi'),
      respiratory: get('ros_respiratory'),
      neurological: get('ros_neuro'),
    },
  };

  if (careMode === 'ayush') {
    summary.ayush_dashavidha_pariksha = {
      prakriti: get('prakriti'),
      vikriti: get('vikriti'),
      sara: get('sara'),
      samhanana: get('samhanana'),
      satmya: get('satmya'),
      sattva: get('sattva'),
      agni: get('agni'),
      koshtha: get('koshtha'),
      vyayama_shakti: get('vyayama_shakti'),
      vaya: get('vaya'),
      ahara_shakti: get('ahara_shakti'),
      nidana: get('nidana'),
    };
  }
  return summary;
}

module.exports = { getFlow, getNextQuestion, detectRedFlags, buildStructuredSummary, GENERAL_FLOW, AYUSH_FLOW };
