const twilio = require('twilio');
const axios = require('axios');
const logger = require('../utils/logger');

class MessageService {
  constructor() {
    // Initialize Twilio client
    if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
      this.twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
      this.twilioNumber = process.env.TWILIO_PHONE_NUMBER;
    }

    // Initialize other providers
    this.mtalkzApiKey = process.env.MTALKZ_API_KEY;
    this.smsIndiaHubApiKey = process.env.SMSINDIALUB_API_KEY;
  }

  // Send WhatsApp text message via Twilio
  async sendWhatsAppMessage(to, message) {
    try {
      if (!this.twilioClient) {
        throw new Error('Twilio client not configured');
      }

      const result = await this.twilioClient.messages.create({
        body: message,
        from: `whatsapp:${this.twilioNumber}`,
        to: `whatsapp:${to}`
      });

      logger.info(`📤 WhatsApp message sent via Twilio to ${to}, SID: ${result.sid}`);
      return result;

    } catch (error) {
      logger.error('Failed to send WhatsApp message via Twilio:', error);
      
      // Try alternative providers
      return await this.sendViaMtalkz(to, message) || 
             await this.sendViaSmsIndiaHub(to, message);
    }
  }

  // Send WhatsApp voice message via Twilio
  async sendWhatsAppVoiceMessage(to, mediaUrl) {
    try {
      if (!this.twilioClient) {
        throw new Error('Twilio client not configured');
      }

      const result = await this.twilioClient.messages.create({
        mediaUrl: [mediaUrl],
        from: `whatsapp:${this.twilioNumber}`,
        to: `whatsapp:${to}`
      });

      logger.info(`🔊 WhatsApp voice message sent via Twilio to ${to}, SID: ${result.sid}`);
      return result;

    } catch (error) {
      logger.error('Failed to send WhatsApp voice message via Twilio:', error);
      throw error;
    }
  }

  // Send via Mtalkz (alternative provider)
  async sendViaMtalkz(to, message) {
    try {
      if (!this.mtalkzApiKey) {
        throw new Error('Mtalkz API key not configured');
      }

      const response = await axios.post('https://api.mtalkz.com/send', {
        auth_key: this.mtalkzApiKey,
        to: to.replace('+', ''),
        message: message,
        sender: 'HEALTH'
      }, {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      logger.info(`📤 WhatsApp message sent via Mtalkz to ${to}`);
      return response.data;

    } catch (error) {
      logger.error('Failed to send WhatsApp message via Mtalkz:', error);
      return null;
    }
  }

  // Send via SMSIndiaHub (alternative provider)
  async sendViaSmsIndiaHub(to, message) {
    try {
      if (!this.smsIndiaHubApiKey) {
        throw new Error('SMSIndiaHub API key not configured');
      }

      const response = await axios.post('https://api.smsindialub.com/sms/v3/send', {
        apikey: this.smsIndiaHubApiKey,
        sender: 'HEALTH',
        mobileno: to.replace('+', ''),
        text: message
      }, {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      logger.info(`📤 WhatsApp message sent via SMSIndiaHub to ${to}`);
      return response.data;

    } catch (error) {
      logger.error('Failed to send WhatsApp message via SMSIndiaHub:', error);
      return null;
    }
  }

  // Send emergency alert (prioritized delivery)
  async sendEmergencyAlert(to, message) {
    try {
      // Add emergency prefix
      const emergencyMessage = `🚨 EMERGENCY HEALTH ALERT 🚨\n\n${message}\n\n⚠️ Please seek immediate medical attention or call emergency services.`;

      // Try all available providers for emergency messages
      const results = await Promise.allSettled([
        this.sendWhatsAppMessage(to, emergencyMessage),
        this.sendViaMtalkz(to, emergencyMessage),
        this.sendViaSmsIndiaHub(to, emergencyMessage)
      ]);

      const successful = results.filter(result => result.status === 'fulfilled');
      
      if (successful.length > 0) {
        logger.info(`🚨 Emergency alert sent successfully to ${to} via ${successful.length} provider(s)`);
        return true;
      } else {
        logger.error(`🚨 Failed to send emergency alert to ${to} via all providers`);
        return false;
      }

    } catch (error) {
      logger.error('Error sending emergency alert:', error);
      return false;
    }
  }

  // Format message with disclaimer
  formatHealthResponse(message, language = 'en') {
    const disclaimers = {
      en: '\n\n⚠️ DISCLAIMER: This is AI-generated health information for educational purposes only. Always consult a qualified healthcare professional for medical advice, diagnosis, or treatment.',
      hi: '\n\n⚠️ चेतावनी: यह AI द्वारा तैयार स्वास्थ्य जानकारी केवल शैक्षिक उद्देश्यों के लिए है। चिकित्सा सलाह, निदान या उपचार के लिए हमेशा योग्य स्वास्थ्य पेशेवर से सलाह लें।',
      hinglish: '\n\n⚠️ DISCLAIMER: Ye AI-generated health information sirf educational purpose ke liye hai. Medical advice, diagnosis ya treatment ke liye hamesha qualified doctor se consult kariye.'
    };

    return message + (disclaimers[language] || disclaimers.en);
  }

  // Send typing indicator (if supported)
  async sendTypingIndicator(to) {
    try {
      // This is a placeholder - implement if the provider supports typing indicators
      logger.debug(`💭 Typing indicator sent to ${to}`);
    } catch (error) {
      logger.debug('Typing indicator not supported:', error.message);
    }
  }
}

module.exports = new MessageService();