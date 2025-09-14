const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

class LoggingService {
  constructor() {
    this.logsDir = path.join(process.cwd(), 'logs');
    this.conversationLogsPath = path.join(this.logsDir, 'conversations.json');
    this.backupResponsesPath = path.join(this.logsDir, 'backup_responses.json');
    this.analyticsPath = path.join(this.logsDir, 'analytics.json');
    
    this.ensureDirectoriesExist();
    this.initializeLogFiles();
  }

  // Ensure log directories exist
  ensureDirectoriesExist() {
    if (!fs.existsSync(this.logsDir)) {
      fs.mkdirSync(this.logsDir, { recursive: true });
      logger.info('📁 Created logs directory');
    }
  }

  // Initialize log files if they don't exist
  initializeLogFiles() {
    const defaultFiles = {
      [this.conversationLogsPath]: [],
      [this.backupResponsesPath]: {},
      [this.analyticsPath]: { 
        totalQueries: 0, 
        byLanguage: {}, 
        byProvider: {}, 
        dailyStats: {} 
      }
    };

    Object.entries(defaultFiles).forEach(([filePath, defaultContent]) => {
      if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, JSON.stringify(defaultContent, null, 2));
        logger.info(`📄 Created log file: ${path.basename(filePath)}`);
      }
    });
  }

  // Log conversation (query and response)
  async logConversation(phoneNumber, query, response, metadata = {}) {
    try {
      const conversationEntry = {
        timestamp: new Date().toISOString(),
        phoneNumber: this.hashPhoneNumber(phoneNumber), // Hash for privacy
        query: query,
        response: response,
        language: metadata.language || 'en',
        provider: metadata.provider || 'unknown',
        confidence: metadata.confidence || 0,
        processingTime: metadata.processingTime || 0,
        isVoiceMessage: metadata.isVoiceMessage || false,
        queryHash: this.generateQueryHash(query)
      };

      // Read existing conversations
      const conversations = this.readJsonFile(this.conversationLogsPath) || [];
      
      // Add new conversation
      conversations.push(conversationEntry);
      
      // Keep only last 10000 conversations to prevent file size issues
      if (conversations.length > 10000) {
        conversations.splice(0, conversations.length - 10000);
      }

      // Write back to file
      this.writeJsonFile(this.conversationLogsPath, conversations);

      // Update analytics
      this.updateAnalytics(conversationEntry);

      // Store for fallback if this is a successful response
      if (response && response.trim().length > 0) {
        this.storeBackupResponse(query, response, metadata.language);
      }

      logger.debug(`📝 Conversation logged for user ${this.hashPhoneNumber(phoneNumber)}`);

    } catch (error) {
      logger.error('Error logging conversation:', error);
    }
  }

  // Store successful responses for offline fallback
  storeBackupResponse(query, response, language = 'en') {
    try {
      const backupResponses = this.readJsonFile(this.backupResponsesPath) || {};
      const queryKey = this.generateQueryHash(query);
      
      if (!backupResponses[language]) {
        backupResponses[language] = {};
      }

      backupResponses[language][queryKey] = {
        query: query,
        response: response,
        timestamp: new Date().toISOString(),
        usageCount: (backupResponses[language][queryKey]?.usageCount || 0) + 1
      };

      this.writeJsonFile(this.backupResponsesPath, backupResponses);
      logger.debug(`💾 Backup response stored for query: ${query.substring(0, 50)}...`);

    } catch (error) {
      logger.error('Error storing backup response:', error);
    }
  }

  // Retrieve response from backup when APIs fail
  async getBackupResponse(query, language = 'en') {
    try {
      const backupResponses = this.readJsonFile(this.backupResponsesPath) || {};
      const queryKey = this.generateQueryHash(query);

      // Try exact match first
      if (backupResponses[language]?.[queryKey]) {
        const backup = backupResponses[language][queryKey];
        backup.usageCount = (backup.usageCount || 0) + 1;
        this.writeJsonFile(this.backupResponsesPath, backupResponses);
        
        logger.info(`🔄 Using backup response for: ${query.substring(0, 50)}...`);
        return this.formatBackupResponse(backup.response, language);
      }

      // Try fuzzy matching for similar queries
      const similarResponse = this.findSimilarResponse(query, language, backupResponses);
      if (similarResponse) {
        logger.info(`🔍 Using similar backup response for: ${query.substring(0, 50)}...`);
        return this.formatBackupResponse(similarResponse.response, language);
      }

      return null;

    } catch (error) {
      logger.error('Error retrieving backup response:', error);
      return null;
    }
  }

  // Find similar responses using basic text matching
  findSimilarResponse(query, language, backupResponses) {
    try {
      const responses = backupResponses[language] || {};
      const queryWords = query.toLowerCase().split(/\s+/);
      let bestMatch = null;
      let bestScore = 0;

      Object.values(responses).forEach(backup => {
        const backupWords = backup.query.toLowerCase().split(/\s+/);
        const commonWords = queryWords.filter(word => 
          backupWords.some(bWord => bWord.includes(word) || word.includes(bWord))
        );
        
        const similarity = commonWords.length / Math.max(queryWords.length, backupWords.length);
        
        if (similarity > bestScore && similarity > 0.3) { // 30% similarity threshold
          bestScore = similarity;
          bestMatch = backup;
        }
      });

      return bestMatch;

    } catch (error) {
      logger.error('Error finding similar response:', error);
      return null;
    }
  }

  // Format backup response with disclaimer
  formatBackupResponse(response, language) {
    const disclaimers = {
      en: '\n\n🔄 Note: This is a previously cached response. For the most current information, please try again later when our services are fully available.',
      hi: '\n\n🔄 नोट: यह पहले से संग्रहीत उत्तर है। नवीनतम जानकारी के लिए, कृपया बाद में पुनः प्रयास करें जब हमारी सेवाएं पूरी तरह उपलब्ध हों।',
      hinglish: '\n\n🔄 Note: Ye previously cached response hai. Latest information ke liye, please baad mein try kariye jab hamare services fully available hon.'
    };

    return response + (disclaimers[language] || disclaimers.en);
  }

  // Update analytics data
  updateAnalytics(conversationEntry) {
    try {
      const analytics = this.readJsonFile(this.analyticsPath) || { 
        totalQueries: 0, 
        byLanguage: {}, 
        byProvider: {}, 
        dailyStats: {} 
      };

      // Update total queries
      analytics.totalQueries++;

      // Update by language
      const lang = conversationEntry.language;
      analytics.byLanguage[lang] = (analytics.byLanguage[lang] || 0) + 1;

      // Update by provider
      const provider = conversationEntry.provider;
      analytics.byProvider[provider] = (analytics.byProvider[provider] || 0) + 1;

      // Update daily stats
      const today = new Date().toISOString().split('T')[0];
      if (!analytics.dailyStats[today]) {
        analytics.dailyStats[today] = { queries: 0, languages: {}, providers: {} };
      }
      analytics.dailyStats[today].queries++;
      analytics.dailyStats[today].languages[lang] = (analytics.dailyStats[today].languages[lang] || 0) + 1;
      analytics.dailyStats[today].providers[provider] = (analytics.dailyStats[today].providers[provider] || 0) + 1;

      this.writeJsonFile(this.analyticsPath, analytics);

    } catch (error) {
      logger.error('Error updating analytics:', error);
    }
  }

  // Get analytics data
  getAnalytics() {
    try {
      return this.readJsonFile(this.analyticsPath) || {};
    } catch (error) {
      logger.error('Error getting analytics:', error);
      return {};
    }
  }

  // Get conversation history for a user
  getUserConversationHistory(phoneNumber, limit = 50) {
    try {
      const conversations = this.readJsonFile(this.conversationLogsPath) || [];
      const hashedNumber = this.hashPhoneNumber(phoneNumber);
      
      return conversations
        .filter(conv => conv.phoneNumber === hashedNumber)
        .slice(-limit)
        .reverse();

    } catch (error) {
      logger.error('Error getting user conversation history:', error);
      return [];
    }
  }

  // Search conversations by query content
  searchConversations(searchTerm, limit = 20) {
    try {
      const conversations = this.readJsonFile(this.conversationLogsPath) || [];
      const searchLower = searchTerm.toLowerCase();
      
      return conversations
        .filter(conv => 
          conv.query.toLowerCase().includes(searchLower) ||
          conv.response.toLowerCase().includes(searchLower)
        )
        .slice(-limit)
        .reverse();

    } catch (error) {
      logger.error('Error searching conversations:', error);
      return [];
    }
  }

  // Generate simple hash for queries (for matching similar queries)
  generateQueryHash(query) {
    // Simple hash function - normalize and remove common words
    const normalized = query.toLowerCase()
      .replace(/[^\w\s]/g, '') // Remove punctuation
      .replace(/\b(what|is|how|can|the|a|an|i|you|my|me|please|help)\b/g, '') // Remove common words
      .trim()
      .replace(/\s+/g, '_');
    
    return normalized || 'generic_query';
  }

  // Hash phone number for privacy (simple hashing)
  hashPhoneNumber(phoneNumber) {
    // Simple hash for privacy - in production use proper hashing
    let hash = 0;
    for (let i = 0; i < phoneNumber.length; i++) {
      const char = phoneNumber.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return `user_${Math.abs(hash)}`;
  }

  // Helper: Read JSON file safely
  readJsonFile(filePath) {
    try {
      const data = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      logger.warn(`Could not read JSON file ${filePath}:`, error.message);
      return null;
    }
  }

  // Helper: Write JSON file safely
  writeJsonFile(filePath, data) {
    try {
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    } catch (error) {
      logger.error(`Could not write JSON file ${filePath}:`, error);
    }
  }

  // Cleanup old logs (keep last 30 days)
  cleanupOldLogs() {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      // Clean conversation logs
      const conversations = this.readJsonFile(this.conversationLogsPath) || [];
      const recentConversations = conversations.filter(conv => 
        new Date(conv.timestamp) > thirtyDaysAgo
      );
      
      if (recentConversations.length < conversations.length) {
        this.writeJsonFile(this.conversationLogsPath, recentConversations);
        logger.info(`🧹 Cleaned up ${conversations.length - recentConversations.length} old conversation logs`);
      }

      // Clean daily analytics (keep last 90 days)
      const analytics = this.readJsonFile(this.analyticsPath) || {};
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
      
      if (analytics.dailyStats) {
        Object.keys(analytics.dailyStats).forEach(date => {
          if (new Date(date) < ninetyDaysAgo) {
            delete analytics.dailyStats[date];
          }
        });
        this.writeJsonFile(this.analyticsPath, analytics);
      }

    } catch (error) {
      logger.error('Error cleaning up old logs:', error);
    }
  }

  // Export data for backup or analysis
  exportData(includePersonalData = false) {
    try {
      const conversations = this.readJsonFile(this.conversationLogsPath) || [];
      const analytics = this.readJsonFile(this.analyticsPath) || {};
      const backups = this.readJsonFile(this.backupResponsesPath) || {};

      const exportData = {
        exportTimestamp: new Date().toISOString(),
        analytics: analytics,
        backupResponses: backups,
        conversationCount: conversations.length
      };

      // Only include conversation data if explicitly requested (privacy)
      if (includePersonalData) {
        exportData.conversations = conversations;
      }

      return exportData;

    } catch (error) {
      logger.error('Error exporting data:', error);
      return null;
    }
  }
}

module.exports = new LoggingService();