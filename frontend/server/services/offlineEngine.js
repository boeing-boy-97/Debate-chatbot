/**
 * Offline (demo) debate engine.
 *
 * This is a deterministic, locally-computed fallback used ONLY when the real
 * OpenAI service cannot be reached or has not been configured. It lets the
 * whole product flow run end-to-end without network access so the app is
 * always demonstrable. Replies are clearly framed as offline demo responses
 * and are honest about being heuristic rather than "real" AI reasoning.
 *
 * When OPENAI_API_KEY is set and api.openai.com is reachable, the app uses
 * real OpenAI and this module is never consulted.
 */

function clean(value, fallback = '') {
  const v = String(value ?? '').trim();
  return v || fallback;
}

function lastUserArgument(conversation) {
  if (!Array.isArray(conversation)) return '';
  for (let i = conversation.length - 1; i >= 0; i -= 1) {
    const m = conversation[i];
    if (m && m.role === 'user' && typeof m.content === 'string' && m.content.trim()) {
      return m.content.trim();
    }
  }
  return '';
}

function turns(conversation) {
  if (!Array.isArray(conversation)) return 0;
  return conversation.filter((m) => m && (m.role === 'user' || m.role === 'assistant')).length;
}

function userCount(conversation) {
  if (!Array.isArray(conversation)) return 0;
  return conversation.filter((m) => m && m.role === 'user').length;
}

function aiCount(conversation) {
  if (!Array.isArray(conversation)) return 0;
  return conversation.filter((m) => m && m.role === 'assistant').length;
}

function sideLabel(position) {
  return position === 'for' ? 'FOR' : 'AGAINST';
}

function clamp(n, min, max) {
  const num = Number(n);
  if (!Number.isFinite(num)) return min;
  return Math.max(min, Math.min(max, Math.round(num)));
}

/** Measured 0-100 proxy for "strength" based on length and structure. */
function strength(text) {
  const t = clean(text);
  const words = t.split(/\s+/).filter(Boolean).length;
  const sentences = t.split(/[.!?]+/).filter((s) => s.trim()).length || 1;
  let score = 30 + Math.min(35, words * 1.6) + Math.min(25, sentences * 5);
  if (/because|therefore|thus|since|however|but|for example|evidence|data|research/.test(t)) {
    score += 8;
  }
  if (/(percent|\b%|\bcosts?\b|\bbenefit)/i.test(t)) score += 5;
  return clamp(score, 15, 96);
}

/* ------------------------------ opening ------------------------------ */

export function offlineOpening({ topic, userPosition, difficulty }) {
  const cleanTopic = clean(topic, 'the topic');
  const aiPosition = userPosition === 'for' ? 'against' : 'for';
  return (
    `I will argue ${sideLabel(aiPosition)} the statement: "${cleanTopic}".\n\n` +
    `Taking this side may sound straightforward at first, but the more you press on it, the more it depends ` +
    `on assumptions that are easy to assert and hard to prove. My job here is to test whether those ` +
    `assumptions actually hold.\n\n` +
    `Opening challenge: in your view, what is the single strongest reason to support your side — and what ` +
    `would it take for you to change your mind?`
  );
}

/* --------------------------- counterargument --------------------------- */

export function offlineCounterargument({ topic, conversation }) {
  const cleanTopic = clean(topic, 'the topic');
  const argument = lastUserArgument(conversation);
  const snippet = argument.length > 140 ? `${argument.slice(0, 140)}…` : argument;
  const short = wordsCount(argument) < 25;
  const asksQuestion = /[?？]/.test(argument);

  let counterargument;
  let why;
  let challenge;

  if (!argument) {
    counterargument = `On "${cleanTopic}" I need a concrete claim from you before I can push back fairly.`;
    why = `A good debate starts from a clear, falsifiable position rather than a vague preference.`;
    challenge = `State your position in one clear sentence that could in principle be shown to be wrong.`;
  } else if (asksQuestion) {
    counterargument = `That question is worth asking, but on "${cleanTopic}" reframing the issue does not settle it — the real disagreement is about the costs and trade-offs.`;
    why = `Every position here has both benefits and drawbacks. The decisive step is not to pose the question but to defend which trade-off you accept and why.`;
    challenge = `Can you commit to one concrete position on ${cleanTopic} and defend the trade-off you are willing to accept?`;
  } else if (short) {
    counterargument = `You argued, "${snippet}". That is a start, but on "${cleanTopic}" this single point leaves the biggest objections untouched.`;
    why = `A short assertion can sound compelling, yet it rarely anticipates the counterexamples and second-order effects that decide the question.`;
    challenge = `Can you give a concrete example or a piece of evidence that supports "${snippet}", and then answer the strongest objection to it?`;
  } else {
    counterargument = `You argued that "${snippet}". That is a reasonable line, but it overlooks important counterexamples and the consequences that follow from it.`;
    why = `Strong arguments here tend to focus on one benefit while ignoring who bears the cost and how the change plays out over time. Until those are addressed, the case remains one-sided.`;
    challenge = `What is the strongest real-world counterexample to your claim, and how would you answer it?`;
  }

  return { counterargument, why, challenge };
}

function wordsCount(t) {
  return clean(t).split(/\s+/).filter(Boolean).length;
}

/* ------------------------------ analysis ------------------------------ */

