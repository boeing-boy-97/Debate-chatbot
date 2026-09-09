// GET /api/debug/imports — TEMPORARY diagnostic endpoint.
//
// Bisects the server import chain with guarded dynamic imports so a crash in
// any module is captured and returned as JSON (with its stack) instead of
// crashing the function. Leaf modules first, so the report shows exactly
// which import fails on Vercel. DELETE THIS FILE before the final release.
export default async function handler(req, res) {
  const steps = {
    node:
      typeof process !== 'undefined' && process.version ? process.version : 'no-process',
    platform:
      typeof process !== 'undefined' && process.platform ? process.platform : '?',
    isVercel: Boolean(
      typeof process !== 'undefined' && process.env && process.env.VERCEL
    ),
  };
  try {
    const offline = await import('../../server/services/offlineEngine.js');
    steps.offlineEngine = `ok (${typeof offline.offlineOpening})`;

    const openaiMod = await import('openai');
    steps.openai = `ok (${typeof openaiMod.default})`;

    const ai = await import('../../server/services/aiService.js');
    steps.aiService = `ok (${typeof ai.startDebate}/${typeof ai.isAiConfigured})`;
    steps.aiConfigured = ai.isAiConfigured();

    const lambda = await import('../../server/lambda.js');
    steps.lambda = `ok (${typeof lambda.debateHandler})`;

    return res.json({ ok: true, steps });
  } catch (error) {
    steps.error = String((error && error.stack) || error).slice(0, 3000);
    return res.status(500).json({ ok: false, steps });
  }
}
