import rateLimit from 'express-rate-limit';

const AUTH_WINDOW_MS = 15 * 60 * 1000;
const AUTH_BASE_BLOCK_MS = 2 * 60 * 1000;
const AUTH_MAX_BLOCK_MS = 30 * 60 * 1000;
const AUTH_MAX_ATTEMPTS = 5;
const AUTH_CLEANUP_INTERVAL_MS = 5 * 60 * 1000;

function requestIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.trim()) {
    return forwarded.split(',')[0].trim();
  }
  if (Array.isArray(forwarded) && forwarded[0]) {
    return String(forwarded[0]).split(',')[0].trim();
  }
  return (req.ip || req.socket?.remoteAddress || 'unknown').toString();
}

function authKeyFromRequest(req, namespace) {
  const ip = requestIp(req);
  const username = typeof req.body?.username === 'string' ? req.body.username.trim().toLowerCase() : 'anonymous';
  const normalizedUsername = username.substring(0, 120);
  return {
    key: `${namespace}:${ip}:${normalizedUsername}`,
    namespace,
    ip,
    username: normalizedUsername
  };
}

export function createAuthThrottle(pool) {
  let lastAuthCleanupAt = 0;

  const authIpLimiter = rateLimit({
    windowMs: AUTH_WINDOW_MS,
    max: 40,
    standardHeaders: true,
    legacyHeaders: false,
    message: 'Trop de tentatives de connexion. Réessayez plus tard.'
  });

  async function maybeCleanupAuthThrottle(nowTs = Date.now()) {
    if (nowTs - lastAuthCleanupAt < AUTH_CLEANUP_INTERVAL_MS) return;
    lastAuthCleanupAt = nowTs;
    try {
      await pool.query(
        `DELETE FROM auth_login_throttle
         WHERE
           (blocked_until IS NULL AND window_start < NOW() - ($1 * INTERVAL '1 second'))
           OR
           (blocked_until IS NOT NULL AND blocked_until < NOW() - ($2 * INTERVAL '1 second'))`,
        [Math.floor(AUTH_WINDOW_MS / 1000), Math.floor(AUTH_MAX_BLOCK_MS / 1000)]
      );
    } catch (error) {
      console.error('Auth throttle cleanup error:', error.message);
    }
  }

  function authProgressiveBlock(namespace) {
    return async (req, res, next) => {
      const nowTs = Date.now();
      await maybeCleanupAuthThrottle(nowTs);
      const identity = authKeyFromRequest(req, namespace);
      req.authAttemptIdentity = identity;

      try {
        const result = await pool.query(
          'SELECT failures, window_start, blocked_until FROM auth_login_throttle WHERE key = $1 LIMIT 1',
          [identity.key]
        );
        const state = result.rows[0];
        if (state?.blocked_until) {
          const blockedUntilTs = new Date(state.blocked_until).getTime();
          if (blockedUntilTs > nowTs) {
            const retryAfterSeconds = Math.ceil((blockedUntilTs - nowTs) / 1000);
            res.set('Retry-After', String(retryAfterSeconds));
            return res.status(429).json({
              message: 'Compte temporairement bloque apres plusieurs tentatives. Reessayez plus tard.',
              retryAfterSeconds
            });
          }
        }
      } catch (error) {
        console.error('Auth throttle lookup error:', error.message);
      }

      return next();
    };
  }

  async function markAuthAttempt(req, success) {
    const identity = req.authAttemptIdentity;
    if (!identity) return;

    try {
      const nowTs = Date.now();
      const now = new Date(nowTs);

      if (success) {
        await pool.query('DELETE FROM auth_login_throttle WHERE key = $1', [identity.key]);
        return;
      }

      const current = await pool.query(
        'SELECT failures, window_start FROM auth_login_throttle WHERE key = $1 LIMIT 1',
        [identity.key]
      );
      const row = current.rows[0];
      const windowExpired = !row || nowTs - new Date(row.window_start).getTime() > AUTH_WINDOW_MS;
      const failures = windowExpired ? 1 : (Number(row.failures) || 0) + 1;

      let blockedUntil = null;
      if (failures >= AUTH_MAX_ATTEMPTS) {
        const penaltyPower = failures - AUTH_MAX_ATTEMPTS;
        const blockMs = Math.min(AUTH_BASE_BLOCK_MS * (2 ** penaltyPower), AUTH_MAX_BLOCK_MS);
        blockedUntil = new Date(nowTs + blockMs);
      }

      await pool.query(
        `INSERT INTO auth_login_throttle (key, namespace, ip, username, failures, window_start, blocked_until, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
         ON CONFLICT (key) DO UPDATE SET
           failures = EXCLUDED.failures,
           window_start = EXCLUDED.window_start,
           blocked_until = EXCLUDED.blocked_until,
           updated_at = NOW(),
           namespace = EXCLUDED.namespace,
           ip = EXCLUDED.ip,
           username = EXCLUDED.username`,
        [identity.key, identity.namespace, identity.ip, identity.username, failures, now, blockedUntil]
      );
    } catch (error) {
      console.error('Auth throttle update error:', error.message);
    }
  }

  return { authIpLimiter, authProgressiveBlock, markAuthAttempt };
}
