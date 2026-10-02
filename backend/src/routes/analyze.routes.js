const express = require('express');
const router = express.Router();
const analyzeController = require('../controllers/analyze.controller');

router.post('/analyze', analyzeController.analyzeCode);

module.exports = router;
