const path = require('node:path');
const express = require('express');
const { seedIfEmpty } = require('./db/seed');
const { UPLOAD_DIR } = require('./middleware/upload');

const authRoutes = require('./routes/auth');
const { router: portfolioRoutes } = require('./routes/portfolio');
const discoveryRoutes = require('./routes/discovery');
const verifyRoutes = require('./routes/verify');

const app = express();
const PORT = Number(process.env.PORT) || 3000;

seedIfEmpty();

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  return next();
});

app.use(express.json({ limit: '2mb' }));
app.use('/uploads', express.static(UPLOAD_DIR));
app.use(express.static(path.join(__dirname, '..', 'public')));

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'Digital Student Portfolio & Achievement Showcase' });
});

app.use('/api/auth', authRoutes);
app.use('/api/portfolio', portfolioRoutes);
app.use('/api/discovery', discoveryRoutes);
app.use('/api/verify', verifyRoutes);

app.use((err, _req, res, _next) => {
  const status = err.status || 400;
  res.status(status).json({ error: err.message || 'Unexpected server error' });
});

app.get('/{*splat}', (req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  return res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`ScholarFolio server running at http://localhost:${PORT}`);
  });
}

module.exports = app;
