export function registerCandidateScoreRoutes({
  app,
  pool,
  verifyAdmin,
  SCORE_PHASE_PREVIOUS,
  SCORE_PHASE_FINAL_2026,
  toCsv,
  addRankLabels,
  join,
  __dirname,
  PDFDocument,
  formatDateFr,
  forceSyncManualCandidates,
  ensureNotArchived,
  ensureFinalPhaseUnlocked,
  sanitizeString,
  logScoreAudit,
  loadManualCandidates,
  replaceCandidatesFromManualList
}) {
  app.get('/api/admin/export/candidates', verifyAdmin, async (req, res) => {
    try {
      const result = await pool.query(
        'SELECT id, candidateCode, fullName, whatsapp, city, email, phone, status, createdAt FROM candidates ORDER BY id ASC'
      );
      const csv = toCsv(result.rows, [
        'id',
        'candidateCode',
        'fullName',
        'whatsapp',
        'city',
        'email',
        'phone',
        'status',
        'createdAt'
      ]);
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.send(csv);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Server error' });
    }
  });

  app.get('/api/admin/export/ranking', verifyAdmin, async (req, res) => {
    try {
      const result = await pool.query(`
        SELECT c.fullName,
               CAST(COALESCE(SUM(COALESCE(s.compositionScore, 0) + COALESCE(s.questionScore, s.themeScore, 0) + COALESCE(s.pontAsSiratScore, 0) + COALESCE(s.recognitionScore, 0)), 0) AS NUMERIC(10,2)) as totalScore,
               CAST(COALESCE(SUM(COALESCE(s.compositionScore, 0) + COALESCE(s.questionScore, s.themeScore, 0) + COALESCE(s.pontAsSiratScore, 0) + COALESCE(s.recognitionScore, 0)), 0) AS NUMERIC(10,2)) as averageScore,
               COUNT(s.id) as passages
        FROM candidates c
        LEFT JOIN scores s
          ON c.id = s.candidateId
         AND COALESCE(s.scorePhase, '${SCORE_PHASE_PREVIOUS}') = '${SCORE_PHASE_FINAL_2026}'
        GROUP BY c.id, c.fullName
        ORDER BY averageScore DESC NULLS LAST
      `);
      const rows = addRankLabels(result.rows, 'averageScore');
      const csv = toCsv(rows, ['rang', 'fullName', 'averageScore', 'passages']);
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.send(csv);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Server error' });
    }
  });

  app.get('/api/admin/export/candidates-xls', verifyAdmin, async (req, res) => {
    try {
      const result = await pool.query(
        'SELECT id, candidateCode, fullName, whatsapp, city, email, phone, status, createdAt FROM candidates ORDER BY id ASC'
      );
      const rows = result.rows
        .map(
          (r) =>
            `<tr><td>${r.id}</td><td>${r.candidatecode || ''}</td><td>${r.fullname || ''}</td><td>${r.whatsapp || ''}</td><td>${r.city || ''}</td><td>${r.email || ''}</td><td>${r.phone || ''}</td><td>${r.status || ''}</td><td>${r.createdat || ''}</td></tr>`,
        )
        .join('');
      const html = `<table><tr><th>ID</th><th>Code</th><th>Nom</th><th>WhatsApp</th><th>Commune</th><th>Email</th><th>Téléphone</th><th>Statut</th><th>Date</th></tr>${rows}</table>`;
      res.setHeader('Content-Type', 'application/vnd.ms-excel');
      res.send(html);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Server error' });
    }
  });

  app.get('/api/admin/export/ranking-xls', verifyAdmin, async (req, res) => {
    try {
      const result = await pool.query(`
        SELECT c.fullName,
               CAST(COALESCE(SUM(COALESCE(s.compositionScore, 0) + COALESCE(s.questionScore, s.themeScore, 0) + COALESCE(s.pontAsSiratScore, 0) + COALESCE(s.recognitionScore, 0)), 0) AS NUMERIC(10,2)) as totalScore,
               CAST(COALESCE(SUM(COALESCE(s.compositionScore, 0) + COALESCE(s.questionScore, s.themeScore, 0) + COALESCE(s.pontAsSiratScore, 0) + COALESCE(s.recognitionScore, 0)), 0) AS NUMERIC(10,2)) as averageScore,
               COUNT(s.id) as passages
        FROM candidates c
        LEFT JOIN scores s
          ON c.id = s.candidateId
         AND COALESCE(s.scorePhase, '${SCORE_PHASE_PREVIOUS}') = '${SCORE_PHASE_FINAL_2026}'
        GROUP BY c.id, c.fullName
        ORDER BY averageScore DESC NULLS LAST
      `);
      const rows = addRankLabels(result.rows, 'averageScore')
        .map(
          (r) =>
            `<tr><td>${r.rang || ''}</td><td>${r.fullName || r.fullname || ''}</td><td>${r.averageScore ?? r.averagescore ?? ''}</td><td>${r.passages || ''}</td></tr>`,
        )
        .join('');
      const html = `<table><tr><th>Rang</th><th>Nom</th><th>Total</th><th>Passages</th></tr>${rows}</table>`;
      res.setHeader('Content-Type', 'application/vnd.ms-excel');
      res.send(html);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Server error' });
    }
  });

  app.get('/api/admin/export/ranking-official-pdf', verifyAdmin, async (req, res) => {
    try {
      const result = await pool.query(`
        SELECT c.fullName as "fullName",
               CAST(COALESCE(SUM(COALESCE(s.compositionScore, 0) + COALESCE(s.questionScore, s.themeScore, 0) + COALESCE(s.pontAsSiratScore, 0) + COALESCE(s.recognitionScore, 0)), 0) AS NUMERIC(10,2)) as totalScore,
               COUNT(s.id) as passages
        FROM candidates c
        LEFT JOIN scores s
          ON c.id = s.candidateId
         AND COALESCE(s.scorePhase, '${SCORE_PHASE_PREVIOUS}') = '${SCORE_PHASE_FINAL_2026}'
        GROUP BY c.id, c.fullName
        ORDER BY totalScore DESC NULLS LAST
      `);

      const doc = new PDFDocument({ margin: 40, size: 'A4' });
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename=\"classement-officiel.pdf\"');
      doc.pipe(res);

      const logoPath = join(__dirname, 'public', 'assets', 'logo.jpg');
      try {
        doc.image(logoPath, 40, 30, { width: 70 });
      } catch {}
      doc.fontSize(18).text('Classement Officiel — Quiz Islamique 2026', 120, 40);
      doc.fontSize(11).text(`Date : ${formatDateFr(new Date())}`, 120, 65);

      let y = 110;
      doc.fontSize(11).text('Rang', 40, y);
      doc.text('Candidat', 80, y);
      doc.text('Total', 350, y);
      doc.text('Passages', 450, y);
      y += 10;
      doc.moveTo(40, y).lineTo(555, y).stroke();
      y += 10;

      const rows = addRankLabels(result.rows, 'totalScore');
      rows.forEach((row) => {
        const name = row.fullName || '';
        const total = row.totalScore || 0;
        const passages = row.passages || 0;
        doc.fontSize(10).text(row.rang || '', 40, y);
        doc.text(name, 80, y, { width: 260 });
        doc.text(String(total), 350, y);
        doc.text(String(passages), 450, y);
        y += 16;
        if (y > 760) {
          doc.addPage();
          y = 50;
        }
      });

      doc.moveDown(2);
      doc.text('Signatures', 40, y + 20);
      doc.text('Président', 40, y + 40);
      doc.text('Secrétaire Général', 240, y + 40);

      doc.end();
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Server error' });
    }
  });

  // Admin: force sync manual candidates (fix "Inconnu")
  app.post('/api/admin/sync-manual-candidates', verifyAdmin, async (req, res) => {
    try {
      const count = await forceSyncManualCandidates();
      res.json({ message: 'Synchronisation terminée.', count });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Server error' });
    }
  });

  // Admin scores (notation)
  app.post('/api/admin/scores', verifyAdmin, async (req, res) => {
    try {
      if (!(await ensureNotArchived(res))) return;
      if (!(await ensureFinalPhaseUnlocked(res))) return;
      const {
        candidateId,
        judgeName,
        compositionScore,
        questionScore,
        themeScore,
        pontAsSiratScore,
        recognitionScore,
        notes
      } = req.body || {};
      if (!candidateId || !judgeName) {
        return res.status(400).json({ message: 'ID candidat et nom du juge requis.' });
      }

      const cleanJudge = sanitizeString(judgeName, 100);
      const candidate = await pool.query('SELECT id, fullName FROM candidates WHERE id = $1', [candidateId]);
      if (candidate.rows.length === 0) {
        return res.status(404).json({ message: 'Candidat introuvable.' });
      }

      const duplicate = await pool.query(
        `SELECT id
         FROM scores
         WHERE candidateId = $1
           AND COALESCE(scorePhase, $2) = $3
           AND LOWER(TRIM(judgeName)) = LOWER(TRIM($4))
         LIMIT 1`,
        [candidateId, SCORE_PHASE_PREVIOUS, SCORE_PHASE_FINAL_2026, cleanJudge]
      );
      if (duplicate.rows.length) {
        return res.status(409).json({ message: 'Ce juge a déjà noté ce candidat pour cette phase.' });
      }

      await pool.query(
        `INSERT INTO scores (candidateId, judgeName, compositionScore, questionScore, themeScore, pontAsSiratScore, recognitionScore, notes, scorePhase)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          candidateId,
          cleanJudge,
          Number(compositionScore || 0),
          Number(questionScore || themeScore || 0),
          Number(questionScore || themeScore || 0),
          Number(pontAsSiratScore || 0),
          Number(recognitionScore || 0),
          sanitizeString(notes, 500),
          SCORE_PHASE_FINAL_2026,
        ]
      );
      await logScoreAudit('score_created', {
        candidateId: Number(candidateId),
        judgeName: cleanJudge,
        phase: SCORE_PHASE_FINAL_2026,
      }, req);

      res.status(201).json({
        message: 'Note enregistrée.',
        candidateName: candidate.rows[0].fullName
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Server error' });
    }
  });

  app.get('/api/admin/scores', verifyAdmin, async (req, res) => {
    try {
      const result = await pool.query(
        `SELECT s.id,
                s.candidateId,
                c.fullName as "fullName",
                s.judgeName as "judgeName",
                s.compositionScore as "compositionScore",
                s.questionScore as "questionScore",
                s.themeScore as "themeScore",
                s.pontAsSiratScore as "pontAsSiratScore",
                s.recognitionScore as "recognitionScore",
                s.scorePhase as "scorePhase",
                s.notes,
                s.createdAt as "createdAt"
         FROM scores s
         LEFT JOIN candidates c ON c.id = s.candidateId
         WHERE COALESCE(s.scorePhase, $1) = $2
         ORDER BY s.id DESC
         LIMIT 500`,
        [SCORE_PHASE_PREVIOUS, SCORE_PHASE_FINAL_2026]
      );
      res.json({ items: result.rows || [] });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Server error' });
    }
  });

  app.delete('/api/admin/scores/:id', verifyAdmin, async (req, res) => {
    try {
      if (!(await ensureNotArchived(res))) return;
      if (!(await ensureFinalPhaseUnlocked(res))) return;
      const scoreId = Number(req.params.id);
      if (!Number.isFinite(scoreId)) {
        return res.status(400).json({ error: 'Invalid score id' });
      }
      const result = await pool.query(
        `DELETE FROM scores
         WHERE id = $1
           AND COALESCE(scorePhase, $2) = $3`,
        [scoreId, SCORE_PHASE_PREVIOUS, SCORE_PHASE_FINAL_2026]
      );
      if (result.rowCount === 0) {
        return res.status(404).json({ error: 'Score not found' });
      }
      await logScoreAudit('score_deleted', { scoreId }, req);
      res.json({ message: 'Note supprimée.' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Server error' });
    }
  });

  app.get('/api/admin/candidates/:id/scores', verifyAdmin, async (req, res) => {
    try {
      const candidateId = Number(req.params.id);
      if (!Number.isFinite(candidateId)) {
        return res.status(400).json({ error: 'Invalid candidate id' });
      }
      const result = await pool.query(
        `SELECT id,
                judgeName as "judgeName",
                compositionScore as "compositionScore",
                questionScore as "questionScore",
                themeScore as "themeScore",
                pontAsSiratScore as "pontAsSiratScore",
                recognitionScore as "recognitionScore",
                scorePhase as "scorePhase",
                notes,
                createdAt as "createdAt"
         FROM scores
         WHERE candidateId = $1
           AND COALESCE(scorePhase, $2) = $3
         ORDER BY createdAt DESC`,
        [candidateId, SCORE_PHASE_PREVIOUS, SCORE_PHASE_FINAL_2026]
      );
      res.json({ items: result.rows || [] });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Server error' });
    }
  });

  app.get('/api/admin/candidates/:id', verifyAdmin, async (req, res) => {
    try {
      const candidateId = Number(req.params.id);
      if (!Number.isFinite(candidateId)) {
        return res.status(400).json({ error: 'Invalid candidate id' });
      }
      const result = await pool.query('SELECT id, fullName FROM candidates WHERE id = $1', [candidateId]);
      if (result.rows.length === 0) {
        return res.status(404).json({ message: 'Candidat introuvable.' });
      }
      res.json(result.rows[0]);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Server error' });
    }
  });

  app.get('/api/admin/candidates/:id/status-history', verifyAdmin, async (req, res) => {
    try {
      const candidateId = Number(req.params.id);
      if (!Number.isFinite(candidateId)) {
        return res.status(400).json({ error: 'Invalid candidate id' });
      }
      const result = await pool.query(
        `SELECT oldStatus, newStatus, ip, changedAt
         FROM candidate_status_history
         WHERE candidateId = $1
         ORDER BY changedAt DESC
         LIMIT 50`,
        [candidateId]
      );
      res.json({ items: result.rows || [] });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Server error' });
    }
  });

  app.get('/api/admin/candidates/:id/pdf', verifyAdmin, async (req, res) => {
    try {
      const candidateId = Number(req.params.id);
      if (!Number.isFinite(candidateId)) {
        return res.status(400).json({ error: 'Invalid candidate id' });
      }
      const candidateRes = await pool.query(
        'SELECT id, fullName, city, whatsapp, phone, email, status FROM candidates WHERE id = $1',
        [candidateId]
      );
      if (!candidateRes.rows.length) {
        return res.status(404).json({ error: 'Candidat introuvable' });
      }
      const candidate = candidateRes.rows[0];
      const scoresRes = await pool.query(
        `SELECT judgeName, compositionScore, questionScore, themeScore, pontAsSiratScore, recognitionScore, notes, createdAt
         FROM scores
         WHERE candidateId = $1
           AND COALESCE(scorePhase, $2) = $3
         ORDER BY createdAt DESC`,
        [candidateId, SCORE_PHASE_PREVIOUS, SCORE_PHASE_FINAL_2026]
      );
      const doc = new PDFDocument({ margin: 40, size: 'A4' });
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="candidat-${candidateId}.pdf"`);
      doc.pipe(res);

      const logoPath = join(__dirname, 'public', 'assets', 'logo.jpg');
      try {
        doc.image(logoPath, 40, 30, { width: 70 });
      } catch {}
      doc.fontSize(18).text('Fiche Candidat — Quiz Islamique 2026', 120, 40);
      doc.fontSize(11).text(`Date : ${formatDateFr(new Date())}`, 120, 65);

      doc.moveDown(2);
      doc.fontSize(12).text(`Nom : ${candidate.fullname || candidate.fullName || ''}`);
      doc.text(`Commune : ${candidate.city || ''}`);
      doc.text(`WhatsApp : ${candidate.whatsapp || ''}`);
      doc.text(`Téléphone : ${candidate.phone || ''}`);
      doc.text(`Email : ${candidate.email || ''}`);
      doc.text(`Statut : ${candidate.status || ''}`);

      doc.moveDown();
      doc.fontSize(13).text('Historique des notes', { underline: true });
      doc.moveDown(0.5);

      scoresRes.rows.forEach((s) => {
        const total =
          Number(s.compositionscore || s.compositionScore || 0) +
          Number(s.questionscore || s.questionScore || s.themescore || s.themeScore || 0) +
          Number(s.pontassiratscore || s.pontAsSiratScore || 0) +
          Number(s.recognitionscore || s.recognitionScore || 0);
        const date = s.createdat || s.createdAt ? new Date(s.createdat || s.createdAt).toLocaleString('fr-FR') : '';
        doc.fontSize(10).text(`${date} — Juge: ${s.judgename || s.judgeName || ''} — Total: ${total}`);
        if (s.notes) doc.text(`Notes: ${s.notes}`);
        doc.moveDown(0.5);
      });

      doc.end();
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Server error' });
    }
  });

  app.post('/api/admin/replace-candidates', verifyAdmin, async (req, res) => {
    try {
      const manualCandidates = loadManualCandidates();
      if (!manualCandidates.length) {
        return res.status(400).json({ message: 'Liste officielle introuvable.' });
      }
      const inserted = await replaceCandidatesFromManualList(manualCandidates);
      res.json({ message: 'Liste remplacée.', inserted });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Server error' });
    }
  });
}
