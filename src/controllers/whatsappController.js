const { validationResult } = require('express-validator');
const logger = require('../utils/logger');
const messageService = require('../services/messageService');
const languageService = require('../services/languageService');
const aiService = require('../services/aiService');
const voiceService = require('../services/voiceService');
const supabaseService = require('../services/supabaseService');

class WhatsAppController {
  
  // Verify webhook (required by Twilio and other providers)
  async verifyWebhook(req, res) {
    try {
      const token = req.query['hub.verify_token'];
      const challenge = req.query['hub.challenge'];
      
      if (token === process.env.WEBHOOK_VERIFY_TOKEN || token === 'health_assistant_verify') {
        logger.info('Webhook verified successfully');
        return res.status(200).send(challenge);
      }
      
      logger.warn('Webhook verification failed - invalid token');
      return res.status(403).send('Forbidden');
    } catch (error) {
      logger.error('Webhook verification error:', error);
      return res.status(500).send('Internal Server Error');
    }
  }

  // Handle incoming WhatsApp messages
  async handleIncomingMessage(req, res) {
    try {
      // Validate request
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        logger.warn('Invalid WhatsApp message format:', errors.array());
        return res.status(400).json({ error: 'Invalid message format', details: errors.array() });
      }

      const {
        From: phoneNumber,
        Body: messageBody,
        MediaUrl0: mediaUrl,
        MediaContentType0: mediaType,
        MessageSid: messageSid
      } = req.body;

      logger.info(`📱 Incoming message from ${phoneNumber}: ${messageBody || 'Voice/Media message'}`);

      // Acknowledge receipt immediately
      res.status(200).send('OK');

      // Process message asynchronously
      this.processMessage({
        phoneNumber,
        messageBody,
        mediaUrl,
        mediaType,
        messageSid
      });

    } catch (error) {
      logger.error('Error handling incoming message:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Process WhatsApp message (text or voice)
  async processMessage({ phoneNumber, messageBody, mediaUrl, mediaType, messageSid }) {
    try {
      let userQuery = messageBody;
      let isVoiceMessage = false;

      // Handle voice messages
      if (mediaUrl && mediaType && mediaType.includes('audio')) {
        logger.info(`🎤 Processing voice message from ${phoneNumber}`);
        isVoiceMessage = true;
        
        try {
          userQuery = await voiceService.convertSpeechToText(mediaUrl);
          logger.info(`🔄 Voice converted to text: ${userQuery}`);
        } catch (voiceError) {
          logger.error('Voice conversion failed:', voiceError);
          await messageService.sendWhatsAppMessage(
            phoneNumber,
            'मुझे आपकी आवाज़ समझने में परेशानी हुई। कृपया टेक्स्ट में लिखें या फिर से बोलें। 🎤\n\nI had trouble understanding your voice. Please type your message or speak again.'
          );
          return;
        }
      }

      // Skip processing if no query content
      if (!userQuery || userQuery.trim().length === 0) {
        logger.warn(`Empty message from ${phoneNumber}`);
        await messageService.sendWhatsAppMessage(
          phoneNumber,
          'नमस्ते! मैं आपका स्वास्थ्य सहायक हूं। कृपया अपना स्वास्थ्य संबंधी प्रश्न पूछें। 🏥\n\nHello! I am your health assistant. Please ask your health-related question.'
        );
        return;
      }

      // Detect language
      const detectedLanguage = await languageService.detectLanguage(userQuery);
      logger.info(`🌐 Detected language: ${detectedLanguage} for query: ${userQuery}`);

      // Get user context from Supabase
      const userContext = await supabaseService.getUserContext(phoneNumber);
      
      // Store current query
      await supabaseService.storeUserQuery(phoneNumber, userQuery, detectedLanguage);

      // Process health query with AI
      const aiResponse = await aiService.processHealthQuery({
        query: userQuery,
        language: detectedLanguage,
        context: userContext,
        phoneNumber
      });

      // Store AI response
      await supabaseService.storeAiResponse(phoneNumber, userQuery, aiResponse.message, aiResponse.provider);

      // Handle voice response if original was voice message
      if (isVoiceMessage && aiResponse.message) {
        try {
          const voiceUrl = await voiceService.convertTextToSpeech(aiResponse.message, detectedLanguage);
          await messageService.sendWhatsAppVoiceMessage(phoneNumber, voiceUrl);
          logger.info(`🔊 Voice response sent to ${phoneNumber}`);
        } catch (voiceError) {
          logger.error('TTS conversion failed, sending text response:', voiceError);
          await messageService.sendWhatsAppMessage(phoneNumber, aiResponse.message);
        }
      } else {
        // Send text response
        await messageService.sendWhatsAppMessage(phoneNumber, aiResponse.message);
      }

      logger.info(`✅ Message processed successfully for ${phoneNumber}`);

    } catch (error) {
      logger.error('Error processing message:', error);
      
      // Send error message to user
      const errorMessage = languageService.getErrorMessage(error.message);
      await messageService.sendWhatsAppMessage(phoneNumber, errorMessage);
    }
  }

  // Handle message status callbacks
  async handleStatusCallback(req, res) {
    try {
      const { MessageStatus, MessageSid, To } = req.body;
      
      logger.info(`📊 Message status update: ${MessageStatus} for ${MessageSid} to ${To}`);
      
      // Store status in database if needed
      await supabaseService.updateMessageStatus(MessageSid, MessageStatus);
      
      res.status(200).send('OK');
    } catch (error) {
      logger.error('Error handling status callback:', error);
      res.status(500).send('Error');
    }
  }
}

module.exports = new WhatsAppController();