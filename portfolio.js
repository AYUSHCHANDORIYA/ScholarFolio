const express = require('express');
const {
  db,
  generateCredentialId,
  generateVerificationHash
} = require('../db/database');
const { requireAuth } = require('../middleware/auth');
const { upload } = require('../middleware/upload');

const router = express.Router();

function getFullPortfolio(userId) {
  const user = db
    .prepare('SELECT id, full_name, email, role, created_at FROM users WHERE id = ?')
    .get(userId);
  if (!user) return null;

  const profile = db.prepare('SELECT * FROM profiles WHERE user_id = ?').get(userId);
  const skills = db
    .prepare('SELECT * FROM skills WHERE user_id = ? ORDER BY proficiency DESC, name ASC')
    .all(userId);
  const academics = db
    .prepare('SELECT * FROM academics WHERE user_id = ? ORDER BY start_year DESC')
    .all(userId);
  const projects = db
    .prepare('SELECT * FROM projects WHERE user_id = ? ORDER BY featured DESC, completed_date DESC, id DESC')
    .all(userId);
  const certificates = db
    .prepare('SELECT * FROM certificates WHERE user_id = ? ORDER BY issue_date DESC, id DESC')
    .all(userId);
  const activities = db
    .prepare('SELECT * FROM activities WHERE user_id = ? ORDER BY start_date DESC, id DESC')
    .all(userId);
  const endorsements = db
    .prepare('SELECT * FROM endorsements WHERE student_id = ? ORDER BY created_at DESC')
    .all(userId);

  return {
    user,
    profile,
    skills,
    academics,
    projects,
    certificates,
    activities,
    endorsements
  };
}

router.use(requireAuth);

router.get('/me', (req, res) => {
  const portfolio = getFullPortfolio(req.user.id);
  if (!portfolio) return res.status(404).json({ error: 'Portfolio not found' });
  return res.json(portfolio);
});

router.post('/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  return res.json({ url: `/uploads/${req.file.filename}` });
});

router.put('/profile', (req, res) => {
  const {
    full_name,
    headline,
    bio,
    university,
    department,
    graduation_year,
    gpa,
    location,
    github_url,
    linkedin_url,
    website_url,
    avatar_url,
    is_public
  } = req.body || {};

  if (full_name && String(full_name).trim()) {
    db.prepare('UPDATE users SET full_name = ? WHERE id = ?').run(
      String(full_name).trim(),
      req.user.id
    );
  }

  db.prepare(`
    UPDATE profiles SET
      headline = ?,
      bio = ?,
      university = ?,
      department = ?,
      graduation_year = ?,
      gpa = ?,
      location = ?,
      github_url = ?,
      linkedin_url = ?,
      website_url = ?,
      avatar_url = ?,
      is_public = ?,
      updated_at = datetime('now')
    WHERE user_id = ?
  `).run(
    String(headline || '').trim(),
    String(bio || '').trim(),
    String(university || '').trim(),
    String(department || '').trim(),
    graduation_year ? Number(graduation_year) : null,
    gpa !== '' && gpa !== null && gpa !== undefined ? Number(gpa) : null,
    String(location || '').trim(),
    String(github_url || '').trim(),
    String(linkedin_url || '').trim(),
    String(website_url || '').trim(),
    String(avatar_url || '').trim(),
    is_public === 0 || is_public === false ? 0 : 1,
    req.user.id
  );

  return res.json(getFullPortfolio(req.user.id));
});

// --- Skills ---
router.post('/skills', (req, res) => {
  const { name, category, proficiency } = req.body || {};
  if (!name || !String(name).trim()) {
    return res.status(400).json({ error: 'Skill name is required' });
  }
  const cat = ['Technical', 'Design', 'Leadership', 'Research', 'Language'].includes(category)
    ? category
    : 'Technical';
  const prof = Math.min(100, Math.max(1, Number(proficiency) || 75));

  const info = db
    .prepare('INSERT INTO skills (user_id, name, category, proficiency) VALUES (?, ?, ?, ?)')
    .run(req.user.id, String(name).trim(), cat, prof);

  const item = db.prepare('SELECT * FROM skills WHERE id = ?').get(info.lastInsertRowid);
  return res.status(201).json(item);
});

router.delete('/skills/:id', (req, res) => {
  const info = db
    .prepare('DELETE FROM skills WHERE id = ? AND user_id = ?')
    .run(Number(req.params.id), req.user.id);
  if (info.changes === 0) return res.status(404).json({ error: 'Skill not found' });
  return res.json({ deleted: true });
});

