import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SCHEMA_VERSION } from '../types/actions';
import {
  appendHistory,
  loadHistory,
  loadLibrary,
  saveAutomation,
  updateHistoryRecord,
} from './persistence';
import { validateSequence } from './schema';

const storage: Record<string, string> = {};

beforeEach(() => {
  Object.keys(storage).forEach((k) => delete storage[k]);
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => storage[key] ?? null,
    setItem: (key: string, value: string) => {
      storage[key] = value;
    },
    removeItem: (key: string) => {
      delete storage[key];
    },
  });
});

describe('persistence', () => {
  const sampleSequence = validateSequence({
    version: SCHEMA_VERSION,
    name: 'Test',
    description: 'A test automation',
    actions: [
      { type: 'move_mouse', x: 100, y: 100, duration: 0.5 },
      { type: 'click' },
    ],
  });

  it('round-trips saved automation', () => {
    saveAutomation('My Bot', 'Does things', sampleSequence);
    const library = loadLibrary();
    expect(library).toHaveLength(1);
    expect(library[0].name).toBe('My Bot');
    expect(library[0].description).toBe('Does things');
    expect(library[0].sequence.actions).toHaveLength(2);
    expect(library[0].createdAt).toBeTruthy();
    expect(library[0].updatedAt).toBeTruthy();
  });

  it('round-trips execution history', () => {
    const record = appendHistory({
      automationName: 'Test Run',
      sequence: sampleSequence,
      status: 'completed',
      completedAt: '2026-06-23T12:00:00.000Z',
    });
    const history = loadHistory();
    expect(history).toHaveLength(1);
    expect(history[0].automationName).toBe('Test Run');
    expect(history[0].status).toBe('completed');
    expect(history[0].sequence.actions).toHaveLength(2);

    const updated = updateHistoryRecord(record.id, { status: 'failed', error: 'timeout' });
    expect(updated?.status).toBe('failed');
    expect(updated?.error).toBe('timeout');
  });
});