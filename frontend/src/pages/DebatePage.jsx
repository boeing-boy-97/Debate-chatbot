import { useEffect, useMemo, useRef, useState } from 'react';
import Button from '../components/Button.jsx';
import ConfirmButton from '../components/ConfirmButton.jsx';
import MessageBubble from '../components/MessageBubble.jsx';
import ThinkingIndicator from '../components/ThinkingIndicator.jsx';
import AnalysisCard from '../components/AnalysisCard.jsx';
import EvaluationCard from '../components/EvaluationCard.jsx';
import {
  HomeIcon,
  RefreshIcon,
  SendIcon,
  StopIcon,
  TrashIcon,
  AlertIcon,
  ChartIcon,
  BoltIcon,
} from '../components/Icons.jsx';
import * as api from '../services/api.js';
import { saveDebate, updateDebate } from '../services/history.js';
import uid from '../services/uid.js';

/** Plain-text version of an AI message (with or without structured sections). */
function aiText(message) {
  if (!message.sections) return message.text || '';
  const { counterargument, why, challenge } = message.sections;
  return [
    counterargument && `Counterargument: ${counterargument}`,
    why && `Why: ${why}`,
    challenge && `Challenge: ${challenge}`,
  ]
    .filter(Boolean)
    .join('\n');
}

/** Convert UI messages into the conversation format the backend expects. */
function toApiConversation(messages) {
  return messages.map((m) => ({
    role: m.type === 'user' ? 'user' : 'assistant',
    content: m.type === 'user' ? m.text : aiText(m),
  }));
}

function withIds(list = []) {
  return list.map((m, index) => ({ ...m, id: m.id || `message-${Date.now()}-${index}` }));
}

const POSITION_LABEL = { for: 'FOR', against: 'AGAINST' };

