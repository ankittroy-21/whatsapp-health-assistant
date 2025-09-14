const express = require('express');
const healthController = require('../controllers/healthController');

const router = express.Router();

// Get health information
router.get('/info/:condition', healthController.getHealthInfo);

// Get user conversation history
router.get('/history/:userId', healthController.getUserHistory);

// Manual health query (for testing)
router.post('/query', healthController.processHealthQuery);

module.exports = router;