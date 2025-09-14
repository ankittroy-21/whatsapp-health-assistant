const logger = require('../utils/logger');
const supabaseService = require('../services/supabaseService');
const knowledgeBaseService = require('../services/knowledgeBaseService');
const aiService = require('../services/aiService');

class HealthController {
  
  // Get health information for a specific condition
  async getHealthInfo(req, res) {
    try {
      const { condition } = req.params;
      const { language = 'en' } = req.query;
      
      logger.info(`🏥 Health info requested for: ${condition} in ${language}`);
      
      const healthInfo = await knowledgeBaseService.getHealthInfo(condition, language);
      
      if (!healthInfo) {
        return res.status(404).json({
          error: 'Health condition not found',
          message: 'The requested health condition is not available in our database'
        });
      }
      
      res.json({
        success: true,
        condition,
        language,
        data: healthInfo,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      logger.error('Error getting health info:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Unable to retrieve health information'
      });
    }
  }

  // Get user conversation history
  async getUserHistory(req, res) {
    try {
      const { userId } = req.params;
      const { limit = 50 } = req.query;
      
      logger.info(`📚 History requested for user: ${userId}`);
      
      const history = await supabaseService.getUserHistory(userId, parseInt(limit));
      
      res.json({
        success: true,
        userId,
        conversationCount: history.length,
        conversations: history,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      logger.error('Error getting user history:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Unable to retrieve user history'
      });
    }
  }

  // Process health query manually (for testing)
  async processHealthQuery(req, res) {
    try {
      const { query, language = 'auto', userId = 'test_user' } = req.body;
      
      if (!query) {
        return res.status(400).json({
          error: 'Query is required',
          message: 'Please provide a health query'
        });
      }
      
      logger.info(`🔬 Manual health query: ${query}`);
      
      // Get user context
      const userContext = await supabaseService.getUserContext(userId);
      
      // Process with AI
      const aiResponse = await aiService.processHealthQuery({
        query,
        language,
        context: userContext,
        phoneNumber: userId
      });
      
      res.json({
        success: true,
        query,
        response: aiResponse.message,
        language: aiResponse.language,
        provider: aiResponse.provider,
        confidence: aiResponse.confidence,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      logger.error('Error processing health query:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Unable to process health query'
      });
    }
  }
}

module.exports = new HealthController();