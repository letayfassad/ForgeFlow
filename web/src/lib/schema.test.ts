import { describe, expect, it } from 'vitest';
import {
  createSampleSequence,
  deserializeSequence,
  SchemaValidationError,
  serializeSequence,
  validateAction,
  validateSequence,
} from './schema';

describe('schema', () => {
  it('validates all action types', () => {
    const seq = validateSequence({
      version: '1.0',
      name: 'Full',
      actions: [
        { type: 'move_mouse', x: 1, y: 2, duration: 0.5 },
        { type: 'click', x: 3, y: 4 },
        { type: 'double_click', x: 5, y: 6 },
        { type: 'right_click', x: 7, y: 8 },
        { type: 'type_text', text: 'hello', interval: 0.05 },
        { type: 'press_key', key: 'enter' },
        { type: 'hotkey', keys: ['ctrl', 'c'] },
        { type: 'wait', seconds: 1 },
        { type: 'open_application', target: 'notepad' },
        { type: 'scroll', amount: -3 },
      ],
    });
    expect(seq.actions).toHaveLength(10);
    expect(seq.actions[0].type).toBe('move_mouse');
    expect(seq.actions[9].type).toBe('scroll');
  });

  it('round-trips serialize/deserialize', () => {
    const original = createSampleSequence();
    const json = serializeSequence(original);
    const restored = deserializeSequence(json);
    expect(restored.name).toBe(original.name);
    expect(restored.actions.length).toBe(original.actions.length);
    const move = restored.actions[0];
    if (move.type === 'move_mouse') {
      expect(move.x).toBe(100);
      expect(move.duration).toBe(0.3);
    }
  });

  it('clamps unsafe values', () => {
    const action = validateAction({ type: 'move_mouse', x: 0, y: 0, duration: 999 });
    if (action.type === 'move_mouse') {
      expect(action.duration).toBe(30);
    }
  });

  it('rejects empty sequences', () => {
    expect(() => validateSequence({ version: '1.0', actions: [] })).toThrow(SchemaValidationError);
  });
});