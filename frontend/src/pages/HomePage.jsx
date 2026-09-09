import Button from '../components/Button.jsx';
import ConfirmButton from '../components/ConfirmButton.jsx';
import ApiStatus from '../components/ApiStatus.jsx';
import { ArrowRightIcon, BoltIcon, ChartIcon, ClockIcon, ScaleIcon, TrashIcon, ChevronRightIcon } from '../components/Icons.jsx';

const FEATURES = [
  {
    icon: BoltIcon,
    title: 'Real-time AI Opponent',
    text: 'Debate against an AI that takes the opposite side and responds instantly.',
  },
  {
    icon: ScaleIcon,
    title: 'Logical Counterarguments',
    text: 'Every argument is challenged with reasoning, not just agreement.',
  },
  {
    icon: ChartIcon,
    title: 'Debate Analysis',
    text: 'Score your arguments and get a full evaluation at the end.',
  },
  {
    icon: ClockIcon,
    title: 'Debate History',
    text: 'Previous debates are saved on your device so you can revisit them.',
  },
];

const WINNER_LABELS = { user: 'You won', ai: 'AI won', tie: 'Too close to call' };

function formatDate(iso) {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return '';
  }
}

export default function HomePage({ history, onStart, onOpenDebate, onDelete, onClearAll }) {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-10 sm:py-16">
      {/* Hero */}
      <section className="text-center">
        <span className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-4 py-1.5 text-sm font-medium text-blue-700 ring-1 ring-blue-100">
          <BoltIcon className="h-4 w-4" />
          Think. Argue. Improve.
        </span>
        <h1 className="mt-4 text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">
          Debate <span className="text-blue-600">AI</span>
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-base text-slate-600 sm:text-lg">
          Challenge your ideas by debating with an AI opponent.
        </p>
        <div className="mt-7">
          <Button size="lg" onClick={onStart} className="shadow-md shadow-blue-600/20">
            Start a Debate
            <ArrowRightIcon className="h-5 w-5" />
          </Button>
        </div>
        <div className="mt-4">
          <ApiStatus />
        </div>
      </section>

      {/* Feature cards */}
      <section className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {FEATURES.map(({ icon: Icon, title, text }) => (
          <div
            key={title}
            className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 transition hover:shadow-md"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <Icon className="h-5 w-5" />
            </div>
            <h3 className="mt-3 font-semibold text-slate-900">{title}</h3>
            <p className="mt-1 text-sm leading-relaxed text-slate-500">{text}</p>
          </div>
        ))}
      </section>

      {/* Previous debates */}
      <section className="mt-14">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-900">Previous Debates</h2>
          {history.length > 0 && (
            <ConfirmButton
              label="Delete History"
              confirmLabel="Confirm Delete"
              icon={<TrashIcon className="h-4 w-4" />}
              onConfirm={onClearAll}
              aria-label="Delete all history"
            />
          )}
        </div>

        {history.length === 0 ? (
          <div className="rounded-2xl bg-white p-8 text-center shadow-sm ring-1 ring-slate-200">
            <p className="text-sm text-slate-500">
              No debates yet. Start a debate and your results will appear here.
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {history.map((item) => (
              <li key={item.id}>
                <div className="group flex items-center gap-4 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200 transition hover:shadow-md">
                  <button
                    type="button"
                    onClick={() => onOpenDebate(item)}
                    className="min-w-0 flex-1 cursor-pointer rounded-xl text-left outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                  >
                    <p className="truncate font-semibold text-slate-900">{item.topic}</p>
                    <p className="mt-1 text-sm text-slate-500">
                      <span className="font-medium uppercase text-blue-600">
                        {item.userPosition === 'for' ? 'You: FOR' : 'You: AGAINST'}
                      </span>
                      <span className="mx-2 text-slate-300">•</span>
                      {formatDate(item.date)}
                      {item.score != null && (
                        <>
                          <span className="mx-2 text-slate-300">•</span>
                          Score {item.score}/100
                        </>
                      )}
                      {item.result && (
                        <>
                          <span className="mx-2 text-slate-300">•</span>
                          {WINNER_LABELS[item.result] || item.result}
                        </>
                      )}
                    </p>
                  </button>
                  <button
                    type="button"
                    onClick={() => onOpenDebate(item)}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-50 text-slate-500 transition group-hover:bg-blue-50 group-hover:text-blue-600"
                    aria-label={`Open debate: ${item.topic}`}
                  >
                    <ChevronRightIcon className="h-4 w-4" />
                  </button>
                  <ConfirmButton
                    label="Delete"
                    confirmLabel="Confirm"
                    icon={<TrashIcon className="h-4 w-4" />}
                    onConfirm={() => onDelete(item.id)}
                    aria-label="Delete debate entry"
                    className="shrink-0"
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
