const axios = require('axios');
const logger = require('../utils/logger');

class LanguageService {
  constructor() {
    this.bhashiniApiKey = process.env.BHASHINI_API_KEY;
    this.ai4bharatApiKey = process.env.AI4BHARAT_API_KEY;
    this.googleTranslateApiKey = process.env.GOOGLE_TRANSLATE_API_KEY;
  }

  // Detect language of input text
  async detectLanguage(text) {
    try {
      // Simple language detection patterns
      const hindiPattern = /[\u0900-\u097F]/;
      const englishPattern = /^[a-zA-Z\s.,!?'"()-]+$/;
      
      // Check for Hindi script
      if (hindiPattern.test(text)) {
        return 'hi';
      }
      
      // Check for purely English
      if (englishPattern.test(text)) {
        return 'en';
      }
      
      // Check for Hinglish (mixed Hindi-English)
      if (this.isHinglish(text)) {
        return 'hinglish';
      }

      // Try API-based detection for other languages
      return await this.detectViaAPI(text) || 'en';

    } catch (error) {
      logger.error('Language detection failed:', error);
      return 'en'; // Default to English
    }
  }

  // Check if text is Hinglish (mixed Hindi-English)
  isHinglish(text) {
    const hinglishKeywords = [
      'hai', 'hain', 'kya', 'kaise', 'kahan', 'kab', 'kyun', 'kaun',
      'mein', 'main', 'tu', 'tum', 'aap', 'hum', 'woh', 'yeh', 'ye',
      'kar', 'karo', 'karna', 'ho', 'hona', 'tha', 'thi', 'the',
      'acha', 'accha', 'nahi', 'nahin', 'haan', 'ji', 'bhi', 'baat',
      'kuch', 'koi', 'sabhi', 'sab', 'agar', 'lekin', 'par', 'ke',
      'ki', 'ka', 'se', 'mein', 'pe', 'par', 'chahiye', 'jaiye',
      'dijiye', 'kijiye', 'boliye', 'bataye', 'samjha', 'samjhaye'
    ];

    const words = text.toLowerCase().split(/\s+/);
    const hinglishMatches = words.filter(word => 
      hinglishKeywords.some(keyword => word.includes(keyword))
    );

    return hinglishMatches.length > 0 && words.length > 1;
  }

  // API-based language detection
  async detectViaAPI(text) {
    try {
      // Try Bhashini API first
      if (this.bhashiniApiKey) {
        return await this.detectViaBhashini(text);
      }

      // Try AI4Bharat API
      if (this.ai4bharatApiKey) {
        return await this.detectViaAI4Bharat(text);
      }

      return null;
    } catch (error) {
      logger.error('API language detection failed:', error);
      return null;
    }
  }

  // Detect language via Bhashini API
  async detectViaBhashini(text) {
    try {
      const response = await axios.post('https://dhruva-api.bhashini.gov.in/services/inference/pipeline', {
        pipelineTasks: [{
          taskType: "translation",
          config: {
            language: {
              sourceLanguage: "auto",
              targetLanguage: "en"
            }
          }
        }],
        inputData: {
          input: [{
            source: text
          }]
        }
      }, {
        headers: {
          'Authorization': `Bearer ${this.bhashiniApiKey}`,
          'Content-Type': 'application/json'
        }
      });

      const detectedLang = response.data.pipelineResponse[0].config.language.sourceLanguage;
      logger.info(`🌐 Bhashini detected language: ${detectedLang}`);
      return detectedLang;

    } catch (error) {
      logger.error('Bhashini language detection failed:', error);
      return null;
    }
  }

  // Detect language via AI4Bharat API
  async detectViaAI4Bharat(text) {
    try {
      const response = await axios.post('https://api.ai4bharat.org/detect', {
        text: text
      }, {
        headers: {
          'Authorization': `Bearer ${this.ai4bharatApiKey}`,
          'Content-Type': 'application/json'
        }
      });

      const detectedLang = response.data.language;
      logger.info(`🌐 AI4Bharat detected language: ${detectedLang}`);
      return detectedLang;

    } catch (error) {
      logger.error('AI4Bharat language detection failed:', error);
      return null;
    }
  }

  // Translate text to target language
  async translateText(text, targetLanguage, sourceLanguage = 'auto') {
    try {
      // Try Bhashini first
      if (this.bhashiniApiKey) {
        const result = await this.translateViaBhashini(text, targetLanguage, sourceLanguage);
        if (result) return result;
      }

      // Try AI4Bharat
      if (this.ai4bharatApiKey) {
        const result = await this.translateViaAI4Bharat(text, targetLanguage, sourceLanguage);
        if (result) return result;
      }

      // Try Google Translate as fallback
      if (this.googleTranslateApiKey) {
        const result = await this.translateViaGoogle(text, targetLanguage, sourceLanguage);
        if (result) return result;
      }

      // Return original text if translation fails
      return text;

    } catch (error) {
      logger.error('Translation failed:', error);
      return text;
    }
  }

  // Translate via Bhashini API
  async translateViaBhashini(text, targetLanguage, sourceLanguage) {
    try {
      const response = await axios.post('https://dhruva-api.bhashini.gov.in/services/inference/pipeline', {
        pipelineTasks: [{
          taskType: "translation",
          config: {
            language: {
              sourceLanguage: sourceLanguage,
              targetLanguage: targetLanguage
            }
          }
        }],
        inputData: {
          input: [{
            source: text
          }]
        }
      }, {
        headers: {
          'Authorization': `Bearer ${this.bhashiniApiKey}`,
          'Content-Type': 'application/json'
        }
      });

      const translatedText = response.data.pipelineResponse[0].output[0].target;
      logger.info(`🔄 Bhashini translation: ${text} -> ${translatedText}`);
      return translatedText;

    } catch (error) {
      logger.error('Bhashini translation failed:', error);
      return null;
    }
  }

  // Translate via AI4Bharat API
  async translateViaAI4Bharat(text, targetLanguage, sourceLanguage) {
    try {
      const response = await axios.post('https://api.ai4bharat.org/translate', {
        text: text,
        source_language: sourceLanguage,
        target_language: targetLanguage
      }, {
        headers: {
          'Authorization': `Bearer ${this.ai4bharatApiKey}`,
          'Content-Type': 'application/json'
        }
      });

      const translatedText = response.data.translated_text;
      logger.info(`🔄 AI4Bharat translation: ${text} -> ${translatedText}`);
      return translatedText;

    } catch (error) {
      logger.error('AI4Bharat translation failed:', error);
      return null;
    }
  }

  // Translate via Google Translate API
  async translateViaGoogle(text, targetLanguage, sourceLanguage) {
    try {
      const response = await axios.post(`https://translation.googleapis.com/language/translate/v2?key=${this.googleTranslateApiKey}`, {
        q: text,
        source: sourceLanguage === 'auto' ? undefined : sourceLanguage,
        target: targetLanguage,
        format: 'text'
      });

      const translatedText = response.data.data.translations[0].translatedText;
      logger.info(`🔄 Google translation: ${text} -> ${translatedText}`);
      return translatedText;

    } catch (error) {
      logger.error('Google translation failed:', error);
      return null;
    }
  }

  // Get error message in appropriate language
  getErrorMessage(errorType, language = 'en') {
    const errorMessages = {
      network_error: {
        en: 'Network connection issue. Please check your internet connection and try again. 🌐',
        hi: 'नेटवर्क कनेक्शन की समस्या। कृपया अपना इंटरनेट कनेक्शन जांचें और फिर से कोशिश करें। 🌐',
        hinglish: 'Network connection problem hai. Internet check karke phir try kariye. 🌐'
      },
      api_error: {
        en: 'Service temporarily unavailable. Please try again in a few minutes. ⏰',
        hi: 'सेवा अस्थायी रूप से अनुपलब्ध है। कृपया कुछ मिनटों में फिर से कोशिश करें। ⏰',
        hinglish: 'Service temporarily unavailable hai. Kuch minutes baad try kariye. ⏰'
      },
      voice_error: {
        en: 'Unable to process voice message. Please type your question or try speaking again. 🎤',
        hi: 'आवाज़ संदेश को समझने में समस्या। कृपया अपना सवाल टाइप करें या फिर से बोलें। 🎤',
        hinglish: 'Voice message samajh nahi aaya. Question type kariye ya phir se boliye. 🎤'
      },
      general_error: {
        en: 'Something went wrong. Please try again or contact support. 🔧',
        hi: 'कुछ गलत हुआ। कृपया फिर से कोशिश करें या सहायता से संपर्क करें। 🔧',
        hinglish: 'Kuch galat hua hai. Please try again ya support se contact kariye. 🔧'
      }
    };

    return errorMessages[errorType]?.[language] || errorMessages[errorType]?.en || errorMessages.general_error[language];
  }

  // Get greeting message in appropriate language
  getGreetingMessage(language = 'en') {
    const greetings = {
      en: 'Hello! I am your AI health assistant. How can I help you with your health concerns today? 🏥',
      hi: 'नमस्ते! मैं आपका AI स्वास्थ्य सहायक हूं। आज मैं आपकी स्वास्थ्य संबंधी चिंताओं में कैसे मदद कर सकता हूं? 🏥',
      hinglish: 'Namaste! Main aapka AI health assistant hun. Aaj aapki health problems mein kaise help kar sakta hun? 🏥'
    };

    return greetings[language] || greetings.en;
  }
}

module.exports = new LanguageService();