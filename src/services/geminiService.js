const { GoogleGenerativeAI } = require('@google/generative-ai');
const logger = require('../utils/logger');

class GeminiService {
  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY;
    this.genAI = this.apiKey ? new GoogleGenerativeAI(this.apiKey) : null;
    this.model = null;
    
    if (this.genAI) {
      this.model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    }
  }

  // Process health query using Gemini
  async processHealthQuery({ query, language, context }) {
    try {
      if (!this.model) {
        throw new Error('Gemini API not configured');
      }

      // Handle greetings and basic queries with quick responses
      if (this.isGreeting(query)) {
        return {
          message: this.getGreetingResponse(language),
          confidence: 1.0,
          provider: 'gemini'
        };
      }

      const prompt = this.buildHealthPrompt(query, language, context);
      
      logger.info('🧠 Sending query to Gemini...');
      
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      logger.info(`🧠 Gemini raw response (${text ? text.length : 0} chars):`, text ? text.substring(0, 200) + '...' : 'No text');

      if (!text || text.trim().length === 0) {
        logger.error('❌ Gemini returned empty response');
        throw new Error('Empty response from Gemini');
      }

      logger.info('✅ Gemini response received and validated');

      // Process and limit response length
      const processedResponse = this.processHealthResponse(text.trim());
      
      logger.info(`📝 Processed response (${processedResponse.length} chars):`, processedResponse.substring(0, 100) + '...');

      return {
        message: processedResponse,
        confidence: 0.9,
        provider: 'gemini'
      };

    } catch (error) {
      logger.error('❌ Gemini API error details:', {
        message: error.message,
        stack: error.stack,
        hasModel: !!this.model,
        hasApiKey: !!this.apiKey
      });
      throw error;
    }
  }

  // Build health-specific prompt for Gemini
  buildHealthPrompt(query, language, context) {
    const systemPrompt = `You are a simple health assistant. Give SHORT answers ONLY.

Rules:
- Answer in 2-3 sentences maximum
- NO bullet points, lists, or formatting
- NO emojis or symbols  
- Answer ONLY what is asked
- Give basic treatment advice
- End with "See doctor if symptoms persist"

Examples:
"I have fever" → "Take rest and drink plenty of water. Use paracetamol 500mg every 6 hours for fever. See doctor if symptoms persist."

"headache" → "Rest in a quiet, dark room. Take paracetamol or apply cold compress on forehead. See doctor if symptoms persist."

Language: Respond in ${language === 'hi' ? 'Hindi' : language === 'hinglish' ? 'Hinglish' : 'English'}`;

    let contextSection = '';
    if (context && context.length > 0) {
      const recentContext = context.slice(-2).map(item => 
        `Previous Q: ${item.query}\nPrevious A: ${item.response}`
      ).join('\n\n');
      contextSection = `\n\nPREVIOUS CONVERSATION CONTEXT:\n${recentContext}`;
    }

    return `${systemPrompt}${contextSection}\n\nCURRENT USER QUERY: ${query}\n\nPlease provide a helpful, accurate, and culturally appropriate health response:`;
  }

  // Process and limit response length
  processHealthResponse(response) {
    // Remove excessive explanations and keep only essential info
    let processed = response;

    // If response is too long (>800 chars), truncate intelligently
    if (processed.length > 800) {
      // Split into sentences and keep first few important ones
      const sentences = processed.split(/[.!?]+/).filter(s => s.trim().length > 0);
      const essential = sentences.slice(0, 3).join('. ') + '.';
      
      // Always preserve disclaimer if present
      if (processed.toLowerCase().includes('consult doctor') || processed.toLowerCase().includes('see doctor')) {
        processed = essential + ' Consult doctor if symptoms worsen.';
      } else {
        processed = essential;
      }
    }

    // Clean up any remaining verbose patterns
    processed = processed
      .replace(/In summary,?\s*/gi, '')
      .replace(/To conclude,?\s*/gi, '')
      .replace(/It's important to (note|understand|remember) that\s*/gi, '')
      .replace(/Please remember that\s*/gi, '')
      .replace(/\s+/g, ' ')
      .trim();

    return processed;
  }

  // Check if query is a greeting
  isGreeting(query) {
    const greetings = [
      'hi', 'hello', 'hey', 'hii', 'helo', 'hallo', 'hlw', 'hlo', 'hai',
      'namaste', 'namaskar', 'pranam',
      'salaam', 'adaab', 'sat sri akal',
      'good morning', 'good afternoon', 'good evening', 'gm', 'gn'
    ];
    
    const normalizedQuery = query.toLowerCase().trim();
    
    // For very short queries, be more lenient
    if (normalizedQuery.length <= 5) {
      return greetings.some(greeting => 
        normalizedQuery === greeting || 
        greeting.includes(normalizedQuery) ||
        normalizedQuery.includes(greeting)
      );
    }
    
    return greetings.some(greeting => 
      normalizedQuery === greeting || 
      normalizedQuery.startsWith(greeting + ' ') ||
      normalizedQuery.endsWith(' ' + greeting)
    );
  }

  // Get appropriate greeting response
  getGreetingResponse(language) {
    const responses = {
      en: "🩺 Health Assistant: Hello! I provide quick health advice in English, Hindi & Hinglish. What's your health question?",
      hi: "🩺 स्वास्थ्य सहायक: नमस्ते! मैं स्वास्थ्य सलाह देता हूं। आपका स्वास्थ्य प्रश्न क्या है?",
      hinglish: "🩺 Health Assistant: Namaste! Main health advice deta hun. Aapka health question kya hai?"
    };

    return responses[language] || responses.en;
  }

  // Check if Gemini is available
  isAvailable() {
    return !!this.model;
  }

  // Get health information for specific conditions
  async getConditionInfo(condition, language = 'en') {
    try {
      if (!this.model) {
        throw new Error('Gemini API not configured');
      }

      const prompt = `Provide comprehensive information about ${condition} including:
1. What it is (definition)
2. Common symptoms
3. Causes and risk factors
4. Prevention methods
5. Treatment options
6. When to see a doctor
7. Lifestyle recommendations

Respond in ${language === 'hi' ? 'Hindi' : language === 'hinglish' ? 'Hinglish' : 'English'}.
Make it suitable for rural Indian communities with limited medical knowledge.
Include cultural context and accessibility considerations for rural areas.`;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      
      return response.text();

    } catch (error) {
      logger.error('Gemini condition info error:', error);
      throw error;
    }
  }

  // Generate emergency response
  async generateEmergencyResponse(symptoms, language = 'en') {
    try {
      if (!this.model) {
        throw new Error('Gemini API not configured');
      }

      const prompt = `The user reports these symptoms: ${symptoms}

This appears to be a medical emergency. Provide:
1. Immediate emergency guidance
2. When to call emergency services (112 in India)
3. First aid steps if applicable
4. What to do while waiting for help
5. What information to give emergency responders

Respond in ${language === 'hi' ? 'Hindi' : language === 'hinglish' ? 'Hinglish' : 'English'}.
Be clear, direct, and include emergency contact numbers for India.
Emphasize urgency without causing panic.`;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      
      return response.text();

    } catch (error) {
      logger.error('Gemini emergency response error:', error);
      throw error;
    }
  }
}

module.exports = new GeminiService();