const express = require('express');
const bcrypt = require('bcryptjs');
const { db, generateSlug } = require('../db/database');
const { signToken, requireAuth } = require('../middleware/auth');

const router = express.Router();

router.post('/register', (req, res) => {
  const { full_name, email, password, role, university, department, graduation_year } = req.body || {};
  if (!full_name || !email || !password) {
    return res.status(400).json({ error: 'Full name, email, and password are required.' });
  }
  if (String(password).length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters.' });
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(normalizedEmail);
  if (existing) {
    return res.status(409).json({ error: 'An account with this email already exists.' });
  }

  const userRole = role === 'evaluator' ? 'evaluator' : 'student';
  const passwordHash = bcrypt.hashSync(String(password), 10);

  const info = db
    .prepare('INSERT INTO users (full_name, email, password_hash, role) VALUES (?, ?, ?, ?)')
    .run(String(full_name).trim(), normalizedEmail, passwordHash, userRole);

  const userId = Number(info.lastInsertRowid);
  let slug = generateSlug(full_name);
  const slugConflict = db.prepare('SELECT user_id FROM profiles WHERE slug = ?').get(slug);
  if (slugConflict) {
    slug = generateSlug(full_name, userId);
  }

  if (userRole === 'student') {
    db.prepare(`
      INSERT INTO profiles (user_id, slug, headline, university, department, graduation_year, is_public)
      VALUES (?, ?, ?, ?, ?, ?, 1)
    `).run(
      userId,
      slug,
      'Student Portfolio',
      String(university || '').trim(),
      String(department || '').trim(),
      graduation_year ? Number(graduation_year) : null
    );
  }

  const user = db.prepare('SELECT id, full_name, email, role, created_at FROM users WHERE id = ?').get(userId);
  const profile = db.prepare('SELECT * FROM profiles WHERE user_id = ?').get(userId) || null;
  const token = signToken(user);

  return res.status(201).json({ token, user, profile });
});

router.post('/login', (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(normalizedEmail);
  if (!user || !bcrypt.compareSync(String(password), user.password_hash)) {
    return res.status(401).json({ error: 'Invalid email or password.' });
  }

  const profile = db.prepare('SELECT * FROM profiles WHERE user_id = ?').get(user.id) || null;
  const safeUser = {
    id: user.id,
    full_name: user.full_name,
    email: user.email,
    role: user.role,
    created_at: user.created_at
  };

  return res.json({ token: signToken(safeUser), user: safeUser, profile });
});

router.get('/me', requireAuth, (req, res) => {
  const user = db
    .prepare('SELECT id, full_name, email, role, created_at FROM users WHERE id = ?')
    .get(req.user.id);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  const profile = db.prepare('SELECT * FROM profiles WHERE user_id = ?').get(user.id) || null;
  return res.json({ user, profile });
});

module.exports = router;
