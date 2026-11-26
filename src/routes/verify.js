const express = require('express');
const { db } = require('../db/database');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

// Public verification lookup by Credential ID or SHA-256 verification hash
router.get('/lookup/:code', (req, res) => {
  const code = String(req.params.code || '').trim();
  if (!code) {
    return res.status(400).json({ error: 'Credential ID or verification hash is required' });
  }

  const cert = db
    .prepare(`
      SELECT
        c.*,
        u.full_name AS student_name,
        u.email AS student_email,
        p.slug AS student_slug,
        p.university AS student_university,
        p.department AS student_department
      FROM certificates c
      JOIN users u ON u.id = c.user_id
      LEFT JOIN profiles p ON p.user_id = u.id
      WHERE UPPER(c.credential_id) = UPPER(?) OR LOWER(c.verification_hash) = LOWER(?)
    `)
    .get(code, code);

  if (!cert) {
    return res.status(404).json({
      verified: false,
      error: 'No certificate record found matching that Credential ID or hash.'
    });
  }

  return res.json({
    verified: cert.status === 'verified',
    certificate: cert
  });
});

// Evaluator/Admin queue of pending & recent certificates
router.get('/queue', requireAuth, requireRole('evaluator', 'admin'), (_req, res) => {
  const certificates = db
    .prepare(`
      SELECT
        c.*,
        u.full_name AS student_name,
        p.slug AS student_slug,
        p.university AS student_university
      FROM certificates c
      JOIN users u ON u.id = c.user_id
      LEFT JOIN profiles p ON p.user_id = u.id
      ORDER BY
        CASE c.status WHEN 'pending' THEN 0 WHEN 'verified' THEN 1 ELSE 2 END,
        c.id DESC
    `)
    .all();

  return res.json({ certificates });
});

// Evaluator/Admin approve or revoke certificate
router.post('/:credentialId/status', requireAuth, requireRole('evaluator', 'admin'), (req, res) => {
  const { status } = req.body || {};
  if (!['verified', 'revoked', 'pending'].includes(status)) {
    return res.status(400).json({ error: 'Status must be verified, pending, or revoked' });
  }

  const verifiedAt = status === 'verified' ? new Date().toISOString().slice(0, 10) : '';
  const verifiedBy = status === 'verified' ? req.user.full_name : '';

  const info = db
    .prepare(`
      UPDATE certificates
      SET status = ?, verified_by = ?, verified_at = ?
      WHERE UPPER(credential_id) = UPPER(?)
    `)
    .run(status, verifiedBy, verifiedAt, req.params.credentialId);

  if (info.changes === 0) {
    return res.status(404).json({ error: 'Certificate not found' });
  }

  const updated = db
    .prepare('SELECT * FROM certificates WHERE UPPER(credential_id) = UPPER(?)')
    .get(req.params.credentialId);
  return res.json({ certificate: updated });
});

module.exports = router;
