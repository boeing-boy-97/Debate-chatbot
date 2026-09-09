// Small inline SVG icons (no external icon library needed).

const base = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  viewBox: '0 0 24 24',
};

export function BoltIcon({ className = 'h-5 w-5' }) {
  return (
    <svg {...base} className={className} aria-hidden="true">
      <path d="M13 2 3 14h7l-1 8 10-12h-7l1-8z" />
    </svg>
  );
}

export function ScaleIcon({ className = 'h-5 w-5' }) {
  return (
    <svg {...base} className={className} aria-hidden="true">
      <path d="M12 3v18" />
      <path d="M5 7h14" />
      <path d="M5 7 3 13a3 3 0 0 0 6 0L7 7" />
      <path d="M17 7l-2 6a3 3 0 0 0 6 0l-2-6" />
      <path d="M8 21h8" />
    </svg>
  );
}

export function ChartIcon({ className = 'h-5 w-5' }) {
  return (
    <svg {...base} className={className} aria-hidden="true">
      <path d="M4 20V10" />
      <path d="M10 20V4" />
      <path d="M16 20v-7" />
      <path d="M22 20H2" />
    </svg>
  );
}

export function ClockIcon({ className = 'h-5 w-5' }) {
  return (
    <svg {...base} className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

export function SendIcon({ className = 'h-4 w-4' }) {
  return (
    <svg {...base} className={className} aria-hidden="true">
      <path d="M22 2 11 13" />
      <path d="M22 2 15 22l-4-9-9-4 20-7z" />
    </svg>
  );
}

export function StopIcon({ className = 'h-4 w-4' }) {
  return (
    <svg {...base} className={className} aria-hidden="true">
      <rect x="6" y="6" width="12" height="12" rx="2" />
    </svg>
  );
}

export function RefreshIcon({ className = 'h-4 w-4' }) {
  return (
    <svg {...base} className={className} aria-hidden="true">
      <path d="M21 12a9 9 0 1 1-2.64-6.36" />
      <path d="M21 3v6h-6" />
    </svg>
  );
}

export function TrashIcon({ className = 'h-4 w-4' }) {
  return (
    <svg {...base} className={className} aria-hidden="true">
      <path d="M3 6h18" />
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
      <path d="M10 11v6M14 11v6" />
    </svg>
  );
}

export function ChevronRightIcon({ className = 'h-4 w-4' }) {
  return (
    <svg {...base} className={className} aria-hidden="true">
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}

export function ArrowRightIcon({ className = 'h-5 w-5' }) {
  return (
    <svg {...base} className={className} aria-hidden="true">
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </svg>
  );
}

export function SparklesIcon({ className = 'h-5 w-5' }) {
  return (
    <svg {...base} className={className} aria-hidden="true">
      <path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1" />
    </svg>
  );
}

export function HomeIcon({ className = 'h-4 w-4' }) {
  return (
    <svg {...base} className={className} aria-hidden="true">
      <path d="m3 10 9-7 9 7v9a2 2 0 0 1-2 2h-4v-6H9v6H5a2 2 0 0 1-2-2v-9z" />
    </svg>
  );
}

export function CheckIcon({ className = 'h-4 w-4' }) {
  return (
    <svg {...base} className={className} aria-hidden="true">
      <path d="m5 13 4 4L19 7" />
    </svg>
  );
}

export function AlertIcon({ className = 'h-4 w-4' }) {
  return (
    <svg {...base} className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v4M12 16h.01" />
    </svg>
  );
}

export function TrophyIcon({ className = 'h-5 w-5' }) {
  return (
    <svg {...base} className={className} aria-hidden="true">
      <path d="M8 21h8M12 17v4M7 4h10v6a5 5 0 0 1-10 0V4z" />
      <path d="M7 6H4a2 2 0 0 0 2 4h1M17 6h3a2 2 0 0 1-2 4h-1" />
    </svg>
  );
}
