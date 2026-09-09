// Shared wrapper for the Vercel serverless functions in frontend/api/.
//
// Each file under frontend/api/ maps 1:1 to an HTTP route (e.g.
// frontend/api/debate/start.js -> POST /api/debate/start) and delegates to the
// same aiService functions the local Express server uses, so local dev and
// Vercel always run identical business logic.
import { ApiError } from './services/aiService.js';

/** Vercel usually parses JSON bodies, but be defensive: accept a raw string. */
function readBody(req) {
  const raw = req?.body;
  if (raw == null || raw === '') return {};
  if (typeof raw === 'object') return raw;
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
 * Builds a POST-only JSON handler around an aiService function.
 * Validation errors (ApiError) become friendly JSON responses with the right
 * status code; unexpected errors become a generic 500 (details stay in logs).
 */
export function debateHandler(serviceFn) {
  return async function handler(req, res) {
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST');
      return res.status(405).json({ error: 'Method not allowed.' });
    }
    try {
      const data = await serviceFn(readBody(req));
      return res.status(200).json(data);
    } catch (error) {
      if (error instanceof ApiError) {
        return res.status(error.status).json({ error: error.message });
      }
      console.error('[api error]', error);
      return res.status(500).json({
        error: 'Something went wrong while contacting the AI. Please try again.',
      });
    }
  };
}
