// backend/services/aiEngine.js

const RED_FLAG_RULES = [
  { test: /chest pain/i, needs: [/breath/i, /sweat/i, /left arm/i, /jaw/i], label: 'CARDIAC_EMERGENCY: Chest pain with radiating / autonomic symptoms' },
  { test: /(sudden|slurred speech|face.*droop|one side.*weak|numbness on one side)/i, needs: [], label: 'STROKE_FAST: Acute neurological deficit detected' },
  { test: /(can'?t breathe|difficulty breathing|breathless at rest|gasping)/i, needs: [], label: 'RESPIRATORY_DISTRESS: Severe airway / oxygenation compromise' },
  { test: /(suicid|self harm|end my life|kill myself)/i, needs: [], label: 'PSYCH_EMERGENCY: Immediate mental health triage needed' },
  { test: /(heavy bleeding|won'?t stop bleeding|coughing blood|vomiting blood)/i, needs: [], label: 'HEMORRHAGE: Uncontrolled active bleeding' },
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
  { key: 'onset', section: 'HPI', type: 'choice',
    text: 'When did this start?',
    text_hi: 'यह कब शुरू हुआ?',
    options: ['Today', 'Last 2-3 days', 'This week', 'This month', 'Longer than a month'] },
  { key: 'character', section: 'HPI', type: 'choice',
    text: 'How does it feel?',
    text_hi: 'यह कैसा महसूस होता है?',
    options: ['Sharp / Stabbing', 'Dull / Aching', 'Burning', 'Throbbing / Pulsing', 'Pressure / Tightness'] },
  { key: 'radiation', section: 'HPI', type: 'choice',
    text: 'Does it spread or move elsewhere?',
    text_hi: 'क्या यह फैलता है?',
    options: ['Stays in one spot', 'Spreads to back / arm / neck', 'Spreads to legs', 'Not applicable'] },
  { key: 'timing', section: 'HPI', type: 'choice',
    text: 'Is it constant, or does it come and go?',
    text_hi: 'क्या यह लगातार है?',
    options: ['Constant', 'Comes and goes', 'Worse in morning', 'Worse at night'] },
  { key: 'severity', section: 'HPI', type: 'choice',
    text: 'Rate pain/discomfort severity (1 to 10):',
    text_hi: 'गंभीरता (1-10):',
    options: ['1-3 (Mild)', '4-6 (Moderate)', '7-9 (Severe)', '10 (Worst Possible)'] },
  { key: 'past_medical_history', section: 'Past History', type: 'choice',
    text: 'Any existing medical conditions?',
    text_hi: 'कोई पुरानी बीमारी?',
    options: ['None', 'Diabetes', 'Hypertension (High BP)', 'Asthma / COPD', 'Heart Disease', 'Thyroid'] },
];

const AYUSH_FLOW = [
  { key: 'prakriti', section: 'AYUSH — Prakriti', type: 'choice',
    text: 'Body constitution (Prakriti):',
    text_hi: 'आपकी प्रकृति क्या है?',
    options: ['Vata dominant (Light/Quick)', 'Pitta dominant (Warm/Intense)', 'Kapha dominant (Calm/Heavy)', 'Mixed / Tridoshic'] },
  { key: 'agni', section: 'AYUSH — Agni', type: 'choice',
    text: 'Digestive strength (Agni):',
    text_hi: 'पाचन शक्ति:',
    options: ['Tikshnagni (Strong/Quick)', 'Mandagni (Sluggish/Heavy)', 'Vishamagni (Irregular)', 'Samagni (Balanced)'] },
  { key: 'koshtha', section: 'AYUSH — Koshtha', type: 'choice',
    text: 'Bowel nature (Koshtha):',
    text_hi: 'मल त्याग:',
    options: ['Madhyama (Regular)', 'Krura (Constipated/Dry)', 'Mridu (Loose/Quick)'] },
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
    },
    past_medical_history: get('past_medical_history'),
  };

  if (careMode === 'ayush') {
    summary.ayush_dashavidha = {
      prakriti: get('prakriti'),
      agni: get('agni'),
      koshtha: get('koshtha'),
    };
  }

  return summary;
}


module.exports = { getFlow, getNextQuestion, detectRedFlags, buildStructuredSummary, GENERAL_FLOW, AYUSH_FLOW };