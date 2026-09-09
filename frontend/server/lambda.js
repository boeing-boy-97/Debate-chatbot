import { ApiError } from './services/aiService.js';

/** Vercel parses JSON bodies, but be defensive for buffers/strings. */
function readBody(req) {
  const raw = req?.body;
  if (raw == null || raw === '') return {};
  if (typeof raw === 'object' && !Buffer.isBuffer(raw)) return raw;
  if (Buffer.isBuffer(raw)) {
    try {
      const str = raw.toString('utf-8');
      const parsed = JSON.parse(str);
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
      throw new ApiError(400, 'Invalid request body. Please send valid JSON.');
    }
  }
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
      throw new ApiError(400, 'Invalid request body. Please send valid JSON.');
    }
  }
  return {};
}

/**
 * Shared POST handler wrapper for Vercel serverless functions in frontend/api/.
 */
export function debateHandler(serviceFn) {
  return async function handler(req, res) {
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST');
      return res.status(405).json({ error: 'Method not allowed.' });
    }
    try {
      const body = readBody(req);
      const data = await serviceFn(body);
      return res.status(200).json(data);
    } catch (error) {
      if (error instanceof ApiError) {
        return res.status(error.status).json({ error: error.message });
      }
      console.error('[api error]', error);
      return res.status(500).json({
        error: 'AI service temporarily unavailable.',
      });
    }
  };
}
