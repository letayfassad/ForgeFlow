import type { ActionSequence, ExecutionRecord, SavedAutomation } from '../types/actions';
import { generateId } from './utils';

const LIBRARY_KEY = 'forgeflow-library';
const HISTORY_KEY = 'forgeflow-history';

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson<T>(key: string, value: T): void {
  localStorage.setItem(key, JSON.stringify(value));
}

export function loadLibrary(): SavedAutomation[] {
  return readJson<SavedAutomation[]>(LIBRARY_KEY, []);
}

export function saveAutomation(
  name: string,
  description: string,
  sequence: ActionSequence,
  existingId?: string,
): SavedAutomation {
  const library = loadLibrary();
  const now = new Date().toISOString();

  if (existingId) {
    const index = library.findIndex((a) => a.id === existingId);
    if (index >= 0) {
      const updated: SavedAutomation = {
        ...library[index],
        name,
        description,
        sequence,
        updatedAt: now,
      };
      library[index] = updated;
      writeJson(LIBRARY_KEY, library);
      return updated;
    }
  }

  const automation: SavedAutomation = {
    id: generateId(),
    name,
    description,
    sequence,
    createdAt: now,
    updatedAt: now,
  };
  library.unshift(automation);
  writeJson(LIBRARY_KEY, library);
  return automation;
}

export function deleteAutomation(id: string): void {
  const library = loadLibrary().filter((a) => a.id !== id);
  writeJson(LIBRARY_KEY, library);
}

export function getAutomation(id: string): SavedAutomation | undefined {
  return loadLibrary().find((a) => a.id === id);
}

export function loadHistory(): ExecutionRecord[] {
  return readJson<ExecutionRecord[]>(HISTORY_KEY, []);
}

export function appendHistory(record: Omit<ExecutionRecord, 'id' | 'startedAt'> & { startedAt?: string }): ExecutionRecord {
  const history = loadHistory();
  const full: ExecutionRecord = {
    id: generateId(),
    startedAt: record.startedAt ?? new Date().toISOString(),
    ...record,
  };
  history.unshift(full);
  writeJson(HISTORY_KEY, history);
  return full;
}

export function updateHistoryRecord(
  id: string,
  updates: Partial<Pick<ExecutionRecord, 'status' | 'completedAt' | 'error'>>,
): ExecutionRecord | undefined {
  const history = loadHistory();
  const index = history.findIndex((r) => r.id === id);
  if (index < 0) return undefined;

  history[index] = { ...history[index], ...updates };
  writeJson(HISTORY_KEY, history);
  return history[index];
}

export function clearHistory(): void {
  writeJson(HISTORY_KEY, []);
}