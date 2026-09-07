const express = require('express');
const router = express.Router();
const { getEncounterByToken } = require('../controllers/doctorController');

router.get('/encounter/:token', getEncounterByToken);

module.exports = router;