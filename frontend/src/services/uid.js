// Unique id generator with a safe fallback for browsers that lack
// crypto.randomUUID (it requires a secure context and newer engines).

let counter = 0;

export default function uid(prefix = 'id') {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  counter += 1;
  return `${prefix}-${Date.now()}-${counter}-${Math.random().toString(36).slice(2, 8)}`;
}
