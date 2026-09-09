// Shows the result of "Analyze My Argument" — kept visually separate from the debate.

function scoreColor(score) {
  if (score >= 8) return 'text-emerald-600';
  if (score >= 5) return 'text-amber-600';
  return 'text-red-500';
}

export default function AnalysisCard({ analysis }) {
  const {
    score,
    argumentStrength,
    logic,
    evidenceQuality,
    evidence, // fallback for legacy data
    relevance,
    clarity,
    rebuttalStrength,
    weakness, // fallback for legacy data
    logicalFallacies,
    improvement,
  } = analysis;

  const displayScore = score ?? (argumentStrength ? Math.round(argumentStrength / 10) : 5);
  const displayEvidence = evidenceQuality || evidence || 'No evidence assessment provided.';
  const displayRebuttal = rebuttalStrength || weakness || 'No rebuttal assessment provided.';
  const displayFallacies = logicalFallacies || 'No clear logical fallacy detected.';

  return (
    <div className="mt-3 rounded-2xl border border-blue-100 bg-blue-50/60 p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-slate-800">Argument Analysis</p>
          {argumentStrength != null && (
            <p className="text-xs text-slate-500">Strength Rating: {argumentStrength}/100</p>
          )}
        </div>
        <div className="flex items-baseline gap-1">
          <span className={`text-2xl font-bold ${scoreColor(displayScore)}`}>{displayScore}</span>
          <span className="text-xs font-medium text-slate-500">/10</span>
        </div>
      </div>

      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
        <div className="rounded-xl bg-white p-3 ring-1 ring-slate-200/60">
          <dt className="font-semibold text-slate-700">Logic</dt>
          <dd className="mt-0.5 break-words text-slate-600">{logic}</dd>
        </div>

        <div className="rounded-xl bg-white p-3 ring-1 ring-slate-200/60">
          <dt className="font-semibold text-slate-700">Evidence Quality</dt>
          <dd className="mt-0.5 break-words text-slate-600">{displayEvidence}</dd>
        </div>

        {relevance && (
          <div className="rounded-xl bg-white p-3 ring-1 ring-slate-200/60">
            <dt className="font-semibold text-slate-700">Relevance</dt>
            <dd className="mt-0.5 break-words text-slate-600">{relevance}</dd>
          </div>
        )}

        {clarity && (
          <div className="rounded-xl bg-white p-3 ring-1 ring-slate-200/60">
            <dt className="font-semibold text-slate-700">Clarity</dt>
            <dd className="mt-0.5 break-words text-slate-600">{clarity}</dd>
          </div>
        )}

        <div className="rounded-xl bg-white p-3 ring-1 ring-slate-200/60 sm:col-span-2">
          <dt className="font-semibold text-slate-700">Rebuttal & Weak Points</dt>
          <dd className="mt-0.5 break-words text-slate-600">{displayRebuttal}</dd>
        </div>

        <div className="rounded-xl bg-white p-3 ring-1 ring-slate-200/60 sm:col-span-2">
          <dt className="font-semibold text-slate-700">Logical Fallacies</dt>
          <dd className="mt-0.5 break-words text-slate-600">{displayFallacies}</dd>
        </div>

        <div className="rounded-xl bg-white p-3 ring-1 ring-blue-100 sm:col-span-2">
          <dt className="font-semibold text-blue-700">How to Improve</dt>
          <dd className="mt-0.5 break-words text-slate-700">{improvement}</dd>
        </div>
      </dl>
    </div>
  );
}
