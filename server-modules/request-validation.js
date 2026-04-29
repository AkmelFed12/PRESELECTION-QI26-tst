// ==================== REQUEST VALIDATION MIDDLEWARE ====================
// Centralized validation and sanitization for all API requests

import { sanitizeString, validateEmail, validatePhone, validateCandidateId } from '../services/string-utils.js';

/**
 * Middleware: Validate and sanitize all JSON inputs
 */
export function createInputValidationMiddleware() {
  return (req, res, next) => {
    // Store original body for later processing
    req.rawBody = req.body;

    // Sanitize all string values in body
    if (req.body && typeof req.body === 'object') {
      req.body = sanitizeRequestBody(req.body);
    }

    // Sanitize query parameters
    if (req.query && typeof req.query === 'object') {
      req.query = sanitizeRequestBody(req.query);
    }

    next();
  };
}

/**
 * Recursively sanitize all string values in an object
 */
function sanitizeRequestBody(obj, maxDepth = 5) {
  if (maxDepth <= 0) return obj;
  if (!obj || typeof obj !== 'object') return obj;

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeRequestBody(item, maxDepth - 1));
  }

  const sanitized = {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      // Sanitize string, limit length based on field type
      const maxLen = getMaxLengthForField(key);
      sanitized[key] = sanitizeString(value, maxLen);
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeRequestBody(value, maxDepth - 1);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

/**
 * Get max length for a field based on its name
 */
function getMaxLengthForField(fieldName) {
  const fieldName_lower = fieldName.toLowerCase();

  const limits = {
    'email': 120,
    'password': 128,
    'name': 100,
    'title': 200,
    'description': 2000,
    'bio': 500,
    'content': 2000,
    'message': 2000,
    'phone': 30,
    'whatsapp': 30,
    'url': 500,
    'website': 500,
    'location': 100,
    'city': 60,
    'country': 60,
  };

  for (const [pattern, limit] of Object.entries(limits)) {
    if (fieldName_lower.includes(pattern)) {
      return limit;
    }
  }

  // Default limit for unknown fields
  return 500;
}

/**
 * Validator for candidate registration
 */
export function validateCandidateRegistration(data) {
  const errors = [];

  // Full name
  if (!data.fullName || typeof data.fullName !== 'string') {
    errors.push('fullName is required');
  } else if (data.fullName.length < 2 || data.fullName.length > 120) {
    errors.push('fullName must be 2-120 characters');
  }

  // Email
  if (!validateEmail(data.email)) {
    errors.push('Valid email is required');
  }

  // Phone
  if (data.phone && !validatePhone(data.phone)) {
    errors.push('Phone format invalid');
  }

  // WhatsApp
  if (data.whatsapp && typeof data.whatsapp !== 'string') {
    errors.push('whatsapp must be a string');
  }

  // Motivation
  if (data.motivation && data.motivation.length > 800) {
    errors.push('motivation must be max 800 characters');
  }

  // Quran level
  const validLevels = ['', 'Débutant', 'Intermédiaire', 'Avancé'];
  if (data.quranLevel && !validLevels.includes(data.quranLevel)) {
    errors.push('Invalid quranLevel');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validator for login requests
 */
export function validateLoginRequest(data) {
  const errors = [];

  if (!data.username || typeof data.username !== 'string' || data.username.trim().length === 0) {
    errors.push('username is required');
  }

  if (!data.password || typeof data.password !== 'string' || data.password.length === 0) {
    errors.push('password is required');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validator for profile updates
 */
export function validateProfileUpdate(data) {
  const errors = [];

  if (data.bio && data.bio.length > 500) {
    errors.push('bio must be max 500 characters');
  }

  if (data.website && data.website.length > 500) {
    errors.push('website must be max 500 characters');
  }

  if (data.location && data.location.length > 100) {
    errors.push('location must be max 100 characters');
  }

  if (data.avatar_url && data.avatar_url.length > 500) {
    errors.push('avatar_url must be max 500 characters');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validator for chat messages
 */
export function validateChatMessage(data) {
  const errors = [];

  if (!data.content || typeof data.content !== 'string') {
    errors.push('content is required');
  } else if (data.content.trim().length === 0) {
    errors.push('content cannot be empty');
  } else if (data.content.length > 2000) {
    errors.push('content must be max 2000 characters');
  }

  if (!validateCandidateId(data.candidateId)) {
    errors.push('Invalid candidateId');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validator for group creation
 */
export function validateGroupCreation(data) {
  const errors = [];

  if (!data.name || typeof data.name !== 'string') {
    errors.push('name is required');
  } else if (data.name.length < 2 || data.name.length > 100) {
    errors.push('name must be 2-100 characters');
  }

  const validTypes = ['public', 'private', 'invite-only'];
  if (data.type && !validTypes.includes(data.type)) {
    errors.push('Invalid type: must be public, private, or invite-only');
  }

  if (data.description && data.description.length > 500) {
    errors.push('description must be max 500 characters');
  }

  if (!validateCandidateId(data.candidateId)) {
    errors.push('Invalid candidateId');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Create a safe query builder for filtering
 */
export function buildSafeQuery(filters, allowedFields = {}) {
  const query = { sql: '', params: [], index: 1 };

  for (const [field, value] of Object.entries(filters)) {
    // Check field is allowed
    if (!allowedFields[field]) continue;

    // Skip empty/null values
    if (value === null || value === undefined || value === '') continue;

    const fieldConfig = allowedFields[field];

    // Add condition
    switch (fieldConfig.type) {
      case 'exact':
        query.sql += ` AND ${field} = $${query.index}`;
        query.params.push(value);
        query.index++;
        break;

      case 'ilike':
        query.sql += ` AND ${field} ILIKE $${query.index}`;
        query.params.push(`%${value}%`);
        query.index++;
        break;

      case 'range':
        if (value.min !== undefined) {
          query.sql += ` AND ${field} >= $${query.index}`;
          query.params.push(value.min);
          query.index++;
        }
        if (value.max !== undefined) {
          query.sql += ` AND ${field} <= $${query.index}`;
          query.params.push(value.max);
          query.index++;
        }
        break;

      case 'in':
        if (Array.isArray(value) && value.length > 0) {
          const placeholders = value.map(() => `$${query.index++}`).join(',');
          query.sql += ` AND ${field} IN (${placeholders})`;
          query.params.push(...value);
        }
        break;
    }
  }

  return query;
}

export default {
  createInputValidationMiddleware,
  validateCandidateRegistration,
  validateLoginRequest,
  validateProfileUpdate,
  validateChatMessage,
  validateGroupCreation,
  buildSafeQuery
};
