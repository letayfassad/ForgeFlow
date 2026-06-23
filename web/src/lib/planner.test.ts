import { describe, expect, it } from 'vitest';
import { buildPlannerPrompt, planWithRules } from './planner';

describe('planner', () => {
  it('builds a system prompt', () => {
    const prompt = buildPlannerPrompt('Open notepad and type hello');
    expect(prompt).toContain('move_mouse');
    expect(prompt).toContain('Open notepad');
  });

  it('plans with rules for notepad task', () => {
    const seq = planWithRules('Open notepad, type "Hello World", wait 2 seconds, press enter');
    expect(seq.actions.length).toBeGreaterThan(0);
    expect(seq.actions.some((a) => a.type === 'open_application')).toBe(true);
    expect(seq.actions.some((a) => a.type === 'type_text')).toBe(true);
  });
});