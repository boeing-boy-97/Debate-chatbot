// All backend calls go through here so UI components never talk to the API directly.

const BASE = '/api/debate';

export class ApiError extends Error {
  constructor(message, code = 'unknown') {
    super(message);
    this.code = code;
  }
}

function friendlyMessage(status, serverError) {
  if (serverError) return serverError;
  if (status === 404) {
    return (
      'Debate API not found (404). If this is a Vercel deployment, set the Root Directory ' +
      'to "frontend" and redeploy, then check that /api/health returns JSON.'
    );
  }
  if (status === 503) return 'AI service is not configured.';
  if (status === 429) {
    return 'You have reached the AI rate limit. Please wait a moment and then try again.';
  }
  if (status === 400) return 'Something is missing. Please check your input and try again.';
  return 'Something went wrong while contacting the AI. Please try again.';
}

function codeFor(status) {
  if (status === 429) return 'rate-limit';
  if (status === 503) return 'unconfigured';
  if (status === 404) return 'api-missing';
  return 'server';
}

async function post(path, body) {
  let response;
  try {
    response = await fetch(`${BASE}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch {
    throw new ApiError(
      'Network error. Please check your connection and try again.',
      'network'
    );
  }

  // Read the raw text first so a misrouted API (HTML 404 page or index.html
  // instead of JSON — the classic symptom of a wrong Vercel Root Directory or
  // a failed function deployment) becomes a clear error instead of a crash
  // when the caller reads fields off a null response.
  let text = '';
  try {
    text = await response.text();
  } catch {
    text = '';
  }
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = null;
    }
  }

  if (!response.ok) {
    throw new ApiError(
      friendlyMessage(response.status, data?.error),
      codeFor(response.status)
    );
  }
  if (!data || typeof data !== 'object') {
    throw new ApiError(
      'The debate API did not return a valid response. If this is a Vercel deployment, ' +
        'make sure the Root Directory is "frontend", redeploy, and check that /api/health returns JSON.',
      'bad-response'
    );
  }
  return data;
}

/**
 * Deployment health check. Returns e.g.
 * { status: 'ok', configured: true, model: 'gpt-4o-mini', offlineFallback: 'on' }.
 * Throws an ApiError with code 'api-missing' when the API routes are not
 * deployed at all (the page HTML is served instead of JSON).
 */
export async function getHealth() {
  let response;
  try {
    response = await fetch('/api/health');
  } catch {
    throw new ApiError(
      'Network error. Please check your connection and try again.',
      'network'
    );
  }
  let data = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }
  if (response.status === 404 || !data || data.status !== 'ok') {
    throw new ApiError(
      'Debate API not found. If this is a Vercel deployment, set the Root Directory ' +
        'to "frontend" and redeploy.',
      'api-missing'
    );
  }
  return data;
}

/** Starts a debate; returns the AI's opening statement. */
export function startDebate({ topic, userPosition, difficulty }) {
  return post('/start', { topic, userPosition, difficulty });
}

/** Sends the user's argument and returns the AI counterargument. */
export function sendMessage({
  topic,
  userPosition,
  aiPosition,
  difficulty,
  conversation,
}) {
  return post('/message', {
    topic,
    userPosition,
    aiPosition,
    difficulty,
    conversation,
  });
}

/** Analyzes the user's latest argument. */
export function analyzeArgument({ topic, userPosition, difficulty, argument, lastAiResponse }) {
  return post('/analyze', {
    topic,
    userPosition,
    difficulty,
    argument,
    lastAiResponse,
  });
}

/** Evaluates the complete debate. */
export function evaluateDebate({
  topic,
  userPosition,
  aiPosition,
  difficulty,
  conversation,
}) {
  return post('/evaluate', {
    topic,
    userPosition,
    aiPosition,
    difficulty,
    conversation,
  });
}
