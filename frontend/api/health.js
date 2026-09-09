// GET /api/health — deployment health check + public AI status.
//
// Returns e.g. {"status":"ok","configured":true,"model":"gpt-4o-mini","offlineFallback":"on"}.
// `configured:false` on a deployment where you added OPENAI_API_KEY means the
// variable did not reach the runtime (wrong name/environment, or redeploy).
// This handler intentionally depends on zero heavy packages so it stays up
// even when the AI client itself cannot load.
import { getPublicStatus } from '../server/services/publicStatus.js';

export default function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed.' });
  }
  return res.status(200).json(getPublicStatus());
}
