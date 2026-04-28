// ==================== ADMIN SECURITY TOKEN UTILITY ====================
// Secure token generation and validation

import { randomBytes, createHash } from 'crypto';

/**
 * Generate a secure random token
 */
export function generateSecureToken(length = 32) {
  return randomBytes(length).toString('hex');
}

/**
 * Hash a token for storage
 */
export function hashToken(token) {
  return createHash('sha256').update(token).digest('hex');
}

/**
 * Create a session token for admin
 */
export function createSessionToken(username) {
  const token = generateSecureToken();
  const timestamp = Date.now();
  const payload = `${username}:${timestamp}:${token}`;
  const signature = hashToken(payload);
  return `${Buffer.from(payload).toString('base64')}.${signature}`;
}

/**
 * Verify and decode session token
 */
export function verifySessionToken(tokenStr) {
  try {
    const [payload, signature] = tokenStr.split('.');
    if (!payload || !signature) return null;

    const decoded = Buffer.from(payload, 'base64').toString('utf-8');
    const [username, timestamp, token] = decoded.split(':');

    const verifyPayload = `${username}:${timestamp}:${token}`;
    const expectedSignature = hashToken(verifyPayload);

    if (signature !== expectedSignature) return null;

    // Token valid for 24 hours
    const tokenAge = Date.now() - parseInt(timestamp, 10);
    if (tokenAge > 24 * 60 * 60 * 1000) return null;

    return { username, timestamp, valid: true };
  } catch {
    return null;
  }
}

/**
 * Create a secure admin session entry in database
 */
export async function createAdminSession(pool, username) {
  try {
    const token = createSessionToken(username);
    const sessionId = generateSecureToken();
    
    await pool.query(
      `INSERT INTO admin_sessions (session_id, username, token_hash, created_at, expires_at)
       VALUES ($1, $2, $3, NOW(), NOW() + INTERVAL '24 hours')`,
      [sessionId, username, hashToken(token)]
    );

    return token;
  } catch (error) {
    console.error('[Auth] Error creating session:', error.message);
    return null;
  }
}

/**
 * Validate admin session
 */
export async function validateAdminSession(pool, token) {
  try {
    const verified = verifySessionToken(token);
    if (!verified) return false;

    const tokenHash = hashToken(token);
    const result = await pool.query(
      `SELECT session_id, username FROM admin_sessions 
       WHERE token_hash = $1 AND expires_at > NOW() LIMIT 1`,
      [tokenHash]
    );

    return result.rows.length > 0 ? result.rows[0] : false;
  } catch (error) {
    console.error('[Auth] Error validating session:', error.message);
    return false;
  }
}

/**
 * Invalidate admin session
 */
export async function invalidateAdminSession(pool, token) {
  try {
    const tokenHash = hashToken(token);
    await pool.query(
      'DELETE FROM admin_sessions WHERE token_hash = $1',
      [tokenHash]
    );
    return true;
  } catch (error) {
    console.error('[Auth] Error invalidating session:', error.message);
    return false;
  }
}
