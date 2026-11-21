const Encounter = require('../models/Encounter');
const { generateSoapNote: geminiGenerateSoap } = require('../services/geminiService');

// ─── Get encounter by token ───────────────────────────────────────────────────
exports.getEncounterByToken = async (req, res) => {
  try {
    const { token } = req.params;
    const encounter = await Encounter.findOne({ token_number: token.toUpperCase() });
    if (!encounter) return res.status(404).json({ success: false, message: 'Encounter token not found' });
    res.json({
      success: true,
      encounter: {
        session: {
          session_id: encounter._id,
          token_number: encounter.token_number,
          patient_id: encounter.patient.patient_id,
          full_name: encounter.patient.full_name,
          age: encounter.patient.age,
          gender: encounter.patient.gender,
          phone: encounter.patient.phone,
          abha_id: encounter.patient.abha_id,
          chief_complaint: encounter.chief_complaint,
          symptoms: JSON.stringify(encounter.symptoms),
          care_mode: encounter.care_mode,
          triage_summary: encounter.triage_summary,
          structured_hpi: encounter.structured_hpi,
          interview_answers: encounter.interview_answers,
          status: encounter.status,
          soap_note: encounter.soap_note || null,
          created_at: encounter.created_at
        },
        documents: encounter.documents
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ─── Update encounter summary (status / notes) ────────────────────────────────
exports.updateEncounterSummary = async (req, res) => {
  try {
    const { token } = req.params;
    const { chief_complaint, clinical_note, status, doctor_notes } = req.body;
    const encounter = await Encounter.findOne({ token_number: token.toUpperCase() });
    if (!encounter) return res.status(404).json({ success: false, message: 'Encounter not found' });
    if (chief_complaint) encounter.chief_complaint = chief_complaint;
    if (clinical_note) encounter.triage_summary.clinical_note = clinical_note;
    if (status) encounter.status = status;
    if (doctor_notes) encounter.doctor_notes = doctor_notes;
    encounter.status = status || 'IN_PROGRESS';
    await encounter.save();
    res.json({ success: true, message: 'Encounter summary updated successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ─── Get all encounters (queue list) ─────────────────────────────────────────
exports.getAllEncounters = async (req, res) => {
  try {
    const encounters = await Encounter.find({})
      .sort({ created_at: -1 })
      .limit(50)
      .select('token_number patient chief_complaint triage_summary status care_mode soap_note created_at');
    res.json({ success: true, encounters });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ─── Generate SOAP Note via Gemini ───────────────────────────────────────────
exports.generateSoapNote = async (req, res) => {
  try {
    const { token } = req.params;
    const encounter = await Encounter.findOne({ token_number: token.toUpperCase() });
    if (!encounter) return res.status(404).json({ success: false, message: 'Encounter not found' });

    // If already finalized, return as-is
    if (encounter.soap_note && encounter.soap_note.is_finalized) {
      return res.json({
        success: true,
        soap_note: encounter.soap_note,
        message: 'This note is finalized. Unlock it to regenerate.'
      });
    }

    console.log(`[SOAP] Generating note for encounter ${token}...`);
    const soap = await geminiGenerateSoap(encounter);

    // Auto-save the generated draft to DB
    encounter.soap_note = {
      ...soap,
      generated_at: new Date(),
      last_edited_at: new Date(),
      is_finalized: false
    };
    await encounter.save();

    res.json({ success: true, soap_note: encounter.soap_note });
  } catch (error) {
    console.error('generateSoapNote error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ─── Save / update SOAP Note (after doctor edits) ────────────────────────────
exports.saveSoapNote = async (req, res) => {
  try {
    const { token } = req.params;
    const { subjective, objective, assessment, plan, follow_up, icd_codes, is_finalized } = req.body;

    const encounter = await Encounter.findOne({ token_number: token.toUpperCase() });
    if (!encounter) return res.status(404).json({ success: false, message: 'Encounter not found' });

    if (!encounter.soap_note) encounter.soap_note = {};

    if (subjective  !== undefined) encounter.soap_note.subjective  = subjective;
    if (objective   !== undefined) encounter.soap_note.objective   = objective;
    if (assessment  !== undefined) encounter.soap_note.assessment  = assessment;
    if (plan        !== undefined) encounter.soap_note.plan        = plan;
    if (follow_up   !== undefined) encounter.soap_note.follow_up   = follow_up;
    if (icd_codes   !== undefined) encounter.soap_note.icd_codes   = icd_codes;
    if (is_finalized !== undefined) encounter.soap_note.is_finalized = is_finalized;

    encounter.soap_note.last_edited_at = new Date();
    // Promote status when a SOAP note is being written
    if (encounter.status === 'WAITING') encounter.status = 'IN_PROGRESS';

    await encounter.save();
    res.json({ success: true, soap_note: encounter.soap_note, message: 'SOAP note saved.' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ─── Patient EHR Timeline ─────────────────────────────────────────────────────
// Returns all encounters for a patient, matched by phone OR abha_id
exports.getPatientHistory = async (req, res) => {
  try {
    const { phone, abha_id, exclude_token } = req.query;

    if (!phone && !abha_id) {
      return res.status(400).json({
        success: false,
        message: 'Provide phone or abha_id to look up patient history'
      });
    }

    const orConditions = [];
    if (phone && phone.trim())     orConditions.push({ 'patient.phone':   phone.trim() });
    if (abha_id && abha_id.trim()) orConditions.push({ 'patient.abha_id': abha_id.trim() });

    const encounters = await Encounter.find({ $or: orConditions })
      .sort({ created_at: -1 })
      .select('token_number patient chief_complaint triage_summary status care_mode soap_note documents created_at');

    // Exclude current encounter from the timeline if requested
    const history = exclude_token
      ? encounters.filter(e => e.token_number !== exclude_token.toUpperCase())
      : encounters;

    res.json({
      success: true,
      patient_name: encounters[0]?.patient?.full_name || 'Unknown',
      total_visits: encounters.length,
      encounters: history.map(e => ({
        token_number:       e.token_number,
        patient_id:         e.patient?.patient_id || null,
        chief_complaint:    e.chief_complaint,
        status:             e.status,
        care_mode:          e.care_mode,
        risk_level:         e.triage_summary?.risk_level || 'SAFE',
        risk_score:         e.triage_summary?.risk_score || 0,
        suspected_diseases: (e.triage_summary?.suspected_diseases || []).slice(0, 3),
        soap_note: e.soap_note?.is_finalized
          ? {
              assessment:   e.soap_note.assessment,
              plan:         e.soap_note.plan,
              icd_codes:    e.soap_note.icd_codes,
              is_finalized: true
            }
          : null,
        doc_count:    e.documents?.length || 0,
        created_at:   e.created_at
      }))
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
