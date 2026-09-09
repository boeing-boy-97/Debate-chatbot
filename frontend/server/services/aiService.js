import OpenAI from 'openai';
import * as offline from './offlineEngine.js';
import {
  cleanApiKey,
  isKeyConfigured,
  getModelName,
  getBaseUrl,
  isOfflineFallbackEnabled,
} from './publicStatus.js';
import { validateDebateArgument } from './validateArgument.js';

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
  return isKeyConfigured();
}

function getClient() {
  if (!isAiConfigured()) {
    throw new ApiError(
      503,
      'AI service is not configured. OPENAI_API_KEY environment variable is required on the server.'
    );
  }
  const baseURL = getBaseUrl();
  return new OpenAI({
    apiKey: cleanApiKey(),
    baseURL: baseURL || undefined,
    timeout: 25000,
    maxRetries: 1,
  });
}

function wrapAiError(error) {
  if (error instanceof ApiError) {
    return error;
  }
  console.error('[ai error]', error?.message || error);
  if (error?.status === 401 || error?.status === 403) {
    return new ApiError(503, 'AI service is not configured properly.');
  }
  if (error?.status === 429) {
    return new ApiError(
      429,
      'You have reached the AI rate limit. Please wait a moment and then try again.'
    );
  }
  if (error?.status === 404) {
    return new ApiError(
      502,
      'The configured AI model was not found. Please check OPENAI_MODEL setting.'
    );
  }
  if (error?.status === 400) {
    return new ApiError(
      400,
      error?.message || 'The AI request was invalid.'
    );
  }
  return new ApiError(503, 'AI service temporarily unavailable.');
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

function validateStartPayload(payload) {
  return {
    topic: requireString(payload?.topic, 'Topic', { max: 300 }),
    userPosition: normalizePosition(payload?.userPosition),
    difficulty: normalizeDifficulty(payload?.difficulty),
  };
}

function validateMessagePayload(payload) {
  const clean = {
    ...validateStartPayload(payload),
    aiPosition: normalizePosition(payload?.aiPosition),
  };
  const history = normalizeConversation(payload?.conversation);
  if (!history.length || history[history.length - 1].role !== 'user') {
    throw new ApiError(400, 'Send your argument first.');
  }

  const latestUserMsg = history[history.length - 1].content;
  const argCheck = validateDebateArgument(latestUserMsg);
  if (!argCheck.valid) {
    throw new ApiError(400, argCheck.reason);
  }

  return { ...clean, conversation: history };
}

function validateAnalyzePayload(payload) {
  const clean = {
    ...validateStartPayload(payload),
    argument: requireString(payload?.argument, 'Argument', { max: 3000 }),
    lastAiResponse:
      typeof payload?.lastAiResponse === 'string' ? payload.lastAiResponse.slice(0, 2000) : '',
  };

  const argCheck = validateDebateArgument(clean.argument);
  if (!argCheck.valid) {
    throw new ApiError(400, argCheck.reason);
  }

  return clean;
}

function validateEvaluatePayload(payload) {
  const clean = {
    ...validateStartPayload(payload),
    aiPosition: normalizePosition(payload?.aiPosition),
  };
  const history = normalizeConversation(payload?.conversation);
  if (!history.some((m) => m.role === 'user')) {
    throw new ApiError(
      400,
      'There is not enough debate to evaluate yet. Send at least one argument first.'
    );
  }
  return { ...clean, conversation: history };
}

/* --------------------------- prompt building --------------------------- */

const DEBATE_RULES = `Rules:
1. Stay strictly focused on the debate topic.
2. Maintain your assigned position consistently — NEVER switch sides or agree with the user's position.
3. Address the specific logic, claims, and assumptions in the user's latest argument.
4. Point out logical flaws, unstated assumptions, missing evidence, or counterexamples.
5. Provide strong counterarguments supporting your assigned side.
6. Ask a specific, thought-provoking challenge question directly related to the user's actual argument (NEVER generic questions like "give evidence").
7. Do not repeat arguments or phrasing you already used earlier in the debate.
8. Attack the argument, NEVER the person.
9. Adjust depth according to difficulty level.`;

const DIFFICULTY_DESCRIPTIONS = {
  beginner:
    'BEGINNER DIFFICULTY: Use accessible, simple language. Highlight one clear weakness in the user argument and ask one direct challenge question.',
  intermediate:
    'INTERMEDIATE DIFFICULTY: Use solid, everyday logic with well-structured counterarguments. Challenge underlying assumptions directly.',
  advanced:
    'ADVANCED DIFFICULTY: Use rigorous logic, precise terminology, and multi-layered challenges. Raise philosophical or empirical counterexamples and attack subtle fallacies.',
};

function positionLabel(position) {
  return position === 'for' ? 'FOR' : 'AGAINST';
}

function buildDebateSystemPrompt(topic, userPosition, aiPosition, difficulty, extra) {
  return `You are an expert, professional debate opponent in an educational debate application.

The debate topic is: "${topic}"
The user is arguing: ${positionLabel(userPosition)}
You MUST argue: ${positionLabel(aiPosition)} — the direct opposite side.

CRITICAL INSTRUCTION: You must strictly defend the ${positionLabel(aiPosition)} side throughout the entire debate. You must NEVER agree with the user's overall stance or switch to the ${positionLabel(userPosition)} position.

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
  let cleanStr = String(text).trim();
  const fenced = cleanStr.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) cleanStr = fenced[1].trim();
  const start = cleanStr.indexOf('{');
  const end = cleanStr.lastIndexOf('}');
  if (start === -1 || end <= start) {
    throw new Error('Model did not return valid JSON.');
  }
  return JSON.parse(cleanStr.slice(start, end + 1));
}

async function complete(messages, { json = false } = {}) {
  const client = getClient();
  const request = {
    model: getModelName(),
    messages,
    temperature: 0.7,
    max_tokens: 1000,
  };
  if (json) {
    request.response_format = { type: 'json_object' };
  }
  try {
    let completion;
    try {
      completion = await client.chat.completions.create(request);
    } catch (error) {
      if (json && error?.status === 400) {
        completion = await client.chat.completions.create({
          ...request,
          response_format: undefined,
        });
      } else {
        throw error;
      }
    }
    return completion.choices[0]?.message?.content || '';
  } catch (error) {
    throw wrapAiError(error);
  }
}

async function completeJson(messages) {
  const raw = await complete(messages, { json: true });
  return extractJson(raw);
}

function clampScore(value, { min = 0, max = 100, fallback = 50 } = {}) {
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

  const system = buildDebateSystemPrompt(
    cleanTopic,
    position,
    aiPosition,
    level,
    `The debate is just beginning. Make a concise opening statement (2–4 sentences) framing the ${positionLabel(
      aiPosition
    )} side and setting up one specific key challenge for the user. Do NOT return JSON — plain text only.`
  );

  const content = await complete([
    { role: 'system', content: system },
    { role: 'user', content: 'The debate starts now. Give your opening statement.' },
  ]);

  if (!content.trim()) {
    throw new ApiError(503, 'AI service temporarily unavailable.');
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

  const system = buildDebateSystemPrompt(
    cleanTopic,
    position,
    aiPos,
    level,
    `Reply to the user's LATEST argument. Analyze their specific claim and present a strong rebuttal supporting ${positionLabel(
      aiPos
    )}.

