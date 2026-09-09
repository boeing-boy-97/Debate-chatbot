// Shows the result of "Analyze My Argument" — kept visually separate from the debate.

function scoreColor(score) {
  if (score >= 8) return 'text-emerald-600';
  if (score >= 5) return 'text-amber-600';
  return 'text-red-500';
}

export default function AnalysisCard({ analysis }) {
  const { score, logic, evidence, weakness, improvement } = analysis;
  return (
    <div className="mt-2 rounded-2xl border border-blue-100 bg-blue-50/60 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-slate-800">Argument Analysis</p>
        <div className="flex items-baseline gap-1">
          <span className={`text-2xl font-bold ${scoreColor(score)}`}>{score}</span>
          <span className="text-xs font-medium text-slate-500">/10</span>
        </div>
      </div>

      <dl className="mt-3 space-y-3 text-sm">
        <div>
          <dt className="font-semibold text-slate-700">Logic</dt>
          <dd className="mt-0.5 text-slate-600">{logic}</dd>
        </div>
        <div>
          <dt className="font-semibold text-slate-700">Evidence</dt>
          <dd className="mt-0.5 text-slate-600">{evidence}</dd>
        </div>
        <div>
          <dt className="font-semibold text-slate-700">Weak Point</dt>
          <dd className="mt-0.5 text-slate-600">{weakness}</dd>
        </div>
        <div className="rounded-xl bg-white p-3 ring-1 ring-blue-100">
          <dt className="font-semibold text-blue-700">How to Improve</dt>
          <dd className="mt-0.5 text-slate-700">{improvement}</dd>
        </div>
      </dl>
    </div>
  );
}
