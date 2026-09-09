import Button from './Button.jsx';
import ScoreBar from './ScoreBar.jsx';
import { CheckIcon, SparklesIcon, TrophyIcon } from './Icons.jsx';

const WINNER_LABELS = { user: 'You won', ai: 'AI won', tie: 'Too close to call' };
const WINNER_STYLES = {
  user: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  ai: 'bg-slate-100 text-slate-700 ring-slate-300',
  tie: 'bg-amber-50 text-amber-700 ring-amber-200',
};

export default function EvaluationCard({ evaluation, saved, onSave, onNewDebate, onHome }) {
  const {
    overallScore,
    scores = {},
    winner,
    explanation,
    strengths = [],
    weaknesses = [],
    strongestArgument,
    weakestArgument,
    aiStrongestCounter,
    logicalFallacies,
    improvementTips = [],
  } = evaluation;

  const categories = [
    ['Argument Quality', scores.argumentQuality ?? 50],
    ['Logical Reasoning', scores.logicalReasoning ?? 50],
    ['Evidence', scores.evidence ?? 50],
    ['Rebuttal Quality', scores.rebuttalQuality ?? 50],
    ['Consistency', scores.consistency ?? 50],
    ['Persuasiveness', scores.persuasiveness ?? 50],
  ];

  const fallaciesText = logicalFallacies || 'No clear logical fallacy detected.';

  return (
    <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            <TrophyIcon className="h-5 w-5" />
          </span>
          <h2 className="text-lg font-bold text-slate-900">Debate Results</h2>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-sm font-semibold ring-1 ${
            WINNER_STYLES[winner] || WINNER_STYLES.tie
          }`}
        >
          {WINNER_LABELS[winner] || WINNER_LABELS.tie}
        </span>
      </div>

      <div className="mt-5 grid gap-6 md:grid-cols-[auto_1fr]">
        {/* Overall score */}
        <div className="flex flex-col items-center justify-center rounded-2xl bg-blue-600 px-8 py-6 text-white md:min-w-[160px]">
          <span className="text-4xl font-extrabold">{overallScore}</span>
          <span className="text-sm text-blue-100">/ 100 Overall</span>
        </div>

        {/* Category scores */}
        <div className="grid gap-4 sm:grid-cols-2">
          {categories.map(([label, score]) => (
            <ScoreBar key={label} label={label} score={score} />
          ))}
        </div>
      </div>

      <div className="mt-6 space-y-4 text-sm leading-relaxed text-slate-700">
        <div className="rounded-xl bg-slate-50 p-4 ring-1 ring-slate-200/60">
          <p className="font-bold text-slate-900">Summary Verdict</p>
          <p className="mt-1 break-words">{explanation || 'No summary verdict provided.'}</p>
        </div>

        {/* Strengths & Weaknesses */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl bg-emerald-50/50 p-4 ring-1 ring-emerald-100">
            <p className="font-bold text-emerald-900">Strengths</p>
            {strengths.length > 0 ? (
              <ul className="mt-2 space-y-1.5 text-emerald-800">
                {strengths.map((item, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="mt-0.5 shrink-0 text-emerald-600">•</span>
                    <span className="break-words">{item}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-1 text-emerald-700">—</p>
            )}
          </div>

          <div className="rounded-xl bg-amber-50/50 p-4 ring-1 ring-amber-100">
            <p className="font-bold text-amber-900">Weaknesses</p>
            {weaknesses.length > 0 ? (
              <ul className="mt-2 space-y-1.5 text-amber-800">
                {weaknesses.map((item, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="mt-0.5 shrink-0 text-amber-600">•</span>
                    <span className="break-words">{item}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-1 text-amber-700">—</p>
            )}
          </div>
        </div>

        {/* Arguments analysis */}
        <div className="space-y-3 rounded-xl bg-white p-4 ring-1 ring-slate-200">
          <div>
            <p className="font-bold text-slate-800">Strongest Argument</p>
            <p className="mt-0.5 break-words text-slate-600">{strongestArgument || '—'}</p>
          </div>
          <div>
            <p className="font-bold text-slate-800">Weakest Argument</p>
            <p className="mt-0.5 break-words text-slate-600">{weakestArgument || '—'}</p>
          </div>
          {aiStrongestCounter && (
            <div>
              <p className="font-bold text-slate-800">AI's Strongest Counterargument</p>
              <p className="mt-0.5 break-words text-slate-600">{aiStrongestCounter}</p>
            </div>
          )}
          <div>
            <p className="font-bold text-slate-800">Logical Fallacies</p>
            <p className="mt-0.5 break-words text-slate-600">{fallaciesText}</p>
          </div>
        </div>

        {/* How to Improve */}
        <div className="rounded-xl bg-blue-50/50 p-4 ring-1 ring-blue-100">
          <p className="font-bold text-blue-900">How to Improve</p>
          <ul className="mt-2 space-y-1.5">
            {improvementTips.map((tip, index) => (
              <li key={index} className="flex gap-2 text-slate-700">
                <span className="mt-0.5 shrink-0 text-blue-600">
                  <CheckIcon className="h-4 w-4" />
                </span>
                <span className="break-words">{tip}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <p className="mt-4 text-xs text-slate-400">
        This verdict is an AI evaluation of the debate — not an objective truth.
      </p>

      <div className="mt-5 flex flex-wrap gap-2">
        <Button onClick={onSave} disabled={saved}>
          {saved ? (
            <>
              <CheckIcon className="h-4 w-4" /> Saved to History
            </>
          ) : (
            'Save to History'
          )}
        </Button>
        <Button variant="secondary" onClick={onNewDebate}>
          <SparklesIcon className="h-4 w-4" /> New Debate
        </Button>
        <Button variant="ghost" onClick={onHome}>
          Back to Home
        </Button>
      </div>
    </section>
  );
}
