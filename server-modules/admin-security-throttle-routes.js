export function registerAdminSecurityThrottleRoutes({ app, pool, verifyAdmin, sanitizeString }) {
  app.get('/api/admin/security/throttle', verifyAdmin, async (req, res) => {
    try {
      const page = Math.max(1, Number.parseInt(String(req.query.page || '1'), 10) || 1);
      const limit = Math.min(100, Math.max(1, Number.parseInt(String(req.query.limit || '20'), 10) || 20));
      const offset = (page - 1) * limit;
      const namespaceRaw = sanitizeString(req.query.namespace, 30).toLowerCase();
      const namespace = ['admin', 'member'].includes(namespaceRaw) ? namespaceRaw : '';
      const ip = sanitizeString(req.query.ip, 80);
      const username = sanitizeString(req.query.username, 120).toLowerCase();
      const blockedOnly = String(req.query.blockedOnly || '').toLowerCase() === 'true';
      const sortByRaw = sanitizeString(req.query.sortBy, 40);
      const sortDirRaw = sanitizeString(req.query.sortDir, 10).toLowerCase();
      const sortDir = sortDirRaw === 'asc' ? 'ASC' : 'DESC';
      const sortColumnMap = {
        namespace: 'namespace',
        ip: 'ip',
        username: 'username',
        failures: 'failures',
        blockedSeconds: 'blocked_until',
        updatedAt: 'updated_at'
      };
      const sortBy = Object.prototype.hasOwnProperty.call(sortColumnMap, sortByRaw)
        ? sortByRaw
        : 'updatedAt';
      const sortColumn = sortColumnMap[sortBy] || 'updated_at';
      const orderSql =
        sortColumn === 'blocked_until'
          ? `ORDER BY blocked_until ${sortDir} NULLS LAST, updated_at DESC`
          : `ORDER BY ${sortColumn} ${sortDir}, updated_at DESC`;

      const where = [];
      const params = [];
      if (namespace) {
        params.push(namespace);
        where.push(`namespace = $${params.length}`);
      }
      if (ip) {
        params.push(ip);
        where.push(`ip = $${params.length}`);
      }
      if (username) {
        params.push(`%${username}%`);
        where.push(`username LIKE $${params.length}`);
      }
      if (blockedOnly) {
        where.push('blocked_until IS NOT NULL AND blocked_until > NOW()');
      }
      const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

      const countRes = await pool.query(
        `SELECT COUNT(*)::int AS total FROM auth_login_throttle ${whereSql}`,
        params
      );
      const total = countRes.rows[0]?.total || 0;

      const listParams = [...params, limit, offset];
      const rowsRes = await pool.query(
        `SELECT
           key,
           namespace,
           ip,
           username,
           failures,
           window_start AS "windowStart",
           blocked_until AS "blockedUntil",
           updated_at AS "updatedAt",
           GREATEST(0, EXTRACT(EPOCH FROM (blocked_until - NOW())))::int AS "retryAfterSeconds"
         FROM auth_login_throttle
         ${whereSql}
         ${orderSql}
         LIMIT $${listParams.length - 1} OFFSET $${listParams.length}`,
        listParams
      );

      return res.json({
        page,
        limit,
        total,
        hasNextPage: offset + rowsRes.rows.length < total,
        filters: {
          namespace: namespace || null,
          ip: ip || null,
          username: username || null,
          blockedOnly
        },
        sort: {
          by: sortBy,
          dir: sortDir.toLowerCase()
        },
        items: rowsRes.rows.map((row) => ({
          ...row,
          retryAfterSeconds: row.retryAfterSeconds > 0 ? row.retryAfterSeconds : 0
        }))
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Server error' });
    }
  });

  app.delete('/api/admin/security/throttle/:key', verifyAdmin, async (req, res) => {
    try {
      const key = sanitizeString(req.params.key, 400);
      if (!key) return res.status(400).json({ message: 'Clé invalide.' });

      const deleted = await pool.query(
        'DELETE FROM auth_login_throttle WHERE key = $1 RETURNING key',
        [key]
      );
      if (!deleted.rows.length) {
        return res.status(404).json({ message: 'Entrée introuvable.' });
      }
      return res.json({ message: 'Entrée supprimée.', key });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Server error' });
    }
  });

  app.delete('/api/admin/security/throttle', verifyAdmin, async (req, res) => {
    try {
      const namespaceRaw = sanitizeString(req.query.namespace, 30).toLowerCase();
      const namespace = ['admin', 'member'].includes(namespaceRaw) ? namespaceRaw : '';
      const ip = sanitizeString(req.query.ip, 80);
      const username = sanitizeString(req.query.username, 120).toLowerCase();
      const blockedOnly = String(req.query.blockedOnly || '').toLowerCase() === 'true';
      const olderThanMinutes = Math.max(
        0,
        Number.parseInt(String(req.query.olderThanMinutes || '0'), 10) || 0
      );

      const where = [];
      const params = [];
      if (namespace) {
        params.push(namespace);
        where.push(`namespace = $${params.length}`);
      }
      if (ip) {
        params.push(ip);
        where.push(`ip = $${params.length}`);
      }
      if (username) {
        params.push(`%${username}%`);
        where.push(`username LIKE $${params.length}`);
      }
      if (blockedOnly) {
        where.push('blocked_until IS NOT NULL AND blocked_until > NOW()');
      }
      if (olderThanMinutes > 0) {
        params.push(olderThanMinutes);
        where.push(`updated_at < NOW() - ($${params.length} * INTERVAL '1 minute')`);
      }

      if (!where.length) {
        return res.status(400).json({
          message: 'Purge refusee sans filtre. Fournir au moins un filtre.'
        });
      }

      const whereSql = `WHERE ${where.join(' AND ')}`;
      const result = await pool.query(
        `DELETE FROM auth_login_throttle ${whereSql} RETURNING key`,
        params
      );

      return res.json({
        message: 'Purge terminee.',
        deletedCount: result.rowCount || 0,
        filters: {
          namespace: namespace || null,
          ip: ip || null,
          username: username || null,
          blockedOnly,
          olderThanMinutes: olderThanMinutes || null
        }
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Server error' });
    }
  });
}
