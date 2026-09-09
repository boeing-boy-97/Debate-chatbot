import Button from './Button.jsx';
import { SparklesIcon } from './Icons.jsx';

/**
 * One row of the debate. `message` is either:
 *   { type: 'user', text }        — the user's argument
 *   { type: 'ai', text, sections, analysis } — AI reply with optional structured sections
 * A plain-text AI reply (e.g. the opening statement) renders as text.
 */
export default function MessageBubble({ message, onAnalyze, analyzing }) {
  if (message.type === 'user') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] sm:max-w-[75%]">
          <div className="mb-1 text-right text-xs font-semibold uppercase tracking-wide text-blue-600">
            You
          </div>
          <div className="rounded-2xl rounded-tr-sm bg-blue-600 px-4 py-3 text-sm leading-relaxed text-white shadow-sm">
            {message.text}
          </div>
        </div>
      </div>
    );
  }

  const hasSections = message.sections && (message.sections.counterargument || message.sections.why || message.sections.challenge);

  return (
    <div className="flex items-start gap-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-700 text-sm font-bold text-white">
        AI
      </div>
      <div className="max-w-[85%] min-w-0 sm:max-w-[75%]">
        <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
          AI Opponent
        </div>
        <div className="rounded-2xl rounded-tl-sm bg-white px-4 py-3 text-sm leading-relaxed text-slate-800 shadow-sm ring-1 ring-slate-200">
          {hasSections ? (
            <div className="space-y-3">
              {message.sections.counterargument && (
                <div>
                  <p className="mb-0.5 text-xs font-bold uppercase tracking-wide text-blue-600">
                    Counterargument
                  </p>
                  <p>{message.sections.counterargument}</p>
                </div>
              )}
              {message.sections.why && (
                <div>
                  <p className="mb-0.5 text-xs font-bold uppercase tracking-wide text-slate-500">
                    Why
                  </p>
                  <p>{message.sections.why}</p>
                </div>
              )}
              {message.sections.challenge && (
                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="mb-0.5 text-xs font-bold uppercase tracking-wide text-slate-500">
                    Challenge
                  </p>
                  <p className="italic">{message.sections.challenge}</p>
                </div>
              )}
            </div>
          ) : (
            <p>{message.text}</p>
          )}
        </div>

        {/* Separate argument analysis for the user's argument before this AI reply. */}
        {onAnalyze && (
          <div className="mt-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={onAnalyze}
              disabled={analyzing}
              loading={analyzing}
            >
              <SparklesIcon className="h-4 w-4" />
              {analyzing ? 'Analyzing argument...' : 'Analyze My Argument'}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
