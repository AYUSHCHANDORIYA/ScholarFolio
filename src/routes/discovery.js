const express = require('express');
const { db } = require('../db/database');
const { requireAuth, requireRole } = require('../middleware/auth');
const { getFullPortfolio } = require('./portfolio');

const router = express.Router();

router.get('/facets', (_req, res) => {
  const skills = db
    .prepare(`
      SELECT s.name, COUNT(DISTINCT s.user_id) AS student_count
      FROM skills s
      JOIN profiles p ON p.user_id = s.user_id
      WHERE p.is_public = 1
      GROUP BY s.name
      ORDER BY student_count DESC, s.name ASC
      LIMIT 30
    `)
    .all();

  const departments = db
    .prepare(`
      SELECT DISTINCT department
      FROM profiles
      WHERE is_public = 1 AND department != ''
      ORDER BY department ASC
    `)
    .all()
    .map((r) => r.department);

  const graduationYears = db
    .prepare(`
      SELECT DISTINCT graduation_year
      FROM profiles
      WHERE is_public = 1 AND graduation_year IS NOT NULL
      ORDER BY graduation_year ASC
    `)
    .all()
    .map((r) => r.graduation_year);

  const stats = db
    .prepare(`
      SELECT
        (SELECT COUNT(*) FROM profiles WHERE is_public = 1) AS total_students,
        (SELECT COUNT(*) FROM projects) AS total_projects,
        (SELECT COUNT(*) FROM certificates WHERE status = 'verified') AS verified_certificates,
        (SELECT COUNT(DISTINCT name) FROM skills) AS unique_skills
    `)
    .get();

  return res.json({ skills, departments, graduationYears, stats });
});

router.get('/students', (req, res) => {
  const { q = '', skill = '', department = '', gradYear = '', minGpa = '', verifiedOnly = '', sort = 'gpa' } =
    req.query;

  const rows = db
    .prepare(`
      SELECT
        u.id, u.full_name, u.email,
        p.slug, p.headline, p.bio, p.university, p.department,
        p.graduation_year, p.gpa, p.location, p.avatar_url,
        (SELECT COUNT(*) FROM projects pr WHERE pr.user_id = u.id) AS project_count,
        (SELECT COUNT(*) FROM certificates c WHERE c.user_id = u.id AND c.status = 'verified') AS verified_cert_count,
        (SELECT COUNT(*) FROM activities a WHERE a.user_id = u.id) AS activity_count
      FROM users u
      JOIN profiles p ON p.user_id = u.id
      WHERE u.role = 'student' AND p.is_public = 1
    `)
    .all();

  const skillsByUser = new Map();
  const allSkills = db.prepare('SELECT user_id, name, category, proficiency FROM skills ORDER BY proficiency DESC').all();
  for (const s of allSkills) {
    if (!skillsByUser.has(s.user_id)) skillsByUser.set(s.user_id, []);
    skillsByUser.get(s.user_id).push(s);
  }

  const queryLower = String(q).trim().toLowerCase();
  const requestedSkills = String(skill)
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

  let results = rows.map((row) => ({
    ...row,
    skills: skillsByUser.get(row.id) || []
  }));

  if (queryLower) {
    results = results.filter((st) => {
      const haystack = [
        st.full_name,
        st.headline,
        st.bio,
        st.university,
        st.department,
        ...st.skills.map((s) => s.name)
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(queryLower);
    });
  }

  if (requestedSkills.length > 0) {
    results = results.filter((st) => {
      const studentSkills = st.skills.map((s) => s.name.toLowerCase());
      return requestedSkills.every((reqSkill) =>
        studentSkills.some((ss) => ss.includes(reqSkill))
      );
    });
  }

  if (department) {
    results = results.filter((st) => st.department === department);
  }

  if (gradYear) {
    results = results.filter((st) => String(st.graduation_year) === String(gradYear));
  }

  if (minGpa) {
    const min = Number(minGpa);
    if (!Number.isNaN(min)) {
      results = results.filter((st) => (st.gpa || 0) >= min);
    }
  }

  if (verifiedOnly === 'true' || verifiedOnly === '1') {
    results = results.filter((st) => st.verified_cert_count > 0);
  }

  if (sort === 'projects') {
    results.sort((a, b) => b.project_count - a.project_count || (b.gpa || 0) - (a.gpa || 0));
  } else if (sort === 'verified') {
    results.sort((a, b) => b.verified_cert_count - a.verified_cert_count || (b.gpa || 0) - (a.gpa || 0));
  } else {
    results.sort((a, b) => (b.gpa || 0) - (a.gpa || 0) || b.project_count - a.project_count);
  }

  return res.json({ students: results });
});

router.get('/students/:slug', (req, res) => {
  const profile = db.prepare('SELECT user_id, is_public FROM profiles WHERE slug = ?').get(req.params.slug);
  if (!profile || !profile.is_public) {
    return res.status(404).json({ error: 'Student portfolio not found' });
  }
  const full = getFullPortfolio(profile.user_id);
  return res.json(full);
});

router.post('/students/:slug/endorse', requireAuth, requireRole('evaluator', 'admin'), (req, res) => {
  const profile = db.prepare('SELECT user_id FROM profiles WHERE slug = ?').get(req.params.slug);
  if (!profile) {
    return res.status(404).json({ error: 'Student not found' });
  }

  const { comment, rating, evaluator_role } = req.body || {};
  if (!comment || !String(comment).trim()) {
    return res.status(400).json({ error: 'Endorsement comment is required' });
  }

  const safeRating = Math.min(5, Math.max(1, Number(rating) || 5));
  const info = db
    .prepare(`
      INSERT INTO endorsements (student_id, evaluator_name, evaluator_role, comment, rating)
      VALUES (?, ?, ?, ?, ?)
    `)
    .run(
      profile.user_id,
      req.user.full_name,
      String(evaluator_role || 'Faculty / Evaluator').trim(),
      String(comment).trim(),
      safeRating
    );

  const created = db.prepare('SELECT * FROM endorsements WHERE id = ?').get(info.lastInsertRowid);
  return res.status(201).json(created);
});

module.exports = router;
