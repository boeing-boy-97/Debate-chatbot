// Shared Express adapter for Vercel serverless functions.
import app from './app.js';

function restoreOriginalPath(req) {
  const raw = req.url || '/';
  const q = raw.includes('?') ? raw.slice(raw.indexOf('?')) : '';
  let pathname = raw.includes('?') ? raw.slice(0, raw.indexOf('?')) : raw;

  const headerPath = (
    req.headers['x-invoke-path'] ||
    req.headers['x-vercel-original-path'] ||
    String(req.headers['x-forwarded-uri'] || '').split('?')[0] ||
    ''
  ).trim();

  if (headerPath.startsWith('/api')) {
    pathname = headerPath;
  } else if (!pathname.startsWith('/api')) {
    const rest = pathname.replace(/^\/index(?=\/|$)/, '') || '/';
    pathname = `/api${rest === '/' ? '' : rest}`;
  }

  req.url = pathname + q;
}

export default function handler(req, res) {
  restoreOriginalPath(req);
  return app(req, res);
}
