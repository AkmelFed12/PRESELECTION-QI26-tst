// ==================== STRING UTILITIES & VALIDATION ====================

export function sanitizeString(value, maxLength = null) {
  if (typeof value !== 'string') return '';
  let str = value.trim();
  if (maxLength) str = str.substring(0, maxLength);
  // Remove potentially harmful characters but keep valid content
  return str
    .replace(/[<>]/g, '') // Remove angle brackets
    .trim();
}

/**
 * Validate and sanitize email addresses
 */
export function validateEmail(email) {
  if (!email || typeof email !== 'string') return false;
  const cleaned = email.trim().toLowerCase();
  const pattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return cleaned.length <= 120 && pattern.test(cleaned);
}

/**
 * Validate phone numbers
 */
export function validatePhone(phone) {
  if (!phone || typeof phone !== 'string') return false;
  const digits = phone.replace(/\D/g, '');
  return digits.length >= 8 && digits.length <= 20;
}

/**
 * Validate and normalize candidate IDs - EXPORTED
 */
export function validateCandidateId(id) {
  if (!id || typeof id !== 'string') return null;
  const cleaned = id.trim().toUpperCase().substring(0, 50);
  // Candidate IDs should be alphanumeric, usually like QI26XXXX
  return /^[A-Z0-9]{3,}$/.test(cleaned) ? cleaned : null;
}

/**
 * Validate WhatsApp numbers and normalize to E.164 format
 */
export function normalizeWhatsapp(value) {
  if (!value) return '';
  let raw = value.toString().trim().replace(/[^\d+]/g, '');
  if (raw.startsWith('00')) {
    raw = '+' + raw.substring(2);
  }
  if (!/^\+?[1-9]\d{6,14}$/.test(raw)) return '';
  if (!raw.startsWith('+')) raw = '+' + raw;
  return raw;
}

/**
 * Extract only digits from string
 */
export function digitsOnly(value) {
  return String(value || '').replace(/\D/g, '');
}

/**
 * Normalize and validate candidate IDs
 */
export function validateCandidateId(id) {
  if (!id || typeof id !== 'string') return null;
  const cleaned = id.trim().toUpperCase().substring(0, 50);
  // Candidate IDs should be alphanumeric, usually like QI26XXXX
  return /^[A-Z0-9]{3,}$/.test(cleaned) ? cleaned : null;
}

/**
 * Validate numeric IDs
 */
export function validateNumericId(id) {
  if (!id) return null;
  const parsed = Number.parseInt(id, 10);
  return parsed > 0 ? parsed : null;
}

/**
 * Validate URLs
 */
export function validateUrl(url) {
  if (!url || typeof url !== 'string') return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Normalize username (lowercase, no special chars)
 */
export function normalizeUsername(name) {
  if (!name || typeof name !== 'string') return '';
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, '')
    .substring(0, 50);
}

/**
 * Create a safe SQL LIKE pattern
 */
export function escapeLikePattern(value) {
  if (!value) return '%';
  return value.replace(/[%_\\]/g, '\\$&');
}

/**
 * Truncate text with ellipsis
 */
export function truncateText(text, maxLength = 100, suffix = '...') {
  if (!text || typeof text !== 'string') return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - suffix.length) + suffix;
}

/**
 * Check if string is empty or whitespace
 */
export function isEmpty(value) {
  return !value || (typeof value === 'string' && value.trim().length === 0);
}

/**
 * Validate password strength
 */
export function validatePasswordStrength(password) {
  if (!password || typeof password !== 'string') return { valid: false, strength: 'weak' };
  
  const checks = {
    length: password.length >= 8,
    hasUpper: /[A-Z]/.test(password),
    hasLower: /[a-z]/.test(password),
    hasNumber: /[0-9]/.test(password),
    hasSpecial: /[!@#$%^&*]/.test(password)
  };
  
  const passedChecks = Object.values(checks).filter(Boolean).length;
  let strength = 'weak';
  if (passedChecks >= 4) strength = 'strong';
  else if (passedChecks >= 3) strength = 'medium';
  
  return {
    valid: passedChecks >= 3,
    strength,
    checks
  };
}

