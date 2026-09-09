import { useCallback, useState } from 'react';
import HomePage from './pages/HomePage.jsx';
import SetupPage from './pages/SetupPage.jsx';
import DebatePage from './pages/DebatePage.jsx';
import { loadHistory, deleteDebate, clearHistory } from './services/history.js';

export default function App() {
  const [history, setHistory] = useState(loadHistory);
  const [view, setView] = useState('home');
  const [setupDefaults, setSetupDefaults] = useState(null);
  const [debate, setDebate] = useState(null);

  const refreshHistory = useCallback(() => setHistory(loadHistory()), []);

  function startDebate({ topic, userPosition, difficulty }) {
    setSetupDefaults({ topic, userPosition, difficulty });
    setDebate({
      id: `debate-${Date.now()}`,
      topic,
      userPosition,
      difficulty,
      initialMessages: [],
    });
    setView('debate');
  }

  function openDebate(item) {
    setDebate({
      id: item.id || `debate-${Date.now()}`,
      topic: item.topic,
      userPosition: item.userPosition,
      difficulty: item.difficulty,
      initialMessages: item.messages || [],
      initialEvaluation: item.evaluation || null,
    });
    setView('debate');
  }

  function restartDebate() {
    // Return to the setup screen with the previous choices pre-filled.
    setSetupDefaults(
      debate
        ? { topic: debate.topic, userPosition: debate.userPosition, difficulty: debate.difficulty }
        : null
    );
    setView('setup');
  }

  function goHome() {
    setView('home');
  }

  function handleDelete(id) {
    deleteDebate(id);
    refreshHistory();
  }

  function handleClearAll() {
    clearHistory();
    refreshHistory();
  }

  return (
    <div className="min-h-dvh bg-slate-50">
      {view === 'home' && (
        <HomePage
          history={history}
          onStart={() => {
            setSetupDefaults(null);
            setView('setup');
          }}
          onOpenDebate={openDebate}
          onDelete={handleDelete}
          onClearAll={handleClearAll}
        />
      )}

      {view === 'setup' && (
        <SetupPage
          defaults={setupDefaults}
          onBack={goHome}
          onStart={startDebate}
        />
      )}

      {view === 'debate' && debate && (
        <DebatePage
          key={debate.id}
          debate={debate}
          onHome={goHome}
          onRestart={restartDebate}
          onHistoryChanged={refreshHistory}
        />
      )}
    </div>
  );
}