CRITICAL:
1. "counterargument": 1-2 sentences presenting the core counterargument supporting ${positionLabel(aiPos)}.
2. "why": 2-4 sentences explaining the reasoning, pointing out specific flaws, assumptions, or counterexamples to the user's argument.
3. "challenge": 1 specific, targeted question directly challenging the user's claim or premises (NEVER generic questions like "give evidence").

Return ONLY valid JSON with exactly these keys:
{
  "counterargument": "...",
  "why": "...",
  "challenge": "..."
}`
  );

  const data = await completeJson([
    { role: 'system', content: system },
    {
      role: 'user',
      content: `Debate transcript so far (last message is user's newest argument):\n\n${conversationBlock(
        history
      )}`,
    },
  ]);

  const counterargument = String(data.counterargument || '').trim();
  const why = String(data.why || '').trim();
  const challenge = String(data.challenge || '').trim();

  if (!counterargument && !why && !challenge) {
    throw new ApiError(503, 'AI service temporarily unavailable.');
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

  const system = `You are an expert, objective debate coach.
Topic: "${cleanTopic}"
User side: ${positionLabel(position)}
Difficulty: ${level.toUpperCase()}

Analyze ONLY the user's latest argument below. Be thorough, constructive, and fair.

Identify if any logical fallacies are present (e.g. Hasty Generalization, Strawman, Ad Hominem, False Dilemma, Slippery Slope, Circular Reasoning, Appeal to Authority, Appeal to Emotion, Red Herring).
CRITICAL: Do NOT invent a fallacy if none exists! If no clear logical fallacy exists, you MUST set "logicalFallacies" to "No clear logical fallacy detected."

