function isValidHttpUrl(raw) {
  if (!raw || typeof raw !== 'string') return false;
  try {
    const parsed = new URL(raw);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export function validateEnvironment(env) {
  const errors = [];
  const warnings = [];
  const nodeEnv = env.NODE_ENV || 'development';
  const allowedNodeEnvs = new Set(['development', 'test', 'production']);

  if (env.NODE_ENV && !allowedNodeEnvs.has(nodeEnv)) {
    errors.push(`NODE_ENV invalide: "${env.NODE_ENV}". Valeurs autorisées: development, test, production.`);
  }

  if (env.PORT) {
    const parsedPort = Number.parseInt(env.PORT, 10);
    if (!Number.isInteger(parsedPort) || parsedPort < 1 || parsedPort > 65535) {
      errors.push(`PORT invalide: "${env.PORT}". Attendu: entier entre 1 et 65535.`);
    }
  }

  if (env.SITE_URL && !isValidHttpUrl(env.SITE_URL)) {
    errors.push(`SITE_URL invalide: "${env.SITE_URL}". Attendu: URL http(s).`);
  }

  if (env.CORS_ORIGIN && !isValidHttpUrl(env.CORS_ORIGIN)) {
    errors.push(`CORS_ORIGIN invalide: "${env.CORS_ORIGIN}". Attendu: URL http(s).`);
  }

  const smtpConfigured = Boolean(
    env.SMTP_HOST || env.SMTP_PORT || env.SMTP_USER || env.SMTP_PASSWORD || env.SMTP_FROM
  );
  if (smtpConfigured) {
    if (!env.SMTP_HOST) errors.push('SMTP_HOST est requis quand SMTP est configuré.');
    if (!env.SMTP_FROM) warnings.push('SMTP_FROM absent: fallback interne utilisé pour certains emails.');
    if ((env.SMTP_USER && !env.SMTP_PASSWORD) || (!env.SMTP_USER && env.SMTP_PASSWORD)) {
      errors.push('SMTP_USER et SMTP_PASSWORD doivent être définis ensemble.');
    }
    if (env.SMTP_PORT) {
      const smtpPort = Number.parseInt(env.SMTP_PORT, 10);
      if (!Number.isInteger(smtpPort) || smtpPort < 1 || smtpPort > 65535) {
        errors.push(`SMTP_PORT invalide: "${env.SMTP_PORT}".`);
      }
    }
  }

  if (nodeEnv === 'production') {
    if (!env.DATABASE_URL) {
      errors.push('DATABASE_URL est requis en production.');
    }
    if (!env.CORS_ORIGIN) {
      warnings.push('CORS_ORIGIN non défini en production: CORS permissif actif.');
    }
    if ((env.ADMIN_PASSWORD || 'ASAA') === 'ASAA') {
      warnings.push('ADMIN_PASSWORD utilise la valeur par défaut.');
    }
    if ((env.ADMIN_PASSWORD_ALT || 'ASAALMO2026') === 'ASAALMO2026') {
      warnings.push('ADMIN_PASSWORD_ALT utilise la valeur par défaut.');
    }
    if ((env.MEMBER_DEFAULT_PASSWORD || 'ASAA2026!') === 'ASAA2026!') {
      warnings.push('MEMBER_DEFAULT_PASSWORD utilise la valeur par défaut.');
    }
  }

  return { errors, warnings, nodeEnv };
}
