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

      const prompt = this.buildHealthPrompt(query, language, context);
      
      logger.info('🧠 Sending query to Gemini...');
      
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      if (!text || text.trim().length === 0) {
        throw new Error('Empty response from Gemini');
      }

      logger.info('✅ Gemini response received');

      return {
        message: text.trim(),
        confidence: 0.9,
        provider: 'gemini'
      };

    } catch (error) {
      logger.error('Gemini API error:', error);
      throw error;
    }
  }

  // Build health-specific prompt for Gemini
  buildHealthPrompt(query, language, context) {
    const systemPrompt = `You are a knowledgeable AI health assistant specifically designed for rural Indian communities. Your responses should be:

1. ACCURATE and based on medical knowledge
2. CULTURALLY SENSITIVE for Indian healthcare context
3. SIMPLE and easy to understand for non-medical people
4. INCLUDE appropriate disclaimers about consulting healthcare professionals
5. MULTILINGUAL - respond in the same language as the query (English, Hindi, or Hinglish)

IMPORTANT GUIDELINES:
- Always recommend consulting a qualified doctor for serious conditions
- Provide practical, actionable advice suitable for rural areas
- Include emergency guidance when symptoms suggest urgent care
- Be empathetic and supportive
- Use simple medical terminology with explanations
- Consider limited healthcare access in rural areas

LANGUAGE INSTRUCTIONS:
- If query is in English, respond in English
- If query is in Hindi (Devanagari script), respond in Hindi
- If query is in Hinglish (Hindi words in English script), respond in Hinglish
- Maintain the same level of formality as the question

MEDICAL DISCLAIMER: Always include that this is AI-generated information for educational purposes and professional medical consultation is recommended.`;

    let contextSection = '';
    if (context && context.length > 0) {
      const recentContext = context.slice(-2).map(item => 
        `Previous Q: ${item.query}\nPrevious A: ${item.response}`
      ).join('\n\n');
      contextSection = `\n\nPREVIOUS CONVERSATION CONTEXT:\n${recentContext}`;
    }

    return `${systemPrompt}${contextSection}\n\nCURRENT USER QUERY: ${query}\n\nPlease provide a helpful, accurate, and culturally appropriate health response:`;
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