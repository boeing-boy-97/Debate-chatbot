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
    scores,
    winner,
    explanation,
    strongestArgument,
    weakestArgument,
    improvementTips,
  } = evaluation;

  const categories = [
    ['Argument Quality', scores.argumentQuality],
    ['Logical Reasoning', scores.logicalReasoning],
    ['Evidence', scores.evidence],
    ['Rebuttal Quality', scores.rebuttalQuality],
    ['Consistency', scores.consistency],
    ['Persuasiveness', scores.persuasiveness],
  ];

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
          className={`rounded-full px-3 py-1 text-sm font-semibold ring-1 ${WINNER_STYLES[winner] || WINNER_STYLES.tie}`}
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

      <div className="mt-5 space-y-3 text-sm leading-relaxed text-slate-700">
        <p className="rounded-xl bg-slate-50 p-3">{explanation || 'The AI did not provide an explanation.'}</p>
        <p>
          <span className="font-semibold text-slate-800">Strongest argument: </span>
          {strongestArgument || '—'}
        </p>
        <p>
          <span className="font-semibold text-slate-800">Weakest argument: </span>
          {weakestArgument || '—'}
        </p>
        <div>
          <p className="font-semibold text-slate-800">Improvement tips</p>
          <ul className="mt-1 space-y-1">
            {improvementTips.map((tip, index) => (
              <li key={index} className="flex gap-2">
                <span className="mt-0.5 text-blue-600">
                  <CheckIcon className="h-4 w-4" />
                </span>
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <p className="mt-4 text-xs text-slate-400">
        This verdict is an AI evaluation of the debate — not an objective truth.
      </p>

      <div className="mt-5 flex flex-wrap gap-2">
        <Button onClick={onSave} disabled={saved} loading={false}>
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
