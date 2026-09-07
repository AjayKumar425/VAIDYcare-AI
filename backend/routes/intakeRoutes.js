const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload');
const { submitKioskSession } = require('../controllers/intakeController');

router.post('/submit', upload.array('documents', 5), submitKioskSession);

module.exports = router;