// Debate history persisted in browser localStorage.

import uid from './uid.js';

const KEY = 'debate-ai-history';

function read() {
  try {
    const raw = localStorage.getItem(KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

function write(list) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    // Storage full or unavailable — history is optional, never crash the app.
  }
}

export function loadHistory() {
  return read().sort((a, b) => new Date(b.date) - new Date(a.date));
}

export function saveDebate(entry) {
  const list = read();
  const item = { id: uid('debate'), date: new Date().toISOString(), ...entry };
  write([item, ...list]);
  return item;
}

/** Updates an existing entry (used when resuming a debate from history). */
export function updateDebate(id, entry) {
  const list = read();
  const index = list.findIndex((item) => item.id === id);
  if (index === -1) return null;
  const updated = { ...list[index], ...entry, id, date: list[index].date };
  list[index] = updated;
  write(list);
  return updated;
}

export function deleteDebate(id) {
  write(read().filter((item) => item.id !== id));
}

export function clearHistory() {
  write([]);
}
