/**
 * Zero-dependency runtime status helpers.
 *
 * This module deliberately imports nothing (in particular, NOT the `openai`
 * package) so the tiny `/api/health` serverless function can use it without
 * pulling in heavy dependencies — health checks stay up even when the AI
 * client itself cannot load. `aiService.js` reuses these helpers so local dev
 * and Vercel always agree on what "configured" means.
 *
 * Nothing here ever exposes secret values — only safe booleans/flags.
 */

/** The API key with whitespace and accidental surrounding quotes removed. */
export function cleanApiKey() {
  let key = (process.env.OPENAI_API_KEY || '').trim();
  if (
    key.length >= 2 &&
    ((key.startsWith('"') && key.endsWith('"')) ||
      (key.startsWith("'") && key.endsWith("'")))
  ) {
    key = key.slice(1, -1).trim();
  }
  return key;
}

/** True when a real API key is configured (not empty, not a placeholder). */
export function isKeyConfigured() {
  const key = cleanApiKey();
  return Boolean(key) && key !== 'your_api_key_here' && key !== 'sk-xxx';
}

/** Model name with whitespace removed (defaults to gpt-4o-mini). */
export function getModelName() {
  return (process.env.OPENAI_MODEL || '').trim() || 'gpt-4o-mini';
}

/** Custom base URL with whitespace removed (empty when unused). */
export function getBaseUrl() {
  return (process.env.OPENAI_BASE_URL || '').trim();
}

/**
 * Offline (local demo) replies are used only when the real AI is not
 * configured or cannot be reached, so the app still works end-to-end without
 * network access. Set ALLOW_OFFLINE_FALLBACK=false to enforce OpenAI-only.
 */
export function isOfflineFallbackEnabled() {
  return (process.env.ALLOW_OFFLINE_FALLBACK || '').trim().toLowerCase() !== 'false';
}

/**
 * Public status payload for GET /api/health. Safe to expose: it reports
 * WHETHER a key is set, never the key itself. If `configured` is false on a
 * deployment where you added OPENAI_API_KEY, the variable did not reach the
 * runtime (wrong name/environment, or you need to redeploy).
 */
export function getPublicStatus() {
  return {
    status: 'ok',
    configured: isKeyConfigured(),
    model: getModelName(),
    offlineFallback: isOfflineFallbackEnabled() ? 'on' : 'off',
  };
}
