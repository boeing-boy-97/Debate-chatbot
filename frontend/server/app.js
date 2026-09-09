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
 *  - frontend/server/server.js — local development (loads frontend/server/.env, calls app.listen)
 *  - frontend/api/index.js — Vercel serverless function (Vercel manages the server)
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
const distDir = path.resolve(__dirname, '../dist');
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
  // Body-parser errors (invalid JSON, oversized body) carry a safe 4xx
  // status — surface it instead of returning a misleading 500.
  const status =
    Number.isInteger(err?.status) && err.status >= 400 && err.status < 500 ? err.status : 500;
  const error =
    status === 413
      ? 'Request body is too large.'
      : status === 400
        ? 'Invalid request body. Please send valid JSON.'
        : 'Something went wrong while contacting the AI. Please try again.';
  res.status(status).json({ error });
});

export default app;
