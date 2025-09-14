const axios = require('axios');
const logger = require('../utils/logger');

class HuggingFaceService {
  constructor() {
    this.apiToken = process.env.HUGGINGFACE_API_TOKEN;
    this.baseUrl = 'https://api-inference.huggingface.co/models';
    this.healthModel = 'microsoft/DialoGPT-medium'; // Can be changed to health-specific models
    this.textGenerationModel = 'gpt2'; // Fallback model
  }

  // Process health query using Hugging Face
  async processHealthQuery({ query, language, context }) {
    try {
      if (!this.apiToken) {
        throw new Error('Hugging Face API not configured');
      }

      const enhancedQuery = this.buildHealthPrompt(query, language, context);
      
      logger.info('🤗 Sending query to Hugging Face...');

      // Try conversational model first
      try {
        const result = await this.generateConversationalResponse(enhancedQuery);
        if (result && result.trim().length > 0) {
          return {
            message: this.formatHealthResponse(result, language),
            confidence: 0.8,
            provider: 'huggingface'
          };
        }
      } catch (error) {
        logger.warn('Conversational model failed, trying text generation...');
      }

      // Fallback to text generation
      const result = await this.generateTextResponse(enhancedQuery);
      
      if (!result || result.trim().length === 0) {
        throw new Error('Empty response from Hugging Face');
      }

      logger.info('✅ Hugging Face response received');

      return {
        message: this.formatHealthResponse(result, language),
        confidence: 0.7,
        provider: 'huggingface'
      };

    } catch (error) {
      logger.error('Hugging Face API error:', error);
      throw error;
    }
  }

  // Generate conversational response
  async generateConversationalResponse(prompt) {
    try {
      const response = await axios.post(
        `${this.baseUrl}/${this.healthModel}`,
        {
          inputs: {
            text: prompt
          },
          parameters: {
            max_length: 500,
            temperature: 0.7,
            do_sample: true,
            pad_token_id: 50256
          }
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiToken}`,
            'Content-Type': 'application/json'
          },
          timeout: 30000
        }
      );

      if (response.data && response.data.generated_text) {
        return response.data.generated_text;
      }

      if (Array.isArray(response.data) && response.data[0]?.generated_text) {
        return response.data[0].generated_text;
      }

      throw new Error('Invalid response format');

    } catch (error) {
      logger.error('Hugging Face conversational error:', error);
      throw error;
    }
  }

  // Generate text response
  async generateTextResponse(prompt) {
    try {
      const response = await axios.post(
        `${this.baseUrl}/${this.textGenerationModel}`,
        {
          inputs: prompt,
          parameters: {
            max_length: 400,
            temperature: 0.6,
            do_sample: true,
            top_p: 0.9,
            repetition_penalty: 1.1
          }
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiToken}`,
            'Content-Type': 'application/json'
          },
          timeout: 30000
        }
      );

      if (Array.isArray(response.data) && response.data[0]?.generated_text) {
        // Remove the input prompt from the generated text
        const fullText = response.data[0].generated_text;
        const generatedText = fullText.replace(prompt, '').trim();
        return generatedText;
      }

      throw new Error('Invalid response format');

    } catch (error) {
      logger.error('Hugging Face text generation error:', error);
      throw error;
    }
  }

  // Build health-specific prompt
  buildHealthPrompt(query, language, context) {
    const healthPrompt = `You are a helpful AI health assistant for rural Indian communities. Provide accurate, simple, and culturally appropriate health information. Always recommend consulting healthcare professionals for serious conditions.

Question: ${query}

Health Assistant Response:`;

    return healthPrompt;
  }

  // Format and clean the response
  formatHealthResponse(rawResponse, language) {
    // Clean up the response
    let cleaned = rawResponse
      .replace(/Health Assistant Response:/g, '')
      .replace(/Question:.*Health Assistant Response:/g, '')
      .replace(/\n\n+/g, '\n\n')
      .trim();

    // Add disclaimer based on language
    const disclaimers = {
      en: '\n\n⚠️ Please consult a healthcare professional for proper medical advice.',
      hi: '\n\n⚠️ उचित चिकित्सा सलाह के लिए कृपया स्वास्थ्य पेशेवर से सलाह लें।',
      hinglish: '\n\n⚠️ Proper medical advice ke liye healthcare professional se consult kariye.'
    };

    return cleaned + (disclaimers[language] || disclaimers.en);
  }

  // Check if Hugging Face is available
  isAvailable() {
    return !!this.apiToken;
  }

  // Get health information using classification model
  async classifyHealthQuery(query) {
    try {
      if (!this.apiToken) {
        throw new Error('Hugging Face API not configured');
      }

      const response = await axios.post(
        `${this.baseUrl}/facebook/bart-large-mnli`,
        {
          inputs: query,
          parameters: {
            candidate_labels: [
              'diabetes', 'hypertension', 'heart disease', 'mental health',
              'infectious disease', 'emergency', 'general health', 'nutrition',
              'pregnancy', 'child health', 'elderly health'
            ]
          }
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiToken}`,
            'Content-Type': 'application/json'
          },
          timeout: 15000
        }
      );

      if (response.data && response.data.labels) {
        return {
          category: response.data.labels[0],
          confidence: response.data.scores[0],
          allCategories: response.data.labels.map((label, index) => ({
            category: label,
            confidence: response.data.scores[index]
          }))
        };
      }

      return null;

    } catch (error) {
      logger.error('Hugging Face classification error:', error);
      return null;
    }
  }

  // Translate text using Hugging Face translation models
  async translateText(text, targetLanguage) {
    try {
      if (!this.apiToken) {
        throw new Error('Hugging Face API not configured');
      }

      let modelName;
      if (targetLanguage === 'hi') {
        modelName = 'Helsinki-NLP/opus-mt-en-hi';
      } else if (targetLanguage === 'en') {
        modelName = 'Helsinki-NLP/opus-mt-hi-en';
      } else {
        return text; // Return original if no suitable model
      }

      const response = await axios.post(
        `${this.baseUrl}/${modelName}`,
        {
          inputs: text
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiToken}`,
            'Content-Type': 'application/json'
          },
          timeout: 20000
        }
      );

      if (Array.isArray(response.data) && response.data[0]?.translation_text) {
        return response.data[0].translation_text;
      }

      return text;

    } catch (error) {
      logger.error('Hugging Face translation error:', error);
      return text;
    }
  }
}

module.exports = new HuggingFaceService();