const { createClient } = require('@supabase/supabase-js');
const logger = require('../utils/logger');

class SupabaseService {
  constructor() {
    this.supabaseUrl = process.env.SUPABASE_URL;
    this.supabaseKey = process.env.SUPABASE_KEY;
    this.isInitialized = false;
    
    if (this.supabaseUrl && this.supabaseKey) {
      this.supabase = createClient(this.supabaseUrl, this.supabaseKey);
      logger.info('📊 Supabase client initialized');
      // Auto-initialize database schema
      this.initializeTables().then(success => {
        if (success) {
          this.isInitialized = true;
          logger.info('✅ Database schema automatically initialized');
        }
      });
    } else {
      logger.warn('Supabase credentials not found, running without database');
      this.supabase = null;
    }
  }

  // Initialize database tables with automatic schema creation
  async initializeTables() {
    if (!this.supabase) return false;

    try {
      logger.info('🔧 Initializing database schema...');

      // Create users table
      await this.createUsersTable();
      
      // Create conversations table  
      await this.createConversationsTable();
      
      // Create message_logs table
      await this.createMessageLogsTable();

      // Create analytics table
      await this.createAnalyticsTable();

      // Create health_queries table for specialized health tracking
      await this.createHealthQueriesTable();
      
      logger.info('✅ All database tables initialized successfully');
      return true;
    } catch (error) {
      logger.error('❌ Database initialization failed:', error);
      return false;
    }
  }

  // Create users table
  async createUsersTable() {
    try {
      // Check if table exists first
      const { data: existingTable } = await this.supabase
        .from('users')
        .select('phone_number')
        .limit(1);
      
      // If we can query it, table exists
      if (existingTable !== null) {
        logger.debug('📋 Users table already exists');
        return;
      }
    } catch (error) {
      // Table doesn't exist, create it
      logger.debug('📋 Creating users table...');
    }

    // Note: Table creation should be done via Supabase SQL editor or migration
    // This is a placeholder for automatic setup instruction
    logger.info('💡 Users table needs to be created in Supabase dashboard');
    logger.info('   Run the SQL from database/setup.sql in your Supabase SQL editor');
  }

  // Create conversations table
  async createConversationsTable() {
    try {
      const { data: existingTable } = await this.supabase
        .from('conversations')
        .select('id')
        .limit(1);
      
      if (existingTable !== null) {
        logger.debug('💬 Conversations table already exists');
        return;
      }
    } catch (error) {
      logger.debug('💬 Creating conversations table...');
    }

    logger.info('💡 Conversations table needs to be created in Supabase dashboard');
  }

  // Create message_logs table
  async createMessageLogsTable() {
    try {
      const { data: existingTable } = await this.supabase
        .from('message_logs')
        .select('id')
        .limit(1);
      
      if (existingTable !== null) {
        logger.debug('📝 Message logs table already exists');
        return;
      }
    } catch (error) {
      logger.debug('📝 Creating message logs table...');
    }

    logger.info('� Message logs table needs to be created in Supabase dashboard');
  }

  // Create analytics table
  async createAnalyticsTable() {
    try {
      const { data: existingTable } = await this.supabase
        .from('analytics')
        .select('id')
        .limit(1);
      
      if (existingTable !== null) {
        logger.debug('📊 Analytics table already exists');
        return;
      }
    } catch (error) {
      logger.debug('📊 Creating analytics table...');
    }

    logger.info('� Analytics table needs to be created in Supabase dashboard');
  }

  // Create health_queries table for specialized health tracking
  async createHealthQueriesTable() {
    try {
      const { data: existingTable } = await this.supabase
        .from('health_queries')
        .select('id')
        .limit(1);
      
      if (existingTable !== null) {
        logger.debug('🏥 Health queries table already exists');
        return;
      }
    } catch (error) {
      logger.debug('🏥 Creating health queries table...');
    }

    logger.info('💡 Health queries table needs to be created in Supabase dashboard');
  }

  // Store user query
  async storeUserQuery(phoneNumber, query, detectedLanguage, metadata = {}) {
    if (!this.supabase) return null;

    try {
      // First, ensure user exists
      await this.ensureUserExists(phoneNumber, detectedLanguage);

      // Store the conversation entry
      const { data, error } = await this.supabase
        .from('conversations')
        .insert({
          user_phone: phoneNumber,
          query: query,
          detected_language: detectedLanguage,
          query_timestamp: new Date().toISOString(),
          metadata: metadata
        })
        .select()
        .single();

      if (error) {
        logger.error('Error storing user query:', error);
        return null;
      }

      logger.debug(`📝 User query stored: ${phoneNumber} - ${query.substring(0, 50)}...`);
      return data;

    } catch (error) {
      logger.error('Supabase store query error:', error);
      return null;
    }
  }

  // Store AI response
  async storeAiResponse(phoneNumber, query, response, provider, confidence = 0.8) {
    if (!this.supabase) return null;

    try {
      // Find the most recent conversation for this user and query
      const { data: conversation, error: findError } = await this.supabase
        .from('conversations')
        .select('id')
        .eq('user_phone', phoneNumber)
        .eq('query', query)
        .order('query_timestamp', { ascending: false })
        .limit(1)
        .single();

      if (findError || !conversation) {
        logger.warn('Could not find conversation to update with response');
        return null;
      }

      // Update the conversation with AI response
      const { data, error } = await this.supabase
        .from('conversations')
        .update({
          ai_response: response,
          ai_provider: provider,
          confidence_score: confidence,
          response_timestamp: new Date().toISOString()
        })
        .eq('id', conversation.id)
        .select()
        .single();

      if (error) {
        logger.error('Error storing AI response:', error);
        return null;
      }

      logger.debug(`💬 AI response stored: ${provider} - ${response.substring(0, 50)}...`);
      return data;

    } catch (error) {
      logger.error('Supabase store response error:', error);
      return null;
    }
  }

  // Get user context (recent conversation history)
  async getUserContext(phoneNumber, limit = 5) {
    if (!this.supabase) return [];

    try {
      const { data, error } = await this.supabase
        .from('conversations')
        .select('query, ai_response, query_timestamp, response_timestamp')
        .eq('user_phone', phoneNumber)
        .not('ai_response', 'is', null)
        .order('query_timestamp', { ascending: false })
        .limit(limit);

      if (error) {
        logger.error('Error getting user context:', error);
        return [];
      }

      // Format context for AI processing
      const context = data.map(item => ({
        query: item.query,
        response: item.ai_response,
        timestamp: item.query_timestamp
      }));

      logger.debug(`📚 Retrieved ${context.length} context items for ${phoneNumber}`);
      return context.reverse(); // Return in chronological order

    } catch (error) {
      logger.error('Supabase get context error:', error);
      return [];
    }
  }

  // Get user conversation history
  async getUserHistory(phoneNumber, limit = 50) {
    if (!this.supabase) return [];

    try {
      const { data, error } = await this.supabase
        .from('conversations')
        .select('*')
        .eq('user_phone', phoneNumber)
        .order('query_timestamp', { ascending: false })
        .limit(limit);

      if (error) {
        logger.error('Error getting user history:', error);
        return [];
      }

      return data || [];

    } catch (error) {
      logger.error('Supabase get history error:', error);
      return [];
    }
  }