export default function DebatePage({ debate, onHome, onRestart, onHistoryChanged }) {
  const { topic, userPosition, difficulty, initialMessages } = debate;
  const aiPosition = userPosition === 'for' ? 'against' : 'for';

  const [messages, setMessages] = useState(() => withIds(initialMessages));
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState(null); // used by the Retry button
  const [analyzingId, setAnalyzingId] = useState(null);
  const [evaluating, setEvaluating] = useState(false);
  const [evaluation, setEvaluation] = useState(debate.initialEvaluation || null);
  const [ended, setEnded] = useState(false);
  const [saved, setSaved] = useState(Boolean(debate.initialEvaluation));
  const [inputError, setInputError] = useState('');
  const [apiError, setApiError] = useState('');
  const [apiErrorCode, setApiErrorCode] = useState('');
  const [offlineMode, setOfflineMode] = useState(false);

  function showError(error) {
    setApiError(error?.message || 'Something went wrong. Please try again.');
    setApiErrorCode(error?.code || '');
  }

  function clearError() {
    setApiError('');
    setApiErrorCode('');
  }

  const started = useRef(false);
  const scrollRef = useRef(null);

  const hasUserArguments = useMemo(
    () => messages.some((m) => m.type === 'user'),
    [messages]
  );

  // Auto-start the debate when the page opens without a saved conversation.
  useEffect(() => {
    if (started.current || initialMessages?.length) return;
    started.current = true;
    runStart();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep the newest message in view.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, busy, evaluating, evaluation]);

  async function runStart() {
    setBusy(true);
    clearError();
    try {
      const res = await api.startDebate({ topic, userPosition, difficulty });
      setMessages([{ type: 'ai', text: res.reply, id: uid('message') }]);
      if (res.mode === 'offline') setOfflineMode(true);
      setPending(null);
    } catch (error) {
      showError(error);
      setPending({ type: 'start' });
      setMessages([]);
    } finally {
      setBusy(false);
    }
  }

  async function sendArgument() {
    const value = input.trim();
    if (!value) {
      setInputError('Please enter an argument first.');
      return;
    }
    setInputError('');
    clearError();
    const next = [...messages, { type: 'user', text: value, id: uid('message') }];
    setMessages(next);
    setInput('');
    setBusy(true);
    try {
      const res = await api.sendMessage({
        topic,
        userPosition,
        aiPosition,
        difficulty,
        conversation: toApiConversation(next),
      });
      setMessages([...next, { type: 'ai', sections: res.reply, id: uid('message') }]);
      if (res.mode === 'offline') setOfflineMode(true);
    } catch (error) {
      showError(error);
      setPending({ type: 'send', argument: value });
    } finally {
      setBusy(false);
    }
  }

  async function retrySend() {
    clearError();
    setBusy(true);
    try {
      const res = await api.sendMessage({
        topic,
        userPosition,
        aiPosition,
        difficulty,
        conversation: toApiConversation(messages),
      });
      setMessages([...messages, { type: 'ai', sections: res.reply, id: uid('message') }]);
      if (res.mode === 'offline') setOfflineMode(true);
      setPending(null);
    } catch (error) {
      showError(error);
    } finally {
      setBusy(false);
    }
  }

  function doAnalyze(userMessage, aiMessage) {
    clearError();
    setAnalyzingId(aiMessage.id);
    return api
      .analyzeArgument({
        topic,
        userPosition,
        difficulty,
        argument: userMessage.text,
        lastAiResponse: aiText(aiMessage),
      })
      .then((res) => {
        setMessages((list) =>
          list.map((m) => (m.id === aiMessage.id ? { ...m, analysis: res.analysis } : m))
        );
        if (res.mode === 'offline') setOfflineMode(true);
        setPending(null);
      })
      .catch((error) => {
        showError(error);
        setPending({ type: 'analyze', userMessage, aiMessage });
      })
      .finally(() => setAnalyzingId(null));
  }

  /** Get a score for the debate; pass final=true to finish the debate. */
  async function runEvaluate(final = false) {
    if (!hasUserArguments) {
      showError({ message: 'Send at least one argument before scoring the debate.' });
      return;
    }
    clearError();
    setEvaluating(true);
    try {
      const res = await api.evaluateDebate({
        topic,
        userPosition,
        aiPosition,
        difficulty,
        conversation: toApiConversation(messages),
      });
      setEvaluation(res.evaluation);
      setSaved(false);
      if (res.mode === 'offline') setOfflineMode(true);
      setPending(null);
      if (final) setEnded(true);
    } catch (error) {
      showError(error);
      setPending({ type: 'evaluate', final });
    } finally {
      setEvaluating(false);
    }
  }

  function clearChat() {
    setMessages([]);
    setEvaluation(null);
    setEnded(false);
    setSaved(false);
    clearError();
    setPending(null);
    runStart();
  }

  function saveToHistory() {
    if (!evaluation || saved) return;
    const entry = {
      topic,
      userPosition,
      difficulty,
      score: evaluation.overallScore,
      result: evaluation.winner,
      messages,
      evaluation,
    };
    // Update the entry when resuming from history; otherwise create a new one.
    if (!updateDebate(debate.id, entry)) {
      saveDebate(entry);
    }
    setSaved(true);
    onHistoryChanged();
  }

  function retry() {
    if (!pending) return;
    if (pending.type === 'start') return runStart();
    if (pending.type === 'send') return retrySend();
    if (pending.type === 'analyze') return doAnalyze(pending.userMessage, pending.aiMessage);
    if (pending.type === 'evaluate') return runEvaluate(pending.final);
  }

  const busyOrEvaluating = busy || evaluating;
  const controlsDisabled = busyOrEvaluating || ended;
  const isUnconfigured =
    apiErrorCode === 'unconfigured' || apiError === 'AI service is not configured.';
  const isApiDown = ['api-missing', 'bad-response', 'network'].includes(apiErrorCode);

  return (
    <div className="mx-auto flex h-dvh w-full max-w-3xl flex-col px-3 py-3 sm:px-4">
      {/* Header */}
      <header className="rounded-2xl bg-white px-4 py-3 shadow-sm ring-1 ring-slate-200 sm:px-5">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onHome}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
            aria-label="Go to home page"
          >
            <HomeIcon className="h-4 w-4" />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-sm font-bold text-slate-900 sm:text-base">
              Debate Topic
            </h1>
            <p className="truncate text-sm text-slate-600">{topic}</p>
          </div>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs font-medium">
          <span className="rounded-full bg-blue-50 px-2.5 py-1 text-blue-700 ring-1 ring-blue-100">
            You: {POSITION_LABEL[userPosition]}
          </span>
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-600 ring-1 ring-slate-200">
            AI: {POSITION_LABEL[aiPosition]}
          </span>
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-500 ring-1 ring-slate-200">
            {difficulty}
          </span>
        </div>
      </header>

      {offlineMode && (
        <div className="mt-3 flex items-center gap-2 rounded-xl bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800 ring-1 ring-amber-200">
          <BoltIcon className="h-3.5 w-3.5 shrink-0" />
          <span>
            <span className="font-bold">Offline replies</span> — the AI service isn't reachable
            right now, so responses are generated locally on this device. Set an OpenAI key and a
            network connection to enable live AI debate.
          </span>
        </div>
      )}

      {/* Conversation */}
      <div
        ref={scrollRef}
        className="nice-scroll mt-3 flex-1 space-y-5 overflow-y-auto rounded-2xl bg-slate-100 p-4 ring-1 ring-slate-200 sm:p-5"
      >
        {messages.length === 0 && !busy && !apiError && (
          <div className="flex flex-1 flex-col items-center justify-center pt-6 text-center">
            <p className="text-sm text-slate-500">The debate will begin shortly…</p>
          </div>
        )}

        {apiError && isUnconfigured && (
          <div
            role="alert"
            className="mx-auto mt-8 w-full max-w-md rounded-2xl bg-white p-6 text-center shadow-sm ring-1 ring-amber-200"
          >
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 text-amber-600">
              <AlertIcon className="h-6 w-6" />
            </span>
            <h2 className="mt-3 text-lg font-bold text-slate-900">AI service is not set up</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              This app needs an OpenAI API key to debate. Set the{' '}
              <code className="rounded bg-slate-100 px-1 py-0.5 text-xs text-slate-700">
                OPENAI_API_KEY
              </code>{' '}
              environment variable — locally that&apos;s{' '}
              <code className="rounded bg-slate-100 px-1 py-0.5 text-xs text-slate-700">frontend/server/.env</code>;
              on Vercel it&apos;s Project Settings → Environment Variables (Production).{' '}
              <span className="font-medium">
                If you just added the key on Vercel, you must redeploy
              </span>{' '}
              — environment changes only take effect on a new deployment.
            </p>
            <div className="mt-4 flex justify-center gap-2">
              {pending && (
                <Button size="sm" onClick={retry}>
                  <RefreshIcon className="h-4 w-4" />
                  Retry
                </Button>
              )}
              <Button variant="secondary" size="sm" onClick={onHome}>
                Back to Home
              </Button>
            </div>
          </div>
        )}

        {apiError && !isUnconfigured && isApiDown && (
          <div
            role="alert"
            className="mx-auto mt-8 w-full max-w-md rounded-2xl bg-white p-6 text-center shadow-sm ring-1 ring-red-200"
          >
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-500">
              <AlertIcon className="h-6 w-6" />
            </span>
            <h2 className="mt-3 text-lg font-bold text-slate-900">
              Can&apos;t reach the debate API
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              The opening statement, replies and scoring all need the backend API, and it
              didn&apos;t answer. Please check:
            </p>
            <ul className="mx-auto mt-3 max-w-sm list-disc space-y-1 pl-5 text-left text-sm text-slate-600">
              <li>Your internet connection.</li>
              <li>
                On Vercel, the project&apos;s <span className="font-medium">Root Directory</span>{' '}
                is <code className="rounded bg-slate-100 px-1 py-0.5 text-xs text-slate-700">frontend</code>.
              </li>
              <li>Redeploy after changing any setting or environment variable.</li>
              <li>
                Open <code className="rounded bg-slate-100 px-1 py-0.5 text-xs text-slate-700">/api/health</code> on
                your deployment — it should return JSON like{' '}
                <code className="rounded bg-slate-100 px-1 py-0.5 text-xs text-slate-700">{'{"status":"ok"}'}</code>.
              </li>
            </ul>
            <p className="mt-3 break-words text-xs text-slate-400">{apiError}</p>
            <div className="mt-4 flex justify-center gap-2">
              {pending && (
                <Button size="sm" onClick={retry}>
                  <RefreshIcon className="h-4 w-4" />
                  Retry
                </Button>
              )}
              <Button variant="secondary" size="sm" onClick={onHome}>
                Back to Home
              </Button>
            </div>
          </div>
        )}

        {apiError && !isUnconfigured && !isApiDown && (
          <div
            role="alert"
            className="flex flex-wrap items-start justify-between gap-2 rounded-xl bg-red-50 px-4 py-3 ring-1 ring-red-200"
          >
            <span className="flex items-start gap-2 text-sm text-red-700">
              <AlertIcon className="mt-0.5 h-4 w-4 shrink-0" />
              {apiError}
            </span>
            {pending && (
              <Button variant="secondary" size="sm" onClick={retry}>
                <RefreshIcon className="h-4 w-4" />
                Retry
              </Button>
            )}
          </div>
        )}

        {messages.map((message, index) => {
          if (message.type === 'user') return <MessageBubble key={message.id} message={message} />;
          const userMessage = messages
            .slice(0, index)
            .reverse()
            .find((m) => m.type === 'user');
          return (
            <div key={message.id}>
              <MessageBubble
                message={message}
                onAnalyze={userMessage ? () => doAnalyze(userMessage, message) : null}
                analyzing={analyzingId === message.id}
              />
              {message.analysis && <AnalysisCard analysis={message.analysis} />}
            </div>
          );
        })}

        {busy && !evaluating && <ThinkingIndicator label="AI is thinking..." />}
        {evaluating && <ThinkingIndicator label="Evaluating debate..." />}

        {evaluation && (
          <div className="pt-1">
            <EvaluationCard
              evaluation={evaluation}
              saved={saved}
              onSave={saveToHistory}
              onNewDebate={onRestart}
              onHome={onHome}
            />
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="mt-3 rounded-2xl bg-white p-3 shadow-sm ring-1 ring-slate-200 sm:p-4">
        {ended && (
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-700 ring-1 ring-blue-100">
            <span>Debate ended — review your results below.</span>
            <Button variant="ghost" size="sm" onClick={() => setEnded(false)}>
              Resume Debate
            </Button>
          </div>
        )}

        {inputError && (
          <p className="mb-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700 ring-1 ring-amber-200">
            {inputError}
          </p>
        )}
        <div className="flex items-end gap-2">
          <textarea
            rows={2}
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              if (inputError) setInputError('');
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendArgument();
              }
            }}
            placeholder="Type your argument…"
            disabled={controlsDisabled}
            className="w-full resize-none rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50 disabled:text-slate-400"
          />
          <Button
            onClick={sendArgument}
            disabled={controlsDisabled}
            loading={busy}
            className="shrink-0"
          >
            <SendIcon className="h-4 w-4" />
            <span className="hidden sm:inline">Send</span>
          </Button>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => runEvaluate(false)}
            disabled={controlsDisabled}
            loading={evaluating}
          >
            <ChartIcon className="h-4 w-4" />
            Debate Score
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => runEvaluate(true)}
            disabled={controlsDisabled}
          >
            <StopIcon className="h-4 w-4" />
            End Debate
          </Button>
          <Button variant="secondary" size="sm" onClick={onRestart} disabled={busyOrEvaluating}>
            <RefreshIcon className="h-4 w-4" />
            Restart
          </Button>
          <ConfirmButton
            label="Clear Chat"
            confirmLabel="Confirm Clear"
            icon={<TrashIcon className="h-4 w-4" />}
            onConfirm={clearChat}
            disabled={controlsDisabled}
          />
        </div>

        <p className="mt-3 text-xs text-slate-400">
          Press <span className="font-medium">Debate Score</span> anytime for a provisional score,
          or <span className="font-medium">End Debate</span> when you finish for the final
          evaluation.
        </p>
      </div>
    </div>
  );
}
