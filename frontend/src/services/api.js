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
  if (status === 503) return 'AI service is not configured.';
  if (status === 429) {
    return 'You have reached the AI rate limit. Please wait a moment and then try again.';
  }
  if (status === 400) return 'Something is missing. Please check your input and try again.';
  return 'Something went wrong while contacting the AI. Please try again.';
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

  let data = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    throw new ApiError(
      friendlyMessage(response.status, data?.error),
      response.status === 429 ? 'rate-limit' : response.status === 503 ? 'unconfigured' : 'server'
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
