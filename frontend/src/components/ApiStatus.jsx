import { useEffect, useState } from 'react';
import { getHealth } from '../services/api.js';

// Small service-status pill shown on the home page. It pings /api/health once
// so deployment problems (API routes not deployed, key not picked up) are
// visible BEFORE the user starts a debate — instead of failing mid-debate.
const STYLES = {
  checking: 'bg-slate-100 text-slate-500 ring-slate-200',
  online: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  unconfigured: 'bg-amber-50 text-amber-700 ring-amber-200',
  down: 'bg-red-50 text-red-700 ring-red-200',
};

const DOT = {
  checking: 'bg-slate-400 animate-pulse',
  online: 'bg-emerald-500',
  unconfigured: 'bg-amber-500',
  down: 'bg-red-500',
};

export default function ApiStatus() {
  const [state, setState] = useState('checking');
  const [detail, setDetail] = useState('');

  useEffect(() => {
    let cancelled = false;
    getHealth()
      .then((health) => {
        if (cancelled) return;
        if (health.configured) {
          setState('online');
          setDetail(`Live AI enabled (model: ${health.model || 'default'}).`);
        } else {
          setState('unconfigured');
          setDetail(
            health.offlineFallback === 'off'
              ? 'No API key is set and offline fallback is off — debates cannot start.'
              : 'No API key is set — debates will use offline demo replies.'
          );
        }
      })
      .catch((error) => {
        if (cancelled) return;
        setState('down');
        setDetail(error?.message || 'The debate API is unreachable.');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const label =
    state === 'online'
      ? 'AI connected'
      : state === 'unconfigured'
        ? 'AI not configured'
        : state === 'down'
          ? 'API unreachable'
          : 'Checking service…';

  return (
    <p
      className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium ring-1 ${STYLES[state]}`}
      title={detail || label}
      role="status"
    >
      <span className={`h-2 w-2 rounded-full ${DOT[state]}`} />
      {label}
    </p>
  );
}
