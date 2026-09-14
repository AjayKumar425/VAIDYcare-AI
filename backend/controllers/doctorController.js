const Encounter = require('../models/Encounter');

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
          created_at: encounter.created_at
        },
        documents: encounter.documents
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

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

exports.getAllEncounters = async (req, res) => {
  try {
    const encounters = await Encounter.find({})
      .sort({ created_at: -1 })
      .limit(50)
      .select('token_number patient chief_complaint triage_summary status care_mode created_at');
    res.json({ success: true, encounters });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
