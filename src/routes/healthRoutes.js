const express = require('express');
const healthController = require('../controllers/healthController');
const keepAliveService = require('../services/keepAliveService');

const router = express.Router();

// Get health information
router.get('/info/:condition', healthController.getHealthInfo);

// Get user conversation history
router.get('/history/:userId', healthController.getUserHistory);

// Manual health query (for testing)
router.post('/query', healthController.processHealthQuery);

// Keep-alive service status and control
router.get('/keep-alive/status', (req, res) => {
  try {
    const status = keepAliveService.getStatus();
    res.json({
      success: true,
      keepAlive: status,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get keep-alive status',
      message: error.message
    });
  }
});

// Manual keep-alive ping (for testing)
router.post('/keep-alive/ping', async (req, res) => {
  try {
    await keepAliveService.manualPing();
    res.json({
      success: true,
      message: 'Manual ping completed',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Manual ping failed',
      message: error.message
    });
  }
});

module.exports = router;