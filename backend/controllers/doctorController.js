const Encounter = require('../models/Encounter');

exports.getEncounterByToken = async (req, res) => {
  try {
    const { token } = req.params;

    const encounter = await Encounter.findOne({ token_number: token.toUpperCase() });

    if (!encounter) {
      return res.status(404).json({ success: false, message: 'Encounter token not found' });
    }

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
          triage_summary: encounter.triage_summary,
          created_at: encounter.created_at
        },
        documents: encounter.documents
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};