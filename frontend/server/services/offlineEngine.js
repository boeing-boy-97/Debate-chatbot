/**
 * Offline (demo) debate engine.
 *
 * Deterministic, locally-computed fallback used ONLY when the AI service cannot be reached.
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

function sideLabel(position) {
  return position === 'for' ? 'FOR' : 'AGAINST';
}

function clamp(n, min, max) {
  const num = Number(n);
  if (!Number.isFinite(num)) return min;
  return Math.max(min, Math.min(max, Math.round(num)));
}

function wordsCount(t) {
  return clean(t).split(/\s+/).filter(Boolean).length;
}

function strength(text) {
  const t = clean(text);
  const words = wordsCount(t);
  const sentences = t.split(/[.!?]+/).filter((s) => s.trim()).length || 1;
  let score = 30 + Math.min(35, words * 1.6) + Math.min(25, sentences * 5);
  if (/because|therefore|thus|since|however|but|for example|evidence|data|research/.test(t)) {
    score += 8;
  }
  if (/(percent|\b%|\bcosts?\b|\bbenefit)/i.test(t)) score += 5;
  return clamp(score, 15, 96);
}

/* ------------------------------ opening ------------------------------ */

export function offlineOpening({ topic, userPosition }) {
  const cleanTopic = clean(topic, 'the topic');
  const aiPosition = userPosition === 'for' ? 'against' : 'for';
  return (
    `I will argue ${sideLabel(aiPosition)} the statement: "${cleanTopic}".\n\n` +
    `Taking this side requires examining the trade-offs and unstated assumptions behind the statement. ` +
    `Opening challenge: what is the single strongest piece of evidence or reasoning supporting your view, and how do you address the main counterargument?`
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
    counterargument = `On "${cleanTopic}", a clear claim is needed to engage in debate.`;
    why = `A debate requires a falsifiable thesis with supporting premises.`;
    challenge = `What is your main assertion regarding "${cleanTopic}"?`;
  } else if (asksQuestion) {
    counterargument = `While that is an important question regarding "${cleanTopic}", reframing the debate does not resolve the central disagreement.`;
    why = `Debates require committing to a specific thesis and defending the associated trade-offs rather than raising questions.`;
    challenge = `What specific policy or principle on "${cleanTopic}" are you prepared to defend?`;
  } else if (short) {
    counterargument = `Regarding your claim that "${snippet}", this assertion overlooks significant counterexamples on "${cleanTopic}".`;
    why = `Brief assertions sound plausible initially, but they fail to account for second-order consequences and systemic trade-offs.`;
    challenge = `How does your position handle the strongest practical counterexample on "${cleanTopic}"?`;
  } else {
    counterargument = `While you argue that "${snippet}", that argument focuses on isolated benefits while ignoring systemic drawbacks.`;
    why = `A complete position must weigh both costs and benefits rather than assuming one side has no downside.`;
    challenge = `What major trade-off does your position create on "${cleanTopic}", and why is that trade-off acceptable?`;
  }

  return { counterargument, why, challenge };
}

/* ------------------------------ analysis ------------------------------ */

export function offlineAnalysis({ topic, argument }) {
  const cleanTopic = clean(topic, 'the topic');
  const arg = clean(argument, '');
  const s = strength(arg);
  const score = clamp(Math.round((s / 100) * 10), 1, 10);
  const hasReasoning = /because|therefore|so|since|thus|but|however|means/.test(arg);
  const hasExample = /for example|for instance|e\.g|such as|like|consider|percent|%|data|research|study/.test(arg);

  const logic = hasReasoning
    ? `The argument links a premise to a conclusion using causal connectives.`
    : `The argument states a position with limited explicit logical connection between premise and conclusion.`;

  const evidenceQuality = hasExample
    ? `Concrete example or empirical indicator provided to ground the claim.`
    : `The argument relies on assertion rather than verifiable evidence or data.`;

  const relevance = `Directly addresses the topic "${cleanTopic}".`;
  const clarity = `Clear and understandable presentation.`;
  const rebuttalStrength = `The argument states its thesis but leaves key counter-objections unaddressed.`;
  const logicalFallacies = 'No clear logical fallacy detected.';

  const improvement = hasReasoning && hasExample
    ? `State your core claim, provide one piece of verifiable evidence, and pre-empt the primary counterargument.`
    : `Add concrete evidence or a specific real-world example, and explain why it proves your premise.`;

  return {
    score,
    argumentStrength: s,
    logic,
    evidenceQuality,
    relevance,
    clarity,
    rebuttalStrength,
    logicalFallacies,
    improvement,
  };
}

/* ----------------------------- evaluation ----------------------------- */

export function offlineEvaluation({ topic, conversation }) {
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
      explanation: `Not enough debate content to evaluate yet for "${cleanTopic}".`,
      strengths: [],
      weaknesses: [],
      strongestArgument: '',
      weakestArgument: '',
      aiStrongestCounter: '',
      logicalFallacies: 'No clear logical fallacy detected.',
      improvementTips: ['Provide at least one complete argument to evaluate.'],
    };
  }

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
  const aiAdj = Math.max(45, Math.min(90, avgUser + 8));

  const argumentQuality = clamp(avgUser + 4, 0, 100);
  const logicalReasoning = clamp(avgUser + 2, 0, 100);
  const evidence = clamp(avgUser - 6, 0, 100);
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
      ? `You maintained a clear stance on "${cleanTopic}" and successfully addressed counterpoints.`
      : winner === 'ai'
        ? `The AI presented strong counterarguments that exposed unaddressed trade-offs in your position on "${cleanTopic}".`
        : `A balanced debate on "${cleanTopic}". Both sides established valid points with room for deeper evidence.`;

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
    strengths: [
      'Maintained a consistent position throughout the debate.',
      'Engaged directly with the topic.',
    ],
    weaknesses: [
      'Could incorporate more concrete statistics or empirical examples.',
      'Pre-empting opposing objections would make the case stronger.',
    ],
    strongestArgument: longest ? longest.slice(0, 240) : '',
    weakestArgument: shortest ? shortest.slice(0, 240) : '',
    aiStrongestCounter: `Highlighted key trade-offs and second-order effects of your position on "${cleanTopic}".`,
    logicalFallacies: 'No clear logical fallacy detected.',
    improvementTips: [
      'Support claims with concrete data or real-world case studies.',
      'Explicitly acknowledge and counter the opponent’s best points.',
      'Connect each claim directly back to your central thesis.',
    ],
  };
}
