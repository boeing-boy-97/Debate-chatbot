import OpenAI from 'openai';

const MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';
const VALID_POSITIONS = ['for', 'against'];
const VALID_DIFFICULTIES = ['beginner', 'intermediate', 'advanced'];

/** Error with an HTTP status + a user-friendly message. */
export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

/** True when a real API key is configured. */
export function isAiConfigured() {
  const key = (process.env.OPENAI_API_KEY || '').trim();
  return Boolean(key) && key !== 'your_api_key_here' && key !== 'sk-xxx';
}

function getClient() {
  if (!isAiConfigured()) {
    throw new ApiError(503, 'AI service is not configured.');
  }
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    baseURL: process.env.OPENAI_BASE_URL || undefined,
    timeout: 60000,
    maxRetries: 1,
  });
}

/* ----------------------------- validation ----------------------------- */

function requireString(value, label, { max = 500 } = {}) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new ApiError(400, `${label} is required.`);
  }
  return value.trim().slice(0, max);
}

function normalizePosition(value) {
  const position = String(value || '').toLowerCase();
  if (!VALID_POSITIONS.includes(position)) {
    throw new ApiError(400, 'Invalid position. Use "for" or "against".');
  }
  return position;
}

function normalizeDifficulty(value) {
  const difficulty = String(value || 'intermediate').toLowerCase();
  if (!VALID_DIFFICULTIES.includes(difficulty)) {
    throw new ApiError(400, 'Invalid difficulty.');
  }
  return difficulty;
}

/** Clean the conversation into a safe, bounded list of { role, content }. */
function normalizeConversation(value) {
  if (!Array.isArray(value)) {
    throw new ApiError(400, 'Conversation history is required.');
  }
  return value
    .filter(
      (m) =>
        m &&
        (m.role === 'user' || m.role === 'assistant') &&
        typeof m.content === 'string' &&
        m.content.trim()
    )
    .slice(-40)
    .map((m) => ({ role: m.role, content: m.content.trim().slice(0, 3000) }));
}

/* --------------------------- prompt building --------------------------- */

const DEBATE_RULES = `Rules:
1. Stay focused on the debate topic.
2. Remember previous arguments and build on them.
3. Directly address the user's latest argument first.
4. Give logical counterarguments.
5. Identify assumptions, contradictions, missing evidence, and weak reasoning.
6. Do not simply agree with the user.
7. Do not repeat the same argument you already made.
8. Ask a challenging question when appropriate.
9. Use clear and understandable language.
10. Do not invent statistics or sources.
11. If a factual claim requires evidence, clearly say that evidence is needed.
12. Adjust the depth and vocabulary to the selected difficulty level.
13. Keep responses concise enough for a natural debate (the "why" section should be 2–4 sentences).
14. Never insult the user.
15. Remain respectful and professional.`;

const DIFFICULTY_DESCRIPTIONS = {
  beginner:
    'BEGINNER: use simple words and short sentences, one clear argument at a time, and explain concepts briefly.',
  intermediate:
    'INTERMEDIATE: use everyday language with solid reasoning and one concrete challenge per turn.',
  advanced:
    'ADVANCED: use rigorous logic, precise terminology, and deep, multi-layered challenges. Raise the strongest objections.',
};

function positionLabel(position) {
  return position === 'for' ? 'FOR' : 'AGAINST';
}

function buildDebateSystemPrompt(topic, userPosition, aiPosition, difficulty, extra) {
  return `You are an intelligent debate opponent called "AI Opponent".

The debate topic is: "${topic}"
The user has chosen the ${positionLabel(userPosition)} side.
You must argue the ${positionLabel(aiPosition)} side — the direct opposite of the user.

${DEBATE_RULES}

${DIFFICULTY_DESCRIPTIONS[difficulty]}

${extra ?? ''}`;
}

function conversationBlock(conversation) {
  if (!conversation.length) return '(The debate has just started.)';
  return conversation
    .map((m) => (m.role === 'user' ? 'User' : 'AI Opponent') + `: ${m.content}`)
    .join('\n\n');
}

/* --------------------------- JSON handling --------------------------- */

function extractJson(text) {
  let clean = String(text).trim();
  const fenced = clean.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) clean = fenced[1].trim();
  const start = clean.indexOf('{');
  const end = clean.lastIndexOf('}');
  if (start === -1 || end <= start) {
    throw new Error('Model did not return valid JSON.');
  }
  return JSON.parse(clean.slice(start, end + 1));
}

async function complete(messages, { json = false } = {}) {
  const client = getClient();
  const request = {
    model: MODEL,
    messages,
    temperature: 0.7,
    max_tokens: 900,
  };
  if (json) {
    request.response_format = { type: 'json_object' };
  }
  try {
    const completion = await client.chat.completions.create(request);
    return completion.choices[0].message.content || '';
  } catch (error) {
    // Some OpenAI-compatible providers do not support response_format;
    // retry once without it, keeping the strict JSON instruction in the prompt.
    if (json && error?.status === 400) {
      const retry = await client.chat.completions.create({ ...request, response_format: undefined });
      return retry.choices[0].message.content || '';
    }
    if (error?.status === 401 || error?.status === 403) {
      throw new ApiError(503, 'AI service is not configured.');
    }
    if (error?.status === 429) {
      throw new ApiError(
        429,
        'You have reached the AI rate limit. Please wait a moment and then try again.'
      );
    }
    throw error;
  }
}

async function completeJson(messages) {
  const raw = await complete(messages, { json: true });
  return extractJson(raw);
}

function clampScore(value, { min = 0, max = 100, fallback = 0 } = {}) {
  const num = Number(value);
  if (!Number.isFinite(num)) return fallback;
  return Math.max(min, Math.min(max, Math.round(num)));
}

/* ------------------------------ endpoints ------------------------------ */

/** AI's opening statement to kick off the debate. */
export async function generateOpening({ topic, userPosition, difficulty }) {
  const cleanTopic = requireString(topic, 'Topic', { max: 300 });
  const position = normalizePosition(userPosition);
  const level = normalizeDifficulty(difficulty);
  const aiPosition = position === 'for' ? 'against' : 'for';

  const system = buildDebateSystemPrompt(cleanTopic, position, aiPosition, level, `
The debate is just beginning. Make a short opening statement (2–4 sentences) that frames the
${positionLabel(aiPosition)} side and sets up one key challenge for the user. Do NOT use JSON —
return plain text only.`);

  const content = await complete([
    { role: 'system', content: system },
    { role: 'user', content: 'The debate starts now. Give your opening statement.' },
  ]);

  if (!content.trim()) {
    throw new Error('Empty AI response.');
  }
  return content.trim();
}

/** Core turn: read the user's latest argument, produce a structured counterargument. */
export async function generateCounterargument({
  topic,
  userPosition,
  aiPosition,
  difficulty,
  conversation,
}) {
  const cleanTopic = requireString(topic, 'Topic', { max: 300 });
  const position = normalizePosition(userPosition);
  const aiPos = normalizePosition(aiPosition);
  const level = normalizeDifficulty(difficulty);
  const history = normalizeConversation(conversation);

  if (!history.length || history[history.length - 1].role !== 'user') {
    throw new ApiError(400, 'Send your argument first.');
  }

  const system = buildDebateSystemPrompt(cleanTopic, position, aiPos, level, `
Reply to the user's LATEST argument. Build on, and do not repeat, anything you already said.

Return ONLY valid JSON with exactly these keys:
{
  "counterargument": "The main counterargument — 1–2 sentences.",
  "why": "The reasoning behind it — 2–4 sentences.",
  "challenge": "One question or challenge for the user."
}`);

  const data = await completeJson([
    { role: 'system', content: system },
    {
      role: 'user',
      content: `The debate conversation so far (the last message is the user's newest argument):\n\n${conversationBlock(history)}`,
    },
  ]);

  const counterargument = String(data.counterargument || '').trim();
  const why = String(data.why || '').trim();
  const challenge = String(data.challenge || '').trim();

  if (!counterargument && !why && !challenge) {
    throw new Error('Empty AI response.');
  }
  return { counterargument, why, challenge };
}

/** Separate coach-style analysis of the user's latest argument. */
export async function analyzeArgument({
  topic,
  userPosition,
  difficulty,
  argument,
  lastAiResponse,
}) {
  const cleanTopic = requireString(topic, 'Topic', { max: 300 });
  const position = normalizePosition(userPosition);
  const level = normalizeDifficulty(difficulty);
  const cleanArgument = requireString(argument, 'Argument', { max: 3000 });

  const system = `You are an honest, constructive debate coach — not a debater.
The debate topic is: "${cleanTopic}"
The user is arguing the ${positionLabel(position)} side at ${level.toUpperCase()} difficulty.
Analyze ONLY the user's argument below. Be specific, fair, and practical.

Return ONLY valid JSON with exactly these keys:
{
  "score": <integer 1-10>,
  "logic": "Whether the reasoning is logically strong and why.",
  "evidence": "What evidence is missing or whether the claims are supported.",
  "weakness": "The weakest part of the argument.",
  "improvement": "A better version of the argument."
}`;

  const data = await completeJson([
    { role: 'system', content: system },
    {
      role: 'user',
      content: `User's argument: ${cleanArgument}${
        lastAiResponse ? `\n\nAI's response to it: ${String(lastAiResponse).slice(0, 2000)}` : ''
      }`,
    },
  ]);

  return {
    score: clampScore(data.score, { min: 1, max: 10, fallback: 5 }),
    logic: String(data.logic || 'The argument could be strengthened with clearer reasoning.').trim(),
    evidence:
      String(data.evidence || 'The argument relies on assumptions rather than evidence.').trim(),
    weakness: String(data.weakness || 'The weakest point is not clearly defined.').trim(),
    improvement: String(
      data.improvement || 'Provide concrete evidence and address the strongest counterargument.'
    ).trim(),
  };
}

/** Final evaluation of the whole debate. */
export async function evaluateDebate({
  topic,
  userPosition,
  aiPosition,
  difficulty,
  conversation,
}) {
  const cleanTopic = requireString(topic, 'Topic', { max: 300 });
  const position = normalizePosition(userPosition);
  const aiPos = normalizePosition(aiPosition);
  const level = normalizeDifficulty(difficulty);
  const history = normalizeConversation(conversation);

  if (!history.some((m) => m.role === 'user')) {
    throw new ApiError(400, 'There is not enough debate to evaluate yet. Send at least one argument first.');
  }

  const system = `You are an impartial debate judge evaluating the full debate below.
Topic: "${cleanTopic}"
User is arguing ${positionLabel(position)}; the AI opponent is arguing ${positionLabel(aiPos)}.
Difficulty: ${level.toUpperCase()}.

Judge on logic, evidence, relevance, counterarguments, consistency, and persuasiveness.
Never decide a winner by counting who sent more messages. Give an honest, balanced verdict and
remember this is your evaluation, not an objective truth.

Return ONLY valid JSON with exactly these keys:
{
  "overallScore": <integer 0-100>,
  "userScore": <integer 0-100>,
  "aiScore": <integer 0-100>,
  "scores": {
    "argumentQuality": <integer 0-100>,
    "logicalReasoning": <integer 0-100>,
    "evidence": <integer 0-100>,
    "rebuttalQuality": <integer 0-100>,
    "consistency": <integer 0-100>,
    "persuasiveness": <integer 0-100>
  },
  "winner": "user" | "ai" | "tie",
  "explanation": "A short explanation of the verdict, 2–4 sentences.",
  "strongestArgument": "The strongest argument made by the user.",
  "weakestArgument": "The weakest argument made by the user.",
  "improvementTips": ["tip 1", "tip 2", "tip 3"]
}`;

  const data = await completeJson([
    { role: 'system', content: system },
    { role: 'user', content: `Debate transcript:\n\n${conversationBlock(history)}` },
  ]);

  const rawScores = data.scores || {};
  const winnerValue = String(data.winner || 'tie').toLowerCase();
  const winner = ['user', 'ai'].includes(winnerValue)
    ? winnerValue
    : winnerValue === 'draw' || winnerValue === 'too close'
      ? 'tie'
      : 'tie';

  const tips = Array.isArray(data.improvementTips)
    ? data.improvementTips.filter((t) => String(t).trim()).slice(0, 3).map((t) => String(t).trim())
    : [];
  while (tips.length < 3) {
    tips.push('Back your claims with concrete evidence or clear reasoning.');
  }

  return {
    overallScore: clampScore(data.overallScore, { fallback: 50 }),
    userScore: clampScore(data.userScore, { fallback: 50 }),
    aiScore: clampScore(data.aiScore, { fallback: 50 }),
    scores: {
      argumentQuality: clampScore(rawScores.argumentQuality, { fallback: 50 }),
      logicalReasoning: clampScore(rawScores.logicalReasoning, { fallback: 50 }),
      evidence: clampScore(rawScores.evidence, { fallback: 50 }),
      rebuttalQuality: clampScore(rawScores.rebuttalQuality, { fallback: 50 }),
      consistency: clampScore(rawScores.consistency, { fallback: 50 }),
      persuasiveness: clampScore(rawScores.persuasiveness, { fallback: 50 }),
    },
    winner,
    explanation: String(data.explanation || '').trim(),
    strongestArgument: String(data.strongestArgument || '').trim(),
    weakestArgument: String(data.weakestArgument || '').trim(),
    improvementTips: tips,
  };
}
