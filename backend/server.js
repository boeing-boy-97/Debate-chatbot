import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import debateRoutes from './routes/debate.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/debate', debateRoutes);

// Unknown API paths return JSON, not the SPA.
app.use('/api', (_req, res) => {
  res.status(404).json({ error: 'Endpoint not found.' });
});

// If the frontend has been built, serve it from the backend too.
const distDir = path.resolve(__dirname, '../frontend/dist');
if (fs.existsSync(distDir)) {
  app.use(express.static(distDir));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(distDir, 'index.html'));
  });
}

// Central error handler — never leak technical details to the client.
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error('[server error]', err?.message || err);
  res.status(500).json({
    error: 'Something went wrong while contacting the AI. Please try again.',
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Debate AI backend running at http://localhost:${PORT}`);
});
