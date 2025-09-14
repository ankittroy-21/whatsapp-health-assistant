const validator = require('validator');
const logger = require('../utils/logger');

class InputValidator {
  
  // Validate WhatsApp phone number
  static validatePhoneNumber(phoneNumber) {
    if (!phoneNumber || typeof phoneNumber !== 'string') {
      return { isValid: false, error: 'Phone number is required' };
    }

    // Clean the phone number
    const cleaned = phoneNumber.replace(/\D/g, '');
    
    // Check if it's a valid length (Indian numbers are typically 10 digits, with country code 12-13)
    if (cleaned.length < 10 || cleaned.length > 15) {
      return { isValid: false, error: 'Invalid phone number length' };
    }

    // Check if it contains only digits and + at the beginning
    if (!validator.isMobilePhone(phoneNumber, 'any', { strictMode: false })) {
      return { isValid: false, error: 'Invalid phone number format' };
    }

    return { isValid: true, cleaned: phoneNumber };
  }

  // Validate and sanitize user message
  static validateMessage(message) {
    if (!message || typeof message !== 'string') {
      return { isValid: false, error: 'Message is required' };
    }

    // Check message length (WhatsApp limit is 4096 characters)
    if (message.length > 4096) {
      return { isValid: false, error: 'Message too long (max 4096 characters)' };
    }

    // Basic sanitization - remove potentially harmful content
    const sanitized = this.sanitizeText(message);
    
    // Check for empty message after sanitization
    if (sanitized.trim().length === 0) {
      return { isValid: false, error: 'Message cannot be empty' };
    }

    return { isValid: true, sanitized };
  }

  // Sanitize text input
  static sanitizeText(text) {
    if (!text) return '';

    // Remove HTML tags
    let sanitized = text.replace(/<[^>]*>/g, '');
    
    // Remove script content
    sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    
    // Remove potential SQL injection patterns (basic)
    sanitized = sanitized.replace(/(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION)\b)/gi, '');
    
    // Remove excessive whitespace
    sanitized = sanitized.replace(/\s+/g, ' ').trim();
    
    // Limit length
    if (sanitized.length > 2000) {
      sanitized = sanitized.substring(0, 2000) + '...';
    }