Return ONLY valid JSON with these keys:
{
  "score": <integer 1-10>,
  "argumentStrength": <integer 0-100>,
  "logic": "Analysis of logical structure and coherence.",
  "evidenceQuality": "Evaluation of claims and whether concrete evidence or examples are provided.",
  "relevance": "How directly relevant the claim is to the topic.",
  "clarity": "How clearly the argument is stated.",
  "rebuttalStrength": "How well it addresses potential counterarguments.",
  "logicalFallacies": "Description of fallacies or 'No clear logical fallacy detected.'",
  "improvement": "Actionable, specific recommendation to improve this argument."
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

  const fallaciesRaw = String(data.logicalFallacies || '').trim();
  const logicalFallacies =
    fallaciesRaw && !/none|no fallacy|no clear/i.test(fallaciesRaw)
      ? fallaciesRaw
      : 'No clear logical fallacy detected.';

  return {
    score: clampScore(data.score, { min: 1, max: 10, fallback: 7 }),
    argumentStrength: clampScore(data.argumentStrength, { min: 0, max: 100, fallback: 70 }),
    logic: String(data.logic || 'The argument presents a clear position.').trim(),
    evidenceQuality: String(
      data.evidenceQuality || 'The argument could be strengthened with concrete evidence.'
    ).trim(),
    relevance: String(data.relevance || 'Relevant to the topic.').trim(),
    clarity: String(data.clarity || 'Clear and concise statement.').trim(),
    rebuttalStrength: String(
      data.rebuttalStrength || 'Weak point is not anticipating counterarguments.'
    ).trim(),
    logicalFallacies,
    improvement: String(
      data.improvement || 'Provide concrete examples and address key counterarguments.'
    ).trim(),
  };
}