// --- Academics ---
router.post('/academics', (req, res) => {
  const { institution, degree, field_of_study, start_year, end_year, grade, honors, description } =
    req.body || {};
  if (!institution || !degree || !start_year) {
    return res.status(400).json({ error: 'Institution, degree, and start year are required' });
  }
  const info = db
    .prepare(`
      INSERT INTO academics (user_id, institution, degree, field_of_study, start_year, end_year, grade, honors, description)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    .run(
      req.user.id,
      String(institution).trim(),
      String(degree).trim(),
      String(field_of_study || '').trim(),
      Number(start_year),
      end_year ? Number(end_year) : null,
      String(grade || '').trim(),
      String(honors || '').trim(),
      String(description || '').trim()
    );
  const item = db.prepare('SELECT * FROM academics WHERE id = ?').get(info.lastInsertRowid);
  return res.status(201).json(item);
});

router.delete('/academics/:id', (req, res) => {
  const info = db
    .prepare('DELETE FROM academics WHERE id = ? AND user_id = ?')
    .run(Number(req.params.id), req.user.id);
  if (info.changes === 0) return res.status(404).json({ error: 'Academic record not found' });
  return res.json({ deleted: true });
});

// --- Projects ---
router.post('/projects', (req, res) => {
  const { title, summary, description, tech_stack, repo_url, live_url, image_url, featured, completed_date } =
    req.body || {};
  if (!title || !String(title).trim()) {
    return res.status(400).json({ error: 'Project title is required' });
  }
  const info = db
    .prepare(`
      INSERT INTO projects (user_id, title, summary, description, tech_stack, repo_url, live_url, image_url, featured, completed_date)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    .run(
      req.user.id,
      String(title).trim(),
      String(summary || '').trim(),
      String(description || '').trim(),
      String(tech_stack || '').trim(),
      String(repo_url || '').trim(),
      String(live_url || '').trim(),
      String(image_url || '').trim(),
      featured ? 1 : 0,
      String(completed_date || '').trim()
    );
  const item = db.prepare('SELECT * FROM projects WHERE id = ?').get(info.lastInsertRowid);
  return res.status(201).json(item);
});

router.delete('/projects/:id', (req, res) => {
  const info = db
    .prepare('DELETE FROM projects WHERE id = ? AND user_id = ?')
    .run(Number(req.params.id), req.user.id);
  if (info.changes === 0) return res.status(404).json({ error: 'Project not found' });
  return res.json({ deleted: true });
});

// --- Certificates ---
router.post('/certificates', (req, res) => {
  const { title, issuer, issue_date, expiry_date, file_url, description } = req.body || {};
  if (!title || !issuer || !issue_date) {
    return res.status(400).json({ error: 'Certificate title, issuer, and issue date are required' });
  }

  let credentialId = generateCredentialId();
  while (db.prepare('SELECT id FROM certificates WHERE credential_id = ?').get(credentialId)) {
    credentialId = generateCredentialId();
  }

  const verificationHash = generateVerificationHash({
    user: req.user.id,
    title: String(title).trim(),
    issuer: String(issuer).trim(),
    issue_date: String(issue_date).trim(),
    credentialId,
    ts: Date.now()
  });

  const info = db
    .prepare(`
      INSERT INTO certificates (
        user_id, title, issuer, issue_date, expiry_date, credential_id, verification_hash, file_url, status, description
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)
    `)
    .run(
      req.user.id,
      String(title).trim(),
      String(issuer).trim(),
      String(issue_date).trim(),
      String(expiry_date || '').trim(),
      credentialId,
      verificationHash,
      String(file_url || '').trim(),
      String(description || '').trim()
    );

  const item = db.prepare('SELECT * FROM certificates WHERE id = ?').get(info.lastInsertRowid);
  return res.status(201).json(item);
});

router.delete('/certificates/:id', (req, res) => {
  const info = db
    .prepare('DELETE FROM certificates WHERE id = ? AND user_id = ?')
    .run(Number(req.params.id), req.user.id);
  if (info.changes === 0) return res.status(404).json({ error: 'Certificate not found' });
  return res.json({ deleted: true });
});

// --- Extracurricular Activities ---
router.post('/activities', (req, res) => {
  const { title, organization, role, category, start_date, end_date, impact, description } =
    req.body || {};
  if (!title || !organization) {
    return res.status(400).json({ error: 'Activity title and organization are required' });
  }
  const cat = ['Club', 'Hackathon', 'Volunteering', 'Sports', 'Competition', 'Publication'].includes(category)
    ? category
    : 'Club';

  const info = db
    .prepare(`
      INSERT INTO activities (user_id, title, organization, role, category, start_date, end_date, impact, description)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    .run(
      req.user.id,
      String(title).trim(),
      String(organization).trim(),
      String(role || '').trim(),
      cat,
      String(start_date || '').trim(),
      String(end_date || '').trim(),
      String(impact || '').trim(),
      String(description || '').trim()
    );
  const item = db.prepare('SELECT * FROM activities WHERE id = ?').get(info.lastInsertRowid);
  return res.status(201).json(item);
});

router.delete('/activities/:id', (req, res) => {
  const info = db
    .prepare('DELETE FROM activities WHERE id = ? AND user_id = ?')
    .run(Number(req.params.id), req.user.id);
  if (info.changes === 0) return res.status(404).json({ error: 'Activity not found' });
  return res.json({ deleted: true });
});

module.exports = { router, getFullPortfolio };
