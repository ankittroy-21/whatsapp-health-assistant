const OpenAI = require('openai');
const logger = require('../utils/logger');

class OpenAIService {
  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY;
    this.client = this.apiKey ? new OpenAI({ apiKey: this.apiKey }) : null;
    this.model = 'gpt-3.5-turbo'; // or 'gpt-4' if available
  }

  // Process health query using OpenAI
  async processHealthQuery({ query, language, context }) {
    try {
      if (!this.client) {
        throw new Error('OpenAI API not configured');
      }

      const messages = this.buildHealthMessages(query, language, context);
      
      logger.info('🤖 Sending query to OpenAI...');

      const completion = await this.client.chat.completions.create({
        model: this.model,
        messages: messages,
        max_tokens: 500,
        temperature: 0.7,
        top_p: 0.9,
        frequency_penalty: 0.1,
        presence_penalty: 0.1
      });

      const response = completion.choices[0]?.message?.content;

      if (!response || response.trim().length === 0) {
        throw new Error('Empty response from OpenAI');
      }

      logger.info('✅ OpenAI response received');

      return {
        message: response.trim(),
        confidence: 0.9,
        provider: 'openai',
        usage: completion.usage
      };

    } catch (error) {
      logger.error('OpenAI API error:', error);
      throw error;
    }
  }

  // Build conversation messages for OpenAI
  buildHealthMessages(query, language, context) {
    const systemMessage = {
      role: 'system',
      content: `You are an expert AI health assistant specifically designed for rural Indian communities. Your responses must be:

1. MEDICALLY ACCURATE and evidence-based
2. CULTURALLY SENSITIVE for Indian healthcare context
3. SIMPLE and accessible for people with limited medical knowledge
4. PRACTICAL for rural areas with limited healthcare access
5. MULTILINGUAL - respond in the same language as the user's query

LANGUAGE GUIDELINES:
- English queries → respond in English
- Hindi queries (Devanagari script) → respond in Hindi
- Hinglish queries (Hindi words in Roman script) → respond in Hinglish
- Maintain the same tone and formality level

CONTENT GUIDELINES:
- Always include medical disclaimers
- Recommend consulting healthcare professionals for serious conditions
- Provide practical advice suitable for rural settings
- Include emergency guidance when symptoms suggest urgent care
- Be empathetic and supportive
- Use simple terminology with explanations
- Consider limited healthcare infrastructure

EMERGENCY PROTOCOL:
- For emergency symptoms, prioritize immediate action advice
- Include emergency contact numbers (112 for India)
- Provide clear, step-by-step emergency guidance

Remember: This is for educational purposes only. Professional medical consultation is always recommended for health concerns.`
    };

    const messages = [systemMessage];

    // Add context from previous conversation if available
    if (context && context.length > 0) {
      const recentContext = context.slice(-3);
      recentContext.forEach(item => {
        messages.push(
          { role: 'user', content: item.query },
          { role: 'assistant', content: item.response }
        );
      });
    }

    // Add current query
    messages.push({ role: 'user', content: query });

    return messages;
  }

  // Check if OpenAI is available
  isAvailable() {
    return !!this.client;
  }

  // Get specialized health information
  async getSpecializedHealthInfo(condition, language = 'en', specialty = 'general') {
    try {
      if (!this.client) {
        throw new Error('OpenAI API not configured');
      }

      const prompt = `As a specialized ${specialty} healthcare AI assistant, provide comprehensive information about ${condition} for rural Indian communities.

Include:
1. Definition and overview
2. Common symptoms and warning signs
3. Causes and risk factors
4. Prevention strategies
5. Treatment options (including home remedies where appropriate)
6. When to seek immediate medical attention
7. Lifestyle modifications
8. Cultural considerations for Indian communities
9. Accessibility tips for rural areas

Language: ${language === 'hi' ? 'Hindi' : language === 'hinglish' ? 'Hinglish (Hindi words in English script)' : 'English'}

Ensure the information is accurate, culturally sensitive, and includes appropriate medical disclaimers.`;

      const completion = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          { role: 'system', content: 'You are an expert medical AI assistant with deep knowledge of healthcare in Indian rural contexts.' },
          { role: 'user', content: prompt }
        ],
        max_tokens: 800,
        temperature: 0.6
      });

      return completion.choices[0]?.message?.content;

    } catch (error) {
      logger.error('OpenAI specialized info error:', error);
      throw error;
    }
  }

  // Generate emergency response
  async generateEmergencyResponse(symptoms, language = 'en') {
    try {
      if (!this.client) {
        throw new Error('OpenAI API not configured');
      }

      const prompt = `MEDICAL EMERGENCY SITUATION:
Symptoms reported: ${symptoms}

Generate an immediate emergency response for rural Indian context including:
1. IMMEDIATE ACTIONS to take right now
2. Emergency contact numbers (112 for India)
3. What to tell emergency responders
4. First aid steps if applicable
5. What to do while waiting for help
6. How to prepare for hospital transport

Language: ${language === 'hi' ? 'Hindi' : language === 'hinglish' ? 'Hinglish' : 'English'}

Be URGENT but CALM. Prioritize life-saving actions. Consider rural healthcare access limitations.`;

      const completion = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          { role: 'system', content: 'You are an emergency medical AI assistant. Provide immediate, life-saving guidance for rural Indian communities.' },
          { role: 'user', content: prompt }
        ],
        max_tokens: 400,
        temperature: 0.3 // Lower temperature for emergency responses
      });

      return completion.choices[0]?.message?.content;

    } catch (error) {
      logger.error('OpenAI emergency response error:', error);
      throw error;
    }
  }

  // Analyze query for risk assessment
  async analyzeHealthRisk(query, userProfile = {}) {
    try {
      if (!this.client) {
        throw new Error('OpenAI API not configured');
      }

      const prompt = `Analyze this health query for risk level and urgency:

Query: "${query}"
User Profile: ${JSON.stringify(userProfile)}

Provide a risk assessment with:
1. Risk Level (LOW/MODERATE/HIGH/EMERGENCY)
2. Urgency (IMMEDIATE/URGENT/ROUTINE)
3. Recommended Action
4. Key warning signs to watch for
5. When to seek immediate medical attention

Return assessment in JSON format for programmatic use.`;

      const completion = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          { role: 'system', content: 'You are a medical triage AI assistant. Provide accurate risk assessments for health queries.' },
          { role: 'user', content: prompt }
        ],
        max_tokens: 300,
        temperature: 0.2
      });

      const response = completion.choices[0]?.message?.content;
      
      try {
        return JSON.parse(response);
      } catch (parseError) {
        // If JSON parsing fails, return structured response
        return {
          riskLevel: 'MODERATE',
          urgency: 'ROUTINE',
          recommendedAction: response,
          warningSignsType: 'general'
        };
      }

    } catch (error) {
      logger.error('OpenAI risk analysis error:', error);
      throw error;
    }
  }

  // Generate follow-up questions
  async generateFollowUpQuestions(query, response, language = 'en') {
    try {
      if (!this.client) {
        throw new Error('OpenAI API not configured');
      }

      const prompt = `Based on this health consultation:

User Query: "${query}"
AI Response: "${response}"

Generate 3-4 relevant follow-up questions that would help provide better health guidance. Questions should be:
- Medically relevant
- Easy to understand
- Culturally appropriate for Indian context
- In ${language === 'hi' ? 'Hindi' : language === 'hinglish' ? 'Hinglish' : 'English'}

Return as a simple list.`;

      const completion = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          { role: 'system', content: 'You are a medical consultation AI assistant. Generate helpful follow-up questions.' },
          { role: 'user', content: prompt }
        ],
        max_tokens: 200,
        temperature: 0.7
      });

      return completion.choices[0]?.message?.content;

    } catch (error) {
      logger.error('OpenAI follow-up questions error:', error);
      return null;
    }
  }
}

module.exports = new OpenAIService();