export function offlineAnalysis({ topic, argument }) {
  const cleanTopic = clean(topic, 'the topic');
  const arg = clean(argument, '');
  const s = strength(arg);
  // analysis.score is 1-10; convert 0-100 proxy.
  const score = clamp(Math.round((s / 100) * 10), 1, 10);
  const hasClaim = arg.length > 40;
  const hasReasoning = /because|therefore|so|since|thus|but|however|means/.test(arg);
  const hasExample = /for example|for instance|e\.g|such as|like|consider|suppose|percent|%|data|research|study/.test(arg);

  const logic = hasReasoning
    ? `The reasoning connects a premise to a conclusion, which gives the argument a logical spine.`
    : `The argument states a position but gives little reasoning that links a premise to its conclusion.`;

  const evidence = hasExample
    ? `There is at least one concrete example or datum, which grounds the claim — good.`
    : `The argument would be much stronger with concrete evidence — a statistic, case, or real-world example — rather than assertions.`;

  const weakness = hasClaim
    ? `It does not fully address the strongest counterargument against "${cleanTopic}", so a skeptic is left with an easy rebuttal.`
    : `It is too brief to expose the reasoning, so there is little for an opponent to engage with and for a judge to credit.`;

  const improvement = hasReasoning && hasExample
    ? `Tighten it: state the claim, support it with one strong example, then explicitly answer the best objection before concluding.`
    : `Strengthen it by adding a concrete example, explaining why that example matters, and then pre-empting the most likely objection.`;

  return { score, logic, evidence, weakness, improvement };
}

/* ----------------------------- evaluation ----------------------------- */

export function offlineEvaluation({ topic, userPosition, aiPosition, conversation }) {
  const cleanTopic = clean(topic, 'the topic');
  const userArgs = (Array.isArray(conversation) ? conversation : [])
    .filter((m) => m && m.role === 'user' && typeof m.content === 'string')
    .map((m) => m.content);
  const nUser = userArgs.length;

  if (nUser === 0) {
    return {
      overallScore: 0,
      userScore: 0,
      aiScore: 0,
      scores: {
        argumentQuality: 0,
        logicalReasoning: 0,
        evidence: 0,
        rebuttalQuality: 0,
        consistency: 0,
        persuasiveness: 0,
      },
      winner: 'tie',
      explanation: `Not enough of a debate took place yet to give a meaningful verdict on "${cleanTopic}".`,
      strongestArgument: '',
      weakestArgument: '',
      improvementTips: [
        'Send at least one full argument so there is something to evaluate.',
        'Support your claim with a concrete example or piece of evidence.',
        'Answer the strongest objection to your side.',
      ],
    };
  }

  // Composite quality from the user's messages.
  let total = 0;
  let longest = '';
  let shortest = null;
  userArgs.forEach((a) => {
    const s = strength(a);
    total += s;
    if (a.length > longest.length) longest = a;
    if (!shortest || a.length < shortest.length) shortest = a;
  });
  const avgUser = Math.round(total / userArgs.length);
  // Simulated opponent pressure rises with how much the user wrote.
  const aiAdj = Math.max(45, Math.min(90, avgUser + 10));
  const argumentQuality = clamp(avgUser + 4, 0, 100);
  const logicalReasoning = clamp(avgUser + 2, 0, 100);
  const evidence = clamp(avgUser - 8, 0, 100);
  const rebuttalQuality = clamp(Math.min(avgUser, 88), 0, 100);
  const consistency = clamp(avgUser + (nUser > 1 ? 4 : -6), 0, 100);
  const persuasiveness = clamp(avgUser, 0, 100);
  const userScore = Math.round(
    (argumentQuality + logicalReasoning + evidence + rebuttalQuality + consistency + persuasiveness) / 6
  );

  const diff = userScore - aiAdj;
  let winner = 'tie';
  if (diff >= 6) winner = 'user';
  else if (diff <= -6) winner = 'ai';

  const overallScore = clamp(Math.round((userScore + aiAdj) / 2), 0, 100);

  const explanation =
    winner === 'user'
      ? `You built a fairly consistent case on "${cleanTopic}" and engaged with the counterpoints. The main way to push higher is to back each claim with concrete evidence.`
      : winner === 'ai'
        ? `The AI opponent stayed one step ahead: your claims were asserted more often than they were supported with evidence or tested against the strongest objection on "${cleanTopic}".`
        : `It was close on "${cleanTopic}". Both sides made reasonable points, but the outcome hinged on how much evidence and direct rebuttal each side produced.`;

  const strongestArgument = longest ? longest.slice(0, 240) : '';
  const weakestArgument = shortest ? shortest.slice(0, 240) : '';

  return {
    overallScore,
    userScore,
    aiScore: aiAdj,
    scores: {
      argumentQuality,
      logicalReasoning,
      evidence,
      rebuttalQuality,
      consistency,
      persuasiveness,
    },
    winner,
    explanation,
    strongestArgument,
    weakestArgument,
    improvementTips: [
      evidence < 60
        ? 'Support each central claim with a concrete example, statistic, or named case.'
        : 'Keep grounding claims in concrete evidence as you did — now sharpen your rebuttals.',
      rebuttalQuality < 70
        ? 'Explicitly restate and then answer the strongest objection to your side.'
        : 'Pre-empt the opponent’s best move before they make it.',
      consistency < 70
        ? 'Make sure every new argument agrees with positions you took earlier.'
        : 'Tie each new argument back to your core thesis to keep the case coherent.',
    ],
  };
}
