const rateLimit = require('express-rate-limit');
const logger = require('../utils/logger');

// Create different rate limiters for different endpoints

// General API rate limiter
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP',
    message: 'Please try again later',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn(`Rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({
      error: 'Rate limit exceeded',
      message: 'Too many requests. Please try again later.',
      retryAfter: Math.round(req.rateLimit.resetTime / 1000)
    });
  }
});

// Strict limiter for webhook endpoints
const webhookLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30, // Limit each IP to 30 webhook requests per minute
  message: {
    error: 'Webhook rate limit exceeded',
    message: 'Too many webhook requests'
  },
  keyGenerator: (req) => {
    // Use phone number if available, otherwise fall back to IP
    return req.body?.From || req.ip;
  },
  handler: (req, res) => {
    logger.warn(`Webhook rate limit exceeded for: ${req.body?.From || req.ip}`);
    res.status(429).json({
      error: 'Webhook rate limit exceeded',
      message: 'Please reduce the frequency of requests'
    });
  }
});

// Per-user conversation rate limiter
const conversationLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 5, // Limit each user to 5 conversations per minute
  keyGenerator: (req) => {
    return req.body?.From || req.ip;
  },
  skipSuccessfulRequests: false,
  skipFailedRequests: true,
  handler: (req, res) => {
    const user = req.body?.From || req.ip;
    logger.warn(`Conversation rate limit exceeded for user: ${user}`);
    
    // Send appropriate response based on language
    const message = req.body?.Body || '';
    const isHindi = /[\u0900-\u097F]/.test(message);
    const isHinglish = !isHindi && /\b(hai|hain|kya|kaise|mein|main)\b/i.test(message);
    
    let responseMessage;
    if (isHindi) {
      responseMessage = 'कृपया धीमी गति से संदेश भेजें। एक मिनट प्रतीक्षा करें। 🕐';
    } else if (isHinglish) {
      responseMessage = 'Please slowly message bheje. Ek minute wait kariye. 🕐';
    } else {
      responseMessage = 'Please slow down. Wait a minute before sending the next message. 🕐';
    }

    res.status(429).json({
      error: 'Rate limit exceeded',
      message: responseMessage,
      retryAfter: 60
    });
  }
});

// Create a limiter specifically for emergency requests (more lenient)
const emergencyLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 10, // Allow more emergency requests
  keyGenerator: (req) => {
    return req.body?.From || req.ip;
  },
  skip: (req) => {
    // Skip rate limiting for emergency keywords
    const message = (req.body?.Body || '').toLowerCase();
    const emergencyKeywords = [
      'emergency', 'urgent', 'help', 'ambulance', 'hospital', 'emergency',
      'apatkal', 'madad', 'turant', 'jaldi', 'bachao'
    ];
    
    return emergencyKeywords.some(keyword => message.includes(keyword));
  }
});

// Health check rate limiter (very lenient)
const healthCheckLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 20, // Allow frequent health checks
  message: {
    error: 'Health check rate limit exceeded',
    message: 'Please reduce health check frequency'
  }
});

// Create a store for custom rate limiting
class CustomRateLimiter {
  constructor() {
    this.store = new Map();
    this.cleanupInterval = setInterval(() => this.cleanup(), 5 * 60 * 1000); // Cleanup every 5 minutes
  }

  // Check rate limit for specific user and action
  checkLimit(key, windowMs = 60000, maxRequests = 5) {
    const now = Date.now();
    const userRequests = this.store.get(key) || [];

    // Remove expired requests
    const validRequests = userRequests.filter(timestamp => now - timestamp < windowMs);

    if (validRequests.length >= maxRequests) {
      return {
        allowed: false,
        resetTime: validRequests[0] + windowMs,
        remaining: 0,
        total: maxRequests
      };
    }

    // Add current request
    validRequests.push(now);
    this.store.set(key, validRequests);

    return {
      allowed: true,
      resetTime: now + windowMs,
      remaining: maxRequests - validRequests.length,
      total: maxRequests
    };
  }

  // Cleanup expired entries
  cleanup() {
    const now = Date.now();
    const oneHour = 60 * 60 * 1000;

    for (const [key, requests] of this.store.entries()) {
      const validRequests = requests.filter(timestamp => now - timestamp < oneHour);
      
      if (validRequests.length === 0) {
        this.store.delete(key);
      } else {
        this.store.set(key, validRequests);
      }
    }

    logger.debug(`Rate limiter cleanup completed. Active keys: ${this.store.size}`);
  }

  // Get current status for a key
  getStatus(key) {
    const requests = this.store.get(key) || [];
    const now = Date.now();
    const recentRequests = requests.filter(timestamp => now - timestamp < 60000);

    return {
      recentRequests: recentRequests.length,
      oldestRequest: recentRequests.length > 0 ? Math.min(...recentRequests) : null,
      newestRequest: recentRequests.length > 0 ? Math.max(...recentRequests) : null
    };
  }

  // Reset limits for a specific key (for testing or admin purposes)
  resetKey(key) {
    this.store.delete(key);
    logger.info(`Rate limit reset for key: ${key}`);
  }

  // Get all active keys (for monitoring)
  getActiveKeys() {
    return Array.from(this.store.keys());
  }
}

// Create custom rate limiter instance
const customRateLimiter = new CustomRateLimiter();

// Middleware to apply different rate limits based on request type
const dynamicRateLimiter = (req, res, next) => {
  const userKey = req.body?.From || req.ip;
  const message = (req.body?.Body || '').toLowerCase();

  // Check for emergency requests (less restrictive)
  const emergencyKeywords = [
    'emergency', 'urgent', 'help', 'ambulance', 'hospital',
    'apatkal', 'madad', 'turant', 'jaldi', 'bachao'
  ];

  const isEmergency = emergencyKeywords.some(keyword => message.includes(keyword));

  if (isEmergency) {
    // Use emergency limiter (more lenient)
    const result = customRateLimiter.checkLimit(userKey + ':emergency', 60000, 8);
    if (!result.allowed) {
      logger.warn(`Emergency rate limit exceeded for: ${userKey}`);
      return res.status(429).json({
        error: 'Emergency rate limit exceeded',
        message: 'Even for emergencies, please wait before sending another message.',
        retryAfter: Math.round((result.resetTime - Date.now()) / 1000)
      });
    }
  } else {
    // Use normal conversation limiter
    const result = customRateLimiter.checkLimit(userKey + ':conversation', 60000, 3);
    if (!result.allowed) {
      logger.warn(`Conversation rate limit exceeded for: ${userKey}`);
      
      const responseMessage = this.getLocalizedRateLimitMessage(message);
      return res.status(429).json({
        error: 'Rate limit exceeded',
        message: responseMessage,
        retryAfter: Math.round((result.resetTime - Date.now()) / 1000)
      });
    }
  }

  // Add rate limit info to request
  req.rateLimit = customRateLimiter.getStatus(userKey);
  next();
};

// Get localized rate limit message
function getLocalizedRateLimitMessage(message) {
  const isHindi = /[\u0900-\u097F]/.test(message);
  const isHinglish = !isHindi && /\b(hai|hain|kya|kaise|mein|main)\b/i.test(message);
  
  if (isHindi) {
    return 'कृपया धीमी गति से संदेश भेजें। मैं आपकी मदद करना चाहता हूं लेकिन थोड़ा समय दें। 🕐\n\nआपातकाल के लिए: 112 डायल करें';
  } else if (isHinglish) {
    return 'Please slowly message bheje. Main aapki help karna chahta hun lekin thoda time dijiye. 🕐\n\nEmergency ke liye: 112 dial kariye';
  } else {
    return 'Please slow down your messages. I want to help you but need a moment between messages. 🕐\n\nFor emergencies: Dial 112';
  }
}

module.exports = {
  apiLimiter,
  webhookLimiter,
  conversationLimiter,
  emergencyLimiter,
  healthCheckLimiter,
  dynamicRateLimiter,
  customRateLimiter
};