/** Evaluation of the debate (provisional or final report). */
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
    throw new ApiError(
      400,
      'There is not enough debate to evaluate yet. Send at least one argument first.'
    );
  }

  const system = `You are an impartial, professional debate judge evaluating the complete debate transcript below.
Topic: "${cleanTopic}"
User Position: ${positionLabel(position)}
AI Opponent Position: ${positionLabel(aiPos)}
Difficulty: ${level.toUpperCase()}

Evaluate strictly based on what actually occurred in the transcript. Do NOT invent facts or arguments that were not made.

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
  "explanation": "Detailed 2-4 sentence judge verdict.",
  "strengths": ["Key strength 1", "Key strength 2"],
  "weaknesses": ["Key weakness 1", "Key weakness 2"],
  "strongestArgument": "Quote or summary of the user's best argument in this debate.",
  "weakestArgument": "Quote or summary of the user's weakest argument in this debate.",
  "aiStrongestCounter": "Quote or summary of the AI opponent's strongest counterargument.",
  "logicalFallacies": "Description of any logical fallacies committed during the debate, or 'No clear logical fallacy detected.'",
  "improvementTips": ["Actionable tip 1", "Actionable tip 2", "Actionable tip 3"]
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
    ? data.improvementTips
        .filter((t) => String(t).trim())
        .slice(0, 3)
        .map((t) => String(t).trim())
    : [];
  while (tips.length < 3) {
    tips.push('Back your claims with concrete evidence and clear reasoning.');
  }

  const strengths = Array.isArray(data.strengths)
    ? data.strengths
        .filter((s) => String(s).trim())
        .map((s) => String(s).trim())
    : ['Clear position stated throughout the debate.'];

  const weaknesses = Array.isArray(data.weaknesses)
    ? data.weaknesses
        .filter((w) => String(w).trim())
        .map((w) => String(w).trim())
    : ['Needs more empirical evidence to back key claims.'];

  const fallaciesRaw = String(data.logicalFallacies || '').trim();
  const logicalFallacies =
    fallaciesRaw && !/none|no fallacy|no clear/i.test(fallaciesRaw)
      ? fallaciesRaw
      : 'No clear logical fallacy detected.';

  return {
    overallScore: clampScore(data.overallScore, { fallback: 65 }),
    userScore: clampScore(data.userScore, { fallback: 65 }),
    aiScore: clampScore(data.aiScore, { fallback: 65 }),
    scores: {
      argumentQuality: clampScore(rawScores.argumentQuality, { fallback: 65 }),
      logicalReasoning: clampScore(rawScores.logicalReasoning, { fallback: 65 }),
      evidence: clampScore(rawScores.evidence, { fallback: 60 }),
      rebuttalQuality: clampScore(rawScores.rebuttalQuality, { fallback: 65 }),
      consistency: clampScore(rawScores.consistency, { fallback: 70 }),
      persuasiveness: clampScore(rawScores.persuasiveness, { fallback: 65 }),
    },
    winner,
    explanation: String(data.explanation || 'Both sides presented arguments.').trim(),
    strengths,
    weaknesses,
    strongestArgument: String(data.strongestArgument || '').trim(),
    weakestArgument: String(data.weakestArgument || '').trim(),
    aiStrongestCounter: String(data.aiStrongestCounter || '').trim(),
    logicalFallacies,
    improvementTips: tips,
  };
}

/* --------------------- online / offline orchestration --------------------- */

function offlineAllowed() {
  return isOfflineFallbackEnabled();
}

function useOfflineFor(error) {
  if (!offlineAllowed()) return false;
  return !(error instanceof ApiError && error.status === 400);
}

/** Start a debate: real AI opening, or the offline opening when configured/fallback. */
export async function startDebate(payload) {
  const clean = validateStartPayload(payload);
  if (!isAiConfigured()) {
    if (offlineAllowed()) return { mode: 'offline', reply: offline.offlineOpening(clean) };
    throw new ApiError(
      503,
      'AI service is not configured. OPENAI_API_KEY environment variable is required on the server.'
    );
  }
  try {
    return { mode: 'online', reply: await generateOpening(clean) };
  } catch (error) {
    if (useOfflineFor(error)) {
      console.warn('[ai] using offline opening:', error?.message || error);
      return { mode: 'offline', reply: offline.offlineOpening(clean) };
    }
    throw error;
  }
}

/** Send the latest argument; returns a structured counterargument. */
export async function sendDebateMessage(payload) {
  const clean = validateMessagePayload(payload);
  if (!isAiConfigured()) {
    if (offlineAllowed()) return { mode: 'offline', reply: offline.offlineCounterargument(clean) };
    throw new ApiError(
      503,
      'AI service is not configured. OPENAI_API_KEY environment variable is required on the server.'
    );
  }
  try {
    return { mode: 'online', reply: await generateCounterargument(clean) };
  } catch (error) {
    if (useOfflineFor(error)) {
      console.warn('[ai] using offline counterargument:', error?.message || error);
      return { mode: 'offline', reply: offline.offlineCounterargument(clean) };
    }
    throw error;
  }
}

/** Analyze the user's latest argument. */
export async function analyzeDebateArgument(payload) {
  const clean = validateAnalyzePayload(payload);
  if (!isAiConfigured()) {
    if (offlineAllowed()) return { mode: 'offline', analysis: offline.offlineAnalysis(clean) };
    throw new ApiError(
      503,
      'AI service is not configured. OPENAI_API_KEY environment variable is required on the server.'
    );
  }
  try {
    return { mode: 'online', analysis: await analyzeArgument(clean) };
  } catch (error) {
    if (useOfflineFor(error)) {
      console.warn('[ai] using offline analysis:', error?.message || error);
      return { mode: 'offline', analysis: offline.offlineAnalysis(clean) };
    }
    throw error;
  }
}

/** Final / provisional evaluation of the debate. */
export async function evaluateDebateTurn(payload) {
  const clean = validateEvaluatePayload(payload);
  if (!isAiConfigured()) {
    if (offlineAllowed()) return { mode: 'offline', evaluation: offline.offlineEvaluation(clean) };
    throw new ApiError(
      503,
      'AI service is not configured. OPENAI_API_KEY environment variable is required on the server.'
    );
  }
  try {
    return { mode: 'online', evaluation: await evaluateDebate(clean) };
  } catch (error) {
    if (useOfflineFor(error)) {
      console.warn('[ai] using offline evaluation:', error?.message || error);
      return { mode: 'offline', evaluation: offline.offlineEvaluation(clean) };
    }
    throw error;
  }
}