    return sanitized;
  }

  // Validate media URL
  static validateMediaUrl(url) {
    if (!url) {
      return { isValid: true }; // Media URL is optional
    }

    if (typeof url !== 'string') {
      return { isValid: false, error: 'Invalid media URL format' };
    }

    // Check if it's a valid URL
    if (!validator.isURL(url, { 
      protocols: ['http', 'https'],
      require_protocol: true 
    })) {
      return { isValid: false, error: 'Invalid media URL' };
    }

    // Check if it's from a trusted domain (Twilio, WhatsApp, etc.)
    const trustedDomains = [
      'api.twilio.com',
      'media.twiliocdn.com',
      'scontent.whatsapp.net',
      'mmg.whatsapp.net',
      'pps.whatsapp.net'
    ];

    try {
      const urlObj = new URL(url);
      const isFromTrustedDomain = trustedDomains.some(domain => 
        urlObj.hostname.includes(domain)
      );

      if (!isFromTrustedDomain) {
        logger.warn(`Media URL from untrusted domain: ${urlObj.hostname}`);
      }

      return { isValid: true, isTrusted: isFromTrustedDomain };
    } catch (error) {
      return { isValid: false, error: 'Invalid URL format' };
    }
  }

  // Validate language code
  static validateLanguage(language) {
    if (!language) {
      return { isValid: true, normalized: 'en' }; // Default to English
    }

    const supportedLanguages = ['en', 'hi', 'hinglish'];
    const normalized = language.toLowerCase();

    if (!supportedLanguages.includes(normalized)) {
      return { isValid: false, error: 'Unsupported language' };
    }

    return { isValid: true, normalized };
  }

  // Check for spam patterns
  static checkForSpam(message, phoneNumber) {
    const spamPatterns = [
      // Repeated characters
      /(.)\1{10,}/,
      // Excessive caps
      /[A-Z]{20,}/,
      // Promotional keywords
      /\b(buy now|click here|free offer|limited time|act now|call now)\b/gi,
      // Excessive punctuation
      /[!]{5,}|[?]{5,}/,
      // URLs (if not from trusted sources)
      /https?:\/\/(?!.*(?:twilio|whatsapp))/gi
    ];

    const suspiciousPatterns = spamPatterns.filter(pattern => pattern.test(message));
    
    if (suspiciousPatterns.length > 0) {
      logger.warn(`Potential spam detected from ${phoneNumber}: ${message.substring(0, 100)}`);
      return { isSpam: true, patterns: suspiciousPatterns.length };
    }

    return { isSpam: false };
  }

  // Rate limiting check (simple in-memory implementation)
  static checkRateLimit(phoneNumber, windowMs = 60000, maxRequests = 10) {
    if (!this.rateLimitStore) {
      this.rateLimitStore = new Map();
    }

    const now = Date.now();
    const userKey = phoneNumber;
    const userRequests = this.rateLimitStore.get(userKey) || [];

    // Remove old requests outside the window
    const validRequests = userRequests.filter(timestamp => now - timestamp < windowMs);

    if (validRequests.length >= maxRequests) {
      return { 
        isLimited: true, 
        resetTime: validRequests[0] + windowMs,
        remaining: 0
      };
    }

    // Add current request
    validRequests.push(now);
    this.rateLimitStore.set(userKey, validRequests);

    return { 
      isLimited: false, 
      remaining: maxRequests - validRequests.length 
    };
  }

  // Clean up old rate limit entries
  static cleanupRateLimit() {
    if (!this.rateLimitStore) return;

    const now = Date.now();
    const oneHour = 60 * 60 * 1000; // 1 hour

    for (const [key, requests] of this.rateLimitStore.entries()) {
      const validRequests = requests.filter(timestamp => now - timestamp < oneHour);
      
      if (validRequests.length === 0) {
        this.rateLimitStore.delete(key);
      } else {
        this.rateLimitStore.set(key, validRequests);
      }
    }
  }

  // Validate webhook signature (for Twilio)
  static validateWebhookSignature(signature, url, body, authToken) {
    if (!signature || !authToken) {
      return { isValid: false, error: 'Missing signature or auth token' };
    }

    try {
      const crypto = require('crypto');
      const expectedSignature = crypto
        .createHmac('sha1', authToken)
        .update(Buffer.from(url + body, 'utf-8'))
        .digest('base64');

      const providedSignature = signature.replace('sha1=', '');
      const isValid = crypto.timingSafeEqual(
        Buffer.from(expectedSignature, 'base64'),
        Buffer.from(providedSignature, 'base64')
      );

      return { isValid };

    } catch (error) {
      logger.error('Webhook signature validation error:', error);
      return { isValid: false, error: 'Signature validation failed' };
    }
  }

  // Sanitize filename for logs
  static sanitizeFilename(filename) {
    if (!filename) return 'unknown';
    
    return filename
      .replace(/[^a-zA-Z0-9.-]/g, '_')
      .replace(/_{2,}/g, '_')
      .substring(0, 50);
  }

  // Validate API key format
  static validateApiKey(apiKey, keyType) {
    if (!apiKey || typeof apiKey !== 'string') {
      return { isValid: false, error: `${keyType} API key is required` };
    }

    // Basic format validation based on key type
    const patterns = {
      twilio: /^AC[a-f0-9]{32}$/i,
      openai: /^sk-[a-zA-Z0-9]{48,}$/,
      gemini: /^AI[a-zA-Z0-9_-]{30,}$/,
      supabase: /^[a-zA-Z0-9_-]{50,}$/
    };

    const pattern = patterns[keyType.toLowerCase()];
    if (pattern && !pattern.test(apiKey)) {
      return { isValid: false, error: `Invalid ${keyType} API key format` };
    }

    // Check for common test/placeholder values
    const invalidValues = [
      'your_api_key_here',
      'test_key',
      'placeholder',
      'sk-test',
      'demo_key'
    ];

    if (invalidValues.some(invalid => apiKey.toLowerCase().includes(invalid))) {
      return { isValid: false, error: `${keyType} API key appears to be a placeholder` };
    }

    return { isValid: true };
  }

  // Comprehensive request validation
  static validateRequest(req) {
    const errors = [];

    // Validate phone number
    const phoneValidation = this.validatePhoneNumber(req.body.From);
    if (!phoneValidation.isValid) {
      errors.push(`Phone: ${phoneValidation.error}`);
    }

    // Validate message if present
    if (req.body.Body) {
      const messageValidation = this.validateMessage(req.body.Body);
      if (!messageValidation.isValid) {
        errors.push(`Message: ${messageValidation.error}`);
      } else {
        req.body.Body = messageValidation.sanitized;
      }
    }

    // Validate media URL if present
    if (req.body.MediaUrl0) {
      const mediaValidation = this.validateMediaUrl(req.body.MediaUrl0);
      if (!mediaValidation.isValid) {
        errors.push(`Media: ${mediaValidation.error}`);
      }
    }

    // Check for spam
    if (req.body.Body && phoneValidation.isValid) {
      const spamCheck = this.checkForSpam(req.body.Body, req.body.From);
      if (spamCheck.isSpam) {
        errors.push('Message flagged as potential spam');
      }
    }

    // Rate limiting
    if (phoneValidation.isValid) {
      const rateLimit = this.checkRateLimit(req.body.From);
      if (rateLimit.isLimited) {
        errors.push('Rate limit exceeded');
      }
      req.rateLimit = rateLimit;
    }

    return {
      isValid: errors.length === 0,
      errors,
      sanitizedBody: req.body
    };
  }
}

module.exports = InputValidator;