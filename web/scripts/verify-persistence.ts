/**
 * Direct-call persistence verification — exercises shipped save/load functions.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SCHEMA_VERSION } from '../src/types/actions';
import {
  appendHistory,
  loadHistory,
  loadLibrary,
  saveAutomation,
  updateHistoryRecord,
} from '../src/lib/persistence';
import { validateSequence } from '../src/lib/schema';

const __dirname = dirname(fileURLToPath(import.meta.url));

const storage: Record<string, string> = {};

globalThis.localStorage = {
  getItem: (key: string) => storage[key] ?? null,
  setItem: (key: string, value: string) => {
    storage[key] = value;
  },
  removeItem: (key: string) => {
    delete storage[key];
  },
  clear: () => {
    Object.keys(storage).forEach((k) => delete storage[k]);
  },
  key: () => null,
  length: 0,
};

const sampleSequence = validateSequence({
  version: SCHEMA_VERSION,
  name: 'Persistence Test',
  description: 'Full metadata round-trip test',
  actions: [
    { type: 'move_mouse', x: 100, y: 200, duration: 0.5 },
    { type: 'type_text', text: 'ForgeFlow', interval: 0.05 },
    { type: 'click', x: 50, y: 60 },
    { type: 'wait', seconds: 0.1 },
    { type: 'press_key', key: 'enter' },
    { type: 'scroll', amount: -2 },
  ],
});

function log(label: string, data: unknown) {
  console.log(`\n=== ${label} ===`);
  console.log(JSON.stringify(data, null, 2));
}

console.log('ForgeFlow persistence direct-call verification');

log('INPUT sequence', {
  name: 'My Automation',
  description: 'Does things',
  actionCount: sampleSequence.actions.length,
  actionTypes: sampleSequence.actions.map((a) => a.type),
});

const saved = saveAutomation('My Automation', 'Does things', sampleSequence);
log('saveAutomation result', {
  id: saved.id,
  name: saved.name,
  description: saved.description,
  actionCount: saved.sequence.actions.length,
  createdAt: saved.createdAt,
  updatedAt: saved.updatedAt,
});

const library = loadLibrary();
const loaded = library[0];
log('loadLibrary result', {
  count: library.length,
  name: loaded.name,
  description: loaded.description,
  actionCount: loaded.sequence.actions.length,
  actionsMatch: JSON.stringify(loaded.sequence.actions) === JSON.stringify(saved.sequence.actions),
});

const historyRecord = appendHistory({
  automationName: 'Test Run',
  sequence: sampleSequence,
  status: 'completed',
  completedAt: '2026-06-23T12:00:00.000Z',
});
log('appendHistory result', {
  id: historyRecord.id,
  automationName: historyRecord.automationName,
  status: historyRecord.status,
  actionCount: historyRecord.sequence.actions.length,
  startedAt: historyRecord.startedAt,
  completedAt: historyRecord.completedAt,
});

const updated = updateHistoryRecord(historyRecord.id, {
  status: 'failed',
  error: 'timeout',
});
log('updateHistoryRecord result', {
  id: updated?.id,
  status: updated?.status,
  error: updated?.error,
});

const history = loadHistory();
log('loadHistory result', {
  count: history.length,
  firstName: history[0].automationName,
  firstStatus: history[0].status,
  firstActionCount: history[0].sequence.actions.length,
});

const checks = [
  ['library name', loaded.name === 'My Automation'],
  ['library description', loaded.description === 'Does things'],
  ['library actions', loaded.sequence.actions.length === 6],
  ['history status', history[0].status === 'failed'],
  ['history error', history[0].error === 'timeout'],
  ['history actions', history[0].sequence.actions.length === 6],
  ['timestamps present', Boolean(loaded.createdAt && loaded.updatedAt)],
];

let failed = false;
console.log('\n=== ASSERTIONS ===');
for (const [name, ok] of checks) {
  console.log(`${ok ? 'PASS' : 'FAIL'}: ${name}`);
  if (!ok) failed = true;
}

if (failed) process.exit(1);
console.log('\nAll persistence round-trip checks passed.');