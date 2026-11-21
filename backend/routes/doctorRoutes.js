const express = require('express');
const router = express.Router();
const {
  getEncounterByToken,
  updateEncounterSummary,
  getAllEncounters,
  generateSoapNote,
  saveSoapNote,
  getPatientHistory
} = require('../controllers/doctorController');

// Existing routes
router.get('/encounter/:token',           getEncounterByToken);
router.patch('/encounter/:token/summary', updateEncounterSummary);
router.get('/encounters',                 getAllEncounters);

// SOAP Note routes
router.post('/encounter/:token/soap',     generateSoapNote);   // Generate via Gemini
router.patch('/encounter/:token/soap',    saveSoapNote);       // Save doctor edits

// Patient EHR Timeline
// GET /api/doctor/patient-history?phone=XXX&abha_id=YYY&exclude_token=V-1234
router.get('/patient-history',            getPatientHistory);

module.exports = router;
