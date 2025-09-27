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

          // More detailed logging for debugging
          logger.info(`📊 ${provider.name} result:`, {
            hasResult: !!result,
            hasMessage: !!(result && result.message),
            messageLength: result && result.message ? result.message.length : 0,
            messagePreview: result && result.message ? result.message.substring(0, 100) + '...' : 'No message'
          });

          if (result && result.message && result.message.trim().length > 0) {
            logger.info(`✅ ${provider.name} provider successful with valid response`);
            
            // Translate response if needed
            const translatedResponse = await this.translateResponse(result.message, language);
            
            return {
              message: translatedResponse,
              provider: provider.name,
              language: language,
              confidence: result.confidence || 0.8,
              timestamp: new Date().toISOString()
            };
          } else {
            logger.warn(`⚠️ ${provider.name} returned empty or invalid response`);
          }

        } catch (error) {
          logger.warn(`❌ ${provider.name} provider failed:`, error.message);
          logger.error(`🔍 Full error details for ${provider.name}:`, error);
          continue;
        }
      }

      // If all AI providers fail, use knowledge base only as true fallback
      logger.warn('🗃️ All AI providers failed or returned empty responses, using knowledge base as fallback...');
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
      // Check if knowledge base fallback is disabled (for testing)
      if (process.env.DISABLE_KNOWLEDGE_BASE_FALLBACK === 'true') {
        logger.info('🚫 Knowledge base fallback is disabled');
        return this.getDefaultErrorResponse(language);
      }

      logger.info('🗃️ Attempting knowledge base fallback for query:', query);
      const knowledgeResponse = await knowledgeBaseService.searchHealthInfo(query, language);
      
      if (knowledgeResponse) {
        // Limit knowledge base response length to prevent long formatted responses
        const limitedResponse = this.limitResponseLength(knowledgeResponse, 200);
        
        return {
          message: limitedResponse,
          provider: 'knowledge_base',
          language: language,
          confidence: 0.5, // Lower confidence for fallback
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

  // Limit response length to prevent overly long responses
  limitResponseLength(response, maxLength = 200) {
    if (!response || response.length <= maxLength) {
      return response;
    }

    // Remove formatting characters and emojis
    let cleanResponse = response
      .replace(/[📍💊🌡️🏥💧🍯🧄🫖]/g, '') // Remove emojis
      .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold formatting
      .replace(/\*/g, '') // Remove asterisks
      .replace(/\n•/g, ',') // Convert bullet points to commas
      .replace(/\n/g, ' ') // Replace newlines with spaces
      .trim();

    // Truncate to max length and add "See doctor if symptoms persist"
    if (cleanResponse.length > maxLength) {
      cleanResponse = cleanResponse.substring(0, maxLength - 50).trim();
      // Find last complete sentence
      const lastPeriod = cleanResponse.lastIndexOf('.');
      if (lastPeriod > 50) {
        cleanResponse = cleanResponse.substring(0, lastPeriod + 1);
      }
      cleanResponse += ' See doctor if symptoms persist.';
    }

    return cleanResponse;
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