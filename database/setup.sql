-- Complete Database Schema for WhatsApp Health Assistant Chatbot
-- Run this SQL in your Supabase SQL Editor to set up all required tables

-- ==============================================
-- USERS TABLE
-- ==============================================
CREATE TABLE IF NOT EXISTS users (
  id BIGSERIAL PRIMARY KEY,
  phone_number VARCHAR(20) UNIQUE NOT NULL,
  preferred_language VARCHAR(10) DEFAULT 'en',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_active TIMESTAMPTZ DEFAULT NOW(),
  total_queries INTEGER DEFAULT 0,
  emergency_contact VARCHAR(20),
  health_profile JSONB DEFAULT '{}'::JSONB,
  user_metadata JSONB DEFAULT '{}'::JSONB
);

-- Indexes for users table
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone_number);
CREATE INDEX IF NOT EXISTS idx_users_last_active ON users(last_active);

-- ==============================================
-- CONVERSATIONS TABLE
-- ==============================================
CREATE TABLE IF NOT EXISTS conversations (
  id BIGSERIAL PRIMARY KEY,
  user_phone VARCHAR(20) NOT NULL,
  query TEXT NOT NULL,
  ai_response TEXT,
  detected_language VARCHAR(10),
  ai_provider VARCHAR(50),
  confidence_score DECIMAL(3,2),
  query_timestamp TIMESTAMPTZ DEFAULT NOW(),
  response_timestamp TIMESTAMPTZ,
  is_emergency BOOLEAN DEFAULT FALSE,
  health_category VARCHAR(100),
  metadata JSONB DEFAULT '{}'::JSONB
);

-- Indexes for conversations table
CREATE INDEX IF NOT EXISTS idx_conversations_user_phone ON conversations(user_phone);
CREATE INDEX IF NOT EXISTS idx_conversations_timestamp ON conversations(query_timestamp);
CREATE INDEX IF NOT EXISTS idx_conversations_emergency ON conversations(is_emergency);
CREATE INDEX IF NOT EXISTS idx_conversations_category ON conversations(health_category);

-- ==============================================
-- MESSAGE LOGS TABLE
-- ==============================================
CREATE TABLE IF NOT EXISTS message_logs (
  id BIGSERIAL PRIMARY KEY,
  user_phone VARCHAR(20) NOT NULL,
  message_type VARCHAR(20) NOT NULL, -- 'incoming', 'outgoing', 'error', 'voice'
  content TEXT,
  message_sid VARCHAR(100),
  message_status VARCHAR(20),
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  status_updated_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::JSONB
);

-- Indexes for message_logs table
CREATE INDEX IF NOT EXISTS idx_message_logs_user_phone ON message_logs(user_phone);
CREATE INDEX IF NOT EXISTS idx_message_logs_timestamp ON message_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_message_logs_message_sid ON message_logs(message_sid);
CREATE INDEX IF NOT EXISTS idx_message_logs_type ON message_logs(message_type);

-- ==============================================
-- ANALYTICS TABLE
-- ==============================================
CREATE TABLE IF NOT EXISTS analytics (
  id BIGSERIAL PRIMARY KEY,
  date DATE DEFAULT CURRENT_DATE,
  total_users INTEGER DEFAULT 0,
  total_queries INTEGER DEFAULT 0,
  total_emergency_queries INTEGER DEFAULT 0,
  language_breakdown JSONB DEFAULT '{}'::JSONB,
  provider_breakdown JSONB DEFAULT '{}'::JSONB,
  health_categories JSONB DEFAULT '{}'::JSONB,
  response_times JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(date)
);

-- Indexes for analytics table
CREATE INDEX IF NOT EXISTS idx_analytics_date ON analytics(date);

-- ==============================================
-- HEALTH QUERIES TABLE
-- ==============================================
CREATE TABLE IF NOT EXISTS health_queries (
  id BIGSERIAL PRIMARY KEY,
  user_phone VARCHAR(20) NOT NULL,
  symptoms TEXT[],
  diagnosed_condition VARCHAR(200),
  severity_level VARCHAR(20), -- 'low', 'medium', 'high', 'emergency'
  confidence_score DECIMAL(3,2),
  recommended_actions TEXT[],
  follow_up_needed BOOLEAN DEFAULT FALSE,
  follow_up_date DATE,
  query_timestamp TIMESTAMPTZ DEFAULT NOW(),
  resolved BOOLEAN DEFAULT FALSE,
  resolution_notes TEXT
);

-- Indexes for health_queries table
CREATE INDEX IF NOT EXISTS idx_health_queries_user_phone ON health_queries(user_phone);
CREATE INDEX IF NOT EXISTS idx_health_queries_severity ON health_queries(severity_level);
CREATE INDEX IF NOT EXISTS idx_health_queries_follow_up ON health_queries(follow_up_needed);
CREATE INDEX IF NOT EXISTS idx_health_queries_timestamp ON health_queries(query_timestamp);

-- ==============================================
-- ROW LEVEL SECURITY POLICIES
-- ==============================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE health_queries ENABLE ROW LEVEL SECURITY;

-- Policies for users table
CREATE POLICY IF NOT EXISTS "Enable read access for service" ON users FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS "Enable insert for service" ON users FOR INSERT WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "Enable update for service" ON users FOR UPDATE USING (true);

-- Policies for conversations table
CREATE POLICY IF NOT EXISTS "Enable read access for service" ON conversations FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS "Enable insert for service" ON conversations FOR INSERT WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "Enable update for service" ON conversations FOR UPDATE USING (true);

-- Policies for message_logs table
CREATE POLICY IF NOT EXISTS "Enable full access for service" ON message_logs FOR ALL USING (true);

-- Policies for analytics table
CREATE POLICY IF NOT EXISTS "Enable read access for service" ON analytics FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS "Enable insert for service" ON analytics FOR INSERT WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "Enable update for service" ON analytics FOR UPDATE USING (true);

-- Policies for health_queries table
CREATE POLICY IF NOT EXISTS "Enable read access for service" ON health_queries FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS "Enable insert for service" ON health_queries FOR INSERT WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "Enable update for service" ON health_queries FOR UPDATE USING (true);

-- ==============================================
-- UTILITY FUNCTIONS
-- ==============================================

-- Function to get user statistics
CREATE OR REPLACE FUNCTION get_user_stats(user_phone_param VARCHAR)
RETURNS TABLE(
  total_conversations BIGINT,
  emergency_conversations BIGINT,
  last_conversation TIMESTAMPTZ,
  preferred_language VARCHAR,
  most_common_category VARCHAR
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(c.id) as total_conversations,
    COUNT(c.id) FILTER (WHERE c.is_emergency = true) as emergency_conversations,
    MAX(c.query_timestamp) as last_conversation,
    u.preferred_language,
    MODE() WITHIN GROUP (ORDER BY c.health_category) as most_common_category
  FROM users u
  LEFT JOIN conversations c ON u.phone_number = c.user_phone
  WHERE u.phone_number = user_phone_param
  GROUP BY u.phone_number, u.preferred_language;
END;
$$ LANGUAGE plpgsql;

-- Function to update analytics
CREATE OR REPLACE FUNCTION update_daily_analytics()
RETURNS void AS $$
DECLARE
  today_date DATE := CURRENT_DATE;
BEGIN
  INSERT INTO analytics (
    date,
    total_users,
    total_queries,
    total_emergency_queries,
    language_breakdown,
    provider_breakdown,
    health_categories
  )
  SELECT 
    today_date,
    (SELECT COUNT(DISTINCT phone_number) FROM users WHERE DATE(created_at) = today_date),
    (SELECT COUNT(*) FROM conversations WHERE DATE(query_timestamp) = today_date),
    (SELECT COUNT(*) FROM conversations WHERE DATE(query_timestamp) = today_date AND is_emergency = true),
    (SELECT jsonb_object_agg(detected_language, lang_count) FROM (
      SELECT detected_language, COUNT(*) as lang_count 
      FROM conversations 
      WHERE DATE(query_timestamp) = today_date 
      GROUP BY detected_language
    ) lang_stats),
    (SELECT jsonb_object_agg(ai_provider, provider_count) FROM (
      SELECT ai_provider, COUNT(*) as provider_count 
      FROM conversations 
      WHERE DATE(query_timestamp) = today_date AND ai_provider IS NOT NULL
      GROUP BY ai_provider
    ) provider_stats),
    (SELECT jsonb_object_agg(health_category, category_count) FROM (
      SELECT health_category, COUNT(*) as category_count 
      FROM conversations 
      WHERE DATE(query_timestamp) = today_date AND health_category IS NOT NULL
      GROUP BY health_category
    ) category_stats)
  ON CONFLICT (date) DO UPDATE SET
    total_users = EXCLUDED.total_users,
    total_queries = EXCLUDED.total_queries,
    total_emergency_queries = EXCLUDED.total_emergency_queries,
    language_breakdown = EXCLUDED.language_breakdown,
    provider_breakdown = EXCLUDED.provider_breakdown,
    health_categories = EXCLUDED.health_categories;
END;
$$ LANGUAGE plpgsql;

-- ==============================================
-- SETUP COMPLETE MESSAGE
-- ==============================================
DO $$
BEGIN
  RAISE NOTICE '✅ WhatsApp Health Assistant Database Schema Setup Complete!';
  RAISE NOTICE '📊 Tables created: users, conversations, message_logs, analytics, health_queries';
  RAISE NOTICE '🔒 Row Level Security enabled with appropriate policies';
  RAISE NOTICE '⚡ Utility functions created for analytics and user stats';
  RAISE NOTICE '🚀 Your chatbot database is ready to use!';
END $$;