import express from 'express';
import cors from 'cors';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import debateRoutes from './routes/debate.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * The Express application.
 *
 * It is shared by two entry points:
 *  - backend/server.js — local development (loads backend/.env, calls app.listen)
 *  - api/index.js      — Vercel serverless function (Vercel manages the server)
 */
const app = express();

app.use(cors());
app.use(express.json({ limit: '1mb' }));

// On Vercel, vercel.json rewrites every /api/* request to the /api/index
// function. Regular serverless functions receive the original URL
// (e.g. /api/debate/start), but normalize defensively in case the runtime
// ever exposes a path relative to the function entry point instead.
if (process.env.VERCEL) {
  app.use((req, _res, next) => {
    if (!req.url.startsWith('/api')) {
      const rest = req.url.replace(/^\/index(?=\/|$)/, '');
      req.url = `/api${rest === '/' ? '' : rest}`;
    }
    next();
  });
}

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/debate', debateRoutes);

// Unknown API paths return JSON, not the SPA.
app.use('/api', (_req, res) => {
  res.status(404).json({ error: 'Endpoint not found.' });
});

// If the frontend has been built, serve it from the backend too (local only —
// on Vercel static files are served from the CDN and this directory is not
// part of the deployment).
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

export default app;
