const express = require('express');
const { body, validationResult } = require('express-validator');
const whatsappController = require('../controllers/whatsappController');

const router = express.Router();

// Webhook verification (for Twilio and other providers)
router.get('/', whatsappController.verifyWebhook);

// Webhook for incoming messages
router.post('/', [
  body('From').notEmpty().withMessage('From number is required'),
  body('Body').optional(),
  body('MediaUrl0').optional(),
  body('MediaContentType0').optional()
], whatsappController.handleIncomingMessage);

// Status callback for message delivery
router.post('/status', whatsappController.handleStatusCallback);

module.exports = router;