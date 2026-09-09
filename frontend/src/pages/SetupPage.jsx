import { useState } from 'react';
import Button from '../components/Button.jsx';
import { ArrowRightIcon, HomeIcon, ScaleIcon } from '../components/Icons.jsx';

const EXAMPLE_TOPIC = 'Should social media platforms be responsible for misinformation?';
const DIFFICULTIES = ['Beginner', 'Intermediate', 'Advanced'];

function classNames(...values) {
  return values.filter(Boolean).join(' ');
}

export default function SetupPage({ defaults = null, onBack, onStart }) {
  const [topic, setTopic] = useState(defaults?.topic || '');
  const [position, setPosition] = useState(defaults?.userPosition || null);
  const [difficulty, setDifficulty] = useState(defaults?.difficulty || 'Intermediate');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function submit(event) {
    event.preventDefault();
    if (submitting) return;
    if (!topic.trim()) {
      setError('Please enter a debate topic.');
      return;
    }
    if (!position) {
      setError('Please choose your position: FOR or AGAINST.');
      return;
    }
    setError('');
    setSubmitting(true);
    onStart({ topic: topic.trim(), userPosition: position, difficulty });
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-10">
      <div className="mb-6 flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack} disabled={submitting}>
          <HomeIcon className="h-4 w-4" />
          Back to Home
        </Button>
      </div>

      <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-8">
        <div className="mb-6 text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
            <ScaleIcon className="h-6 w-6" />
          </span>
          <h1 className="mt-3 text-2xl font-bold text-slate-900">Set Up Your Debate</h1>
          <p className="mt-1 text-sm text-slate-500">
            Choose a topic and a side — the AI will argue the opposite side.
          </p>
        </div>

        <form onSubmit={submit} className="space-y-6">
          {/* Topic */}
          <div>
            <label htmlFor="topic" className="mb-1.5 block text-sm font-semibold text-slate-700">
              Debate Topic
            </label>
            <input
              id="topic"
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="Enter your debate topic"
              maxLength={300}
              disabled={submitting}
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50 disabled:text-slate-400"
            />
            <p className="mt-2 text-xs text-slate-500">
              Hint: try{' '}
              <button
                type="button"
                onClick={() => setTopic(EXAMPLE_TOPIC)}
                disabled={submitting}
                className="font-medium text-blue-600 underline decoration-blue-200 underline-offset-2 hover:text-blue-700 disabled:text-slate-400"
              >
                {EXAMPLE_TOPIC}
              </button>
            </p>
          </div>

          {/* Position */}
          <div>
            <span className="mb-1.5 block text-sm font-semibold text-slate-700">
              Choose Your Position
            </span>
            <div className="grid grid-cols-2 gap-3">
              {['for', 'against'].map((value) => {
                const selected = position === value;
                const label = value === 'for' ? 'FOR' : 'AGAINST';
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setPosition(value)}
                    disabled={submitting}
                    aria-pressed={selected}
                    className={classNames(
                      'rounded-xl border-2 px-4 py-4 text-center transition disabled:opacity-50',
                      selected
                        ? value === 'for'
                          ? 'border-blue-600 bg-blue-50 text-blue-700'
                          : 'border-amber-500 bg-amber-50 text-amber-700'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                    )}
                  >
                    <span className="block text-base font-bold">{label}</span>
                    <span className="mt-0.5 block text-xs text-slate-500">
                      {value === 'for'
                        ? 'You support the topic'
                        : 'You oppose the topic'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Difficulty */}
          <div>
            <span className="mb-1.5 block text-sm font-semibold text-slate-700">Difficulty</span>
            <div className="grid grid-cols-3 gap-3">
              {DIFFICULTIES.map((level) => {
                const selected = difficulty === level;
                return (
                  <button
                    key={level}
                    type="button"
                    onClick={() => setDifficulty(level)}
                    disabled={submitting}
                    aria-pressed={selected}
                    className={classNames(
                      'rounded-xl border-2 px-3 py-2.5 text-sm font-medium transition disabled:opacity-50',
                      selected
                        ? 'border-blue-600 bg-blue-50 text-blue-700'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                    )}
                  >
                    {level}
                  </button>
                );
              })}
            </div>
          </div>

          {error && (
            <p className="rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-600 ring-1 ring-red-100">
              {error}
            </p>
          )}

          <Button type="submit" size="lg" loading={submitting} disabled={submitting} className="w-full justify-center">
            Start Debate
            <ArrowRightIcon className="h-5 w-5" />
          </Button>
        </form>
      </div>
    </div>
  );
}