  // Ensure user exists in database
  async ensureUserExists(phoneNumber, preferredLanguage = 'en') {
    if (!this.supabase) return null;

    try {
      // Check if user already exists
      const { data: existingUser, error: checkError } = await this.supabase
        .from('users')
        .select('phone_number')
        .eq('phone_number', phoneNumber)
        .single();

      if (!checkError && existingUser) {
        return existingUser;
      }

      // Create new user
      const { data, error } = await this.supabase
        .from('users')
        .insert({
          phone_number: phoneNumber,
          preferred_language: preferredLanguage,
          created_at: new Date().toISOString(),
          last_active: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        logger.error('Error creating user:', error);
        return null;
      }

      logger.info(`👤 New user created: ${phoneNumber}`);
      return data;

    } catch (error) {
      logger.error('Supabase ensure user error:', error);
      return null;
    }
  }

  // Update user last active timestamp
  async updateUserActivity(phoneNumber) {
    if (!this.supabase) return null;

    try {
      const { data, error } = await this.supabase
        .from('users')
        .update({ last_active: new Date().toISOString() })
        .eq('phone_number', phoneNumber);

      if (error) {
        logger.error('Error updating user activity:', error);
        return null;
      }

      return data;

    } catch (error) {
      logger.error('Supabase update activity error:', error);
      return null;
    }
  }

  // Log message for debugging and analytics
  async logMessage(phoneNumber, messageType, content, metadata = {}) {
    if (!this.supabase) return null;

    try {
      const { data, error } = await this.supabase
        .from('message_logs')
        .insert({
          user_phone: phoneNumber,
          message_type: messageType, // 'incoming', 'outgoing', 'error'
          content: content.substring(0, 1000), // Limit content length
          metadata: metadata,
          timestamp: new Date().toISOString()
        });

      if (error) {
        logger.error('Error logging message:', error);
        return null;
      }

      return data;

    } catch (error) {
      logger.error('Supabase log message error:', error);
      return null;
    }
  }

  // Update message status (for Twilio status callbacks)
  async updateMessageStatus(messageSid, status) {
    if (!this.supabase) return null;

    try {
      const { data, error } = await this.supabase
        .from('message_logs')
        .update({ 
          message_status: status,
          status_updated_at: new Date().toISOString()
        })
        .eq('message_sid', messageSid);

      if (error) {
        logger.error('Error updating message status:', error);
        return null;
      }

      return data;

    } catch (error) {
      logger.error('Supabase update status error:', error);
      return null;
    }
  }

  // Get user statistics
  async getUserStats(phoneNumber) {
    if (!this.supabase) return null;

    try {
      const { data, error } = await this.supabase
        .from('conversations')
        .select('id, query_timestamp, ai_provider')
        .eq('user_phone', phoneNumber);

      if (error) {
        logger.error('Error getting user stats:', error);
        return null;
      }

      const totalConversations = data.length;
      const firstConversation = data.length > 0 ? data[data.length - 1].query_timestamp : null;
      const lastConversation = data.length > 0 ? data[0].query_timestamp : null;

      // Count by provider
      const providerStats = data.reduce((acc, conv) => {
        if (conv.ai_provider) {
          acc[conv.ai_provider] = (acc[conv.ai_provider] || 0) + 1;
        }
        return acc;
      }, {});

      return {
        totalConversations,
        firstConversation,
        lastConversation,
        providerStats
      };

    } catch (error) {
      logger.error('Supabase get user stats error:', error);
      return null;
    }
  }

  // Search conversations by content
  async searchConversations(phoneNumber, searchQuery, limit = 20) {
    if (!this.supabase) return [];

    try {
      const { data, error } = await this.supabase
        .from('conversations')
        .select('*')
        .eq('user_phone', phoneNumber)
        .or(`query.ilike.%${searchQuery}%,ai_response.ilike.%${searchQuery}%`)
        .order('query_timestamp', { ascending: false })
        .limit(limit);

      if (error) {
        logger.error('Error searching conversations:', error);
        return [];
      }

      return data || [];

    } catch (error) {
      logger.error('Supabase search conversations error:', error);
      return [];
    }
  }

  // Get popular queries (for analytics)
  async getPopularQueries(limit = 10, timeframe = '7 days') {
    if (!this.supabase) return [];

    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(timeframe.split(' ')[0]));

      const { data, error } = await this.supabase
        .from('conversations')
        .select('query')
        .gte('query_timestamp', startDate.toISOString())
        .not('query', 'is', null);

      if (error) {
        logger.error('Error getting popular queries:', error);
        return [];
      }

      // Count query frequency
      const queryCount = data.reduce((acc, item) => {
        const query = item.query.toLowerCase().trim();
        acc[query] = (acc[query] || 0) + 1;
        return acc;
      }, {});

      // Sort by frequency and return top queries
      return Object.entries(queryCount)
        .sort(([,a], [,b]) => b - a)
        .slice(0, limit)
        .map(([query, count]) => ({ query, count }));

    } catch (error) {
      logger.error('Supabase get popular queries error:', error);
      return [];
    }
  }

  // Check if service is available
  isAvailable() {
    return !!this.supabase;
  }

  // Get service status
  async getServiceStatus() {
    if (!this.supabase) {
      return { status: 'disabled', message: 'Supabase not configured' };
    }

    try {
      // Test connection by getting a simple count
      const { data, error } = await this.supabase
        .from('users')
        .select('phone_number', { count: 'exact', head: true });

      if (error) {
        return { status: 'error', message: error.message };
      }

      return { status: 'active', message: 'Connected to Supabase' };

    } catch (error) {
      return { status: 'error', message: error.message };
    }
  }
}

module.exports = new SupabaseService();