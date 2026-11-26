const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { DatabaseSync } = require('node:sqlite');

const DATA_DIR = path.join(__dirname, '..', '..', 'data');
const DB_PATH = path.join(DATA_DIR, 'portfolio.db');
const SCHEMA_PATH = path.join(__dirname, 'schema.sql');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const db = new DatabaseSync(DB_PATH);

function initDatabase() {
  const schema = fs.readFileSync(SCHEMA_PATH, 'utf8');
  db.exec(schema);
}

function generateSlug(name, suffix = '') {
  const base = String(name || 'student')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'student';
  return suffix ? `${base}-${suffix}` : base;
}

function generateCredentialId() {
  const year = new Date().getFullYear();
  const code = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `CERT-${year}-${code}`;
}

function generateVerificationHash(payload) {
  return crypto
    .createHash('sha256')
    .update(JSON.stringify(payload))
    .digest('hex');
}

initDatabase();

module.exports = {
  db,
  DB_PATH,
  initDatabase,
  generateSlug,
  generateCredentialId,
  generateVerificationHash
};
