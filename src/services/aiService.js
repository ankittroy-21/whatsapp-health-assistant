const geminiService = require('./geminiService');
const huggingfaceService = require('./huggingfaceService');
const openaiService = require('./openaiService');
const knowledgeBaseService = require('./knowledgeBaseService');
const languageService = require('./languageService');
const logger = require('../utils/logger');

class AIService {
  constructor() {
    this.providers = [
      { name: 'gemini', service: geminiService, priority: 1 },
      { name: 'huggingface', service: huggingfaceService, priority: 2 },
      { name: 'openai', service: openaiService, priority: 3 }
    ];
  }

  // Main method to process health queries
  async processHealthQuery({ query, language, context, phoneNumber }) {
    try {
      logger.info(`🤖 Processing health query: "${query}" in language: ${language}`);

      // Enhance query with context if available
      const enhancedQuery = this.buildContextualQuery(query, context);

      // Try AI providers in order of priority
      for (const provider of this.providers) {
        try {
          logger.info(`🔄 Trying ${provider.name} provider...`);
          
          const result = await provider.service.processHealthQuery({
            query: enhancedQuery,
            language,
            context
          });

          if (result && result.message) {
            logger.info(`✅ ${provider.name} provider successful`);
            
            // Translate response if needed
            const translatedResponse = await this.translateResponse(result.message, language);
            
            return {
              message: translatedResponse,
              provider: provider.name,
              language: language,
              confidence: result.confidence || 0.8,
              timestamp: new Date().toISOString()
            };
          }

        } catch (error) {
          logger.warn(`❌ ${provider.name} provider failed:`, error.message);
          continue;
        }
      }

      // If all AI providers fail, use knowledge base
      logger.info('🗃️ All AI providers failed, using knowledge base...');
      return await this.useKnowledgeBaseFallback(query, language, context);

    } catch (error) {
      logger.error('Error in AI service:', error);
      return this.getDefaultErrorResponse(language);
    }
  }

  // Build contextual query using conversation history
  buildContextualQuery(currentQuery, context) {
    if (!context || !context.length) {
      return currentQuery;
    }

    // Get last few messages for context
    const recentContext = context.slice(-3).map(item => 
      `User: ${item.query}\nBot: ${item.response}`
    ).join('\n\n');

    return `Previous conversation context:\n${recentContext}\n\nCurrent question: ${currentQuery}`;
  }

  // Translate response based on detected language
  async translateResponse(response, targetLanguage) {
    try {
      if (targetLanguage === 'en') {
        return response;
      }

      // For Hindi and Hinglish, translate the response
      if (targetLanguage === 'hi' || targetLanguage === 'hinglish') {
        const translated = await languageService.translateText(response, targetLanguage);
        return translated || response;
      }

      return response;
    } catch (error) {
      logger.error('Translation error:', error);
      return response;
    }
  }

  // Use knowledge base as fallback
  async useKnowledgeBaseFallback(query, language, context) {
    try {
      const knowledgeResponse = await knowledgeBaseService.searchHealthInfo(query, language);
      
      if (knowledgeResponse) {
        return {
          message: knowledgeResponse,
          provider: 'knowledge_base',
          language: language,
          confidence: 0.7,
          timestamp: new Date().toISOString()
        };
      }

      // If knowledge base also fails, return default response
      return this.getDefaultErrorResponse(language);

    } catch (error) {
      logger.error('Knowledge base fallback failed:', error);
      return this.getDefaultErrorResponse(language);
    }
  }

  // Get default error response
  getDefaultErrorResponse(language) {
    const defaultResponses = {
      en: 'I apologize, but I\'m having trouble processing your health query right now. Please try again later or consult with a healthcare professional for immediate assistance. 🏥',
      hi: 'माफ करें, मुझे अभी आपके स्वास्थ्य प्रश्न को समझने में परेशानी हो रही है। कृपया बाद में फिर से कोशिश करें या तत्काल सहायता के लिए किसी स्वास्थ्य पेशेवर से सलाह लें। 🏥',
      hinglish: 'Sorry, mujhe abhi aapke health question ko process karne mein problem ho rahi hai. Please baad mein try kariye ya immediate help ke liye doctor se consult kariye. 🏥'
    };

    return {
      message: defaultResponses[language] || defaultResponses.en,
      provider: 'default',
      language: language,
      confidence: 0.5,
      timestamp: new Date().toISOString()
    };
  }

  // Check if query indicates emergency
  isEmergencyQuery(query) {
    const emergencyKeywords = [
      // English
      'emergency', 'urgent', 'heart attack', 'stroke', 'bleeding', 'accident', 'unconscious', 
      'can\'t breathe', 'chest pain', 'severe pain', 'suicide', 'overdose',
      
      // Hindi
      'आपातकाल', 'तुरंत', 'दिल का दौरा', 'खून', 'दुर्घटना', 'बेहोश', 'सांस नहीं', 'छाती में दर्द',
      
      // Hinglish
      'emergency hai', 'urgent hai', 'heart attack', 'bleeding ho raha', 'saans nahi aa rahi',
      'chest pain hai', 'behosh hai'
    ];

    const lowerQuery = query.toLowerCase();
    return emergencyKeywords.some(keyword => lowerQuery.includes(keyword.toLowerCase()));
  }

  // Get emergency response
  getEmergencyResponse(language) {
    const emergencyResponses = {
      en: '🚨 MEDICAL EMERGENCY DETECTED 🚨\n\nThis seems like a medical emergency. Please:\n\n1. Call emergency services immediately (112 in India)\n2. Seek immediate medical attention\n3. Contact your nearest hospital\n4. If possible, have someone accompany you\n\n⚠️ Do not delay seeking professional medical help!',
      hi: '🚨 चिकित्सा आपातकाल का पता चला 🚨\n\nयह चिकित्सा आपातकाल लगता है। कृपया:\n\n1. तुरंत आपातकालीन सेवाओं को कॉल करें (भारत में 112)\n2. तत्काल चिकित्सा सहायता लें\n3. अपने निकटतम अस्पताल से संपर्क करें\n4. यदि संभव हो तो किसी को साथ ले जाएं\n\n⚠️ पेशेवर चिकित्सा सहायता लेने में देरी न करें!',
      hinglish: '🚨 MEDICAL EMERGENCY DETECT HUA HAI 🚨\n\nYe medical emergency lagta hai. Please:\n\n1. Emergency services ko immediately call kariye (India mein 112)\n2. Turant medical help liye\n3. Apne nearest hospital se contact kariye\n4. Agar possible ho to kisi ko saath le jaiye\n\n⚠️ Professional medical help lene mein delay mat kariye!'
    };

    return emergencyResponses[language] || emergencyResponses.en;
  }

  // Analyze query sentiment and urgency
  analyzeQuery(query) {
    const urgencyWords = ['urgent', 'emergency', 'immediate', 'severe', 'critical', 'serious'];
    const painWords = ['pain', 'hurt', 'ache', 'burning', 'sharp', 'throbbing'];
    const mentalHealthWords = ['depressed', 'anxiety', 'stress', 'worried', 'scared', 'panic'];

    const lowerQuery = query.toLowerCase();
    
    return {
      urgency: urgencyWords.some(word => lowerQuery.includes(word)) ? 'high' : 'normal',
      hasPain: painWords.some(word => lowerQuery.includes(word)),
      mentalHealth: mentalHealthWords.some(word => lowerQuery.includes(word)),
      isQuestion: lowerQuery.includes('?') || lowerQuery.startsWith('what') || lowerQuery.startsWith('how') || lowerQuery.startsWith('why')
    };
  }
}

module.exports = new AIService();