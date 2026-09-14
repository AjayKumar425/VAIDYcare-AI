const express = require('express');
const router = express.Router();
const { getEncounterByToken, updateEncounterSummary, getAllEncounters } = require('../controllers/doctorController');

router.get('/encounter/:token', getEncounterByToken);
router.patch('/encounter/:token/summary', updateEncounterSummary);
router.get('/encounters', getAllEncounters);

module.exports = router;
