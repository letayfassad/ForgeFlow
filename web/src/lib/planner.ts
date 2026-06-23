import { SCHEMA_VERSION, type ActionSequence, type ForgeAction } from '../types/actions';
import { normalizeSequence, validateSequence } from './schema';

const PLANNER_SYSTEM_PROMPT = `You are ForgeFlow's desktop automation planner. Convert natural language task descriptions into a JSON action sequence.

Output ONLY valid JSON matching this schema:
{
  "version": "1.0",
  "name": "short name",
  "description": "what this does",
  "actions": [ ... ]
}

Supported action types:
- move_mouse: { type, x, y, duration (0.05-30 seconds), label? }
- click: { type, x?, y?, button?: "left"|"right"|"middle", label? }
- double_click: { type, x?, y?, label? }
- right_click: { type, x?, y?, label? }
- type_text: { type, text, interval (0.01-2 seconds per char), label? }
- press_key: { type, key, label? }
- hotkey: { type, keys: string[], label? }
- wait: { type, seconds (0.1-300), label? }
- open_application: { type, target (app name or path), label? }
- scroll: { type, amount (positive=up, negative=down), x?, y?, label? }

Rules:
- Use reasonable screen coordinates (assume 1920x1080 unless specified)
- Add wait steps between major operations
- Include descriptive labels for each step
- Prefer safe defaults: duration=0.5, interval=0.05
- For Windows: use keys like "enter", "tab", "escape", hotkeys like ["ctrl","c"]`;

export interface PlannerOptions {
  apiKey?: string;
  apiUrl?: string;
  model?: string;
}

export function buildPlannerPrompt(description: string): string {
  return `${PLANNER_SYSTEM_PROMPT}\n\nTask description:\n${description.trim()}\n\nRespond with JSON only.`;
}

function extractJsonFromText(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenced ? fenced[1].trim() : text.trim();
  const start = candidate.indexOf('{');
  const end = candidate.lastIndexOf('}');
  if (start === -1 || end === -1) {
    throw new Error('No JSON object found in planner response');
  }
  return JSON.parse(candidate.slice(start, end + 1));
}

export async function planWithApi(
  description: string,
  options: PlannerOptions = {},
): Promise<ActionSequence> {
  const apiKey = options.apiKey ?? import.meta.env.VITE_AI_API_KEY;
  const apiUrl = options.apiUrl ?? import.meta.env.VITE_AI_API_URL ?? 'https://api.x.ai/v1/chat/completions';
  const model = options.model ?? import.meta.env.VITE_AI_MODEL ?? 'grok-3-mini';

  if (!apiKey) {
    throw new Error('No API key configured. Set VITE_AI_API_KEY or provide apiKey option.');
  }

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: PLANNER_SYSTEM_PROMPT },
        { role: 'user', content: description },
      ],
      temperature: 0.2,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`AI planner failed (${response.status}): ${errText}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error('Empty response from AI planner');
  }

  return validateSequence(extractJsonFromText(content));
}

function parseCoordinates(text: string): { x: number; y: number } | null {
  const match = text.match(/(\d+)\s*[,x]\s*(\d+)/i);
  if (match) {
    return { x: parseInt(match[1], 10), y: parseInt(match[2], 10) };
  }
  return null;
}

function parseQuotedText(text: string): string | null {
  const match = text.match(/["']([^"']+)["']/);
  return match ? match[1] : null;
}

export function planWithRules(description: string): ActionSequence {
  const lower = description.toLowerCase();
  const actions: ForgeAction[] = [];
  const name = description.slice(0, 50).trim() || 'Untitled Task';

  if (lower.includes('notepad') || lower.includes('open')) {
    const appMatch = description.match(/open\s+(\w+)/i);
    const target = appMatch ? appMatch[1] : 'notepad';
    actions.push({
      type: 'open_application',
      target,
      label: `Open ${target}`,
    });
    actions.push({ type: 'wait', seconds: 2, label: 'Wait for app to load' });
  }

  const coords = parseCoordinates(description);
  if (coords || lower.includes('move') || lower.includes('click')) {
    const x = coords?.x ?? 500;
    const y = coords?.y ?? 400;
    actions.push({
      type: 'move_mouse',
      x,
      y,
      duration: 0.5,
      label: `Move to (${x}, ${y})`,
    });
  }

  if (lower.includes('double click') || lower.includes('double-click')) {
    actions.push({
      type: 'double_click',
      x: coords?.x,
      y: coords?.y,
      label: 'Double click',
    });
  } else if (lower.includes('right click') || lower.includes('right-click')) {
    actions.push({
      type: 'right_click',
      x: coords?.x,
      y: coords?.y,
      label: 'Right click',
    });
  } else if (lower.includes('click')) {
    actions.push({
      type: 'click',
      x: coords?.x,
      y: coords?.y,
      label: 'Click',
    });
  }

  const quoted = parseQuotedText(description);
  if (lower.includes('type') || lower.includes('write') || lower.includes('enter')) {
    const text = quoted ?? 'Hello from ForgeFlow';
    actions.push({
      type: 'type_text',
      text,
      interval: 0.05,
      label: `Type "${text}"`,
    });
  }

  if (lower.includes('press enter') || lower.includes('hit enter')) {
    actions.push({ type: 'press_key', key: 'enter', label: 'Press Enter' });
  }

  if (lower.includes('ctrl') || lower.includes('hotkey') || lower.includes('shortcut')) {
    const hotkeyMatch = description.match(/(ctrl|alt|shift)\s*\+\s*(\w)/i);
    if (hotkeyMatch) {
      actions.push({
        type: 'hotkey',
        keys: [hotkeyMatch[1].toLowerCase(), hotkeyMatch[2].toLowerCase()],
        label: `Hotkey ${hotkeyMatch[1]}+${hotkeyMatch[2]}`,
      });
    }
  }

  if (lower.includes('scroll')) {
    const direction = lower.includes('up') ? 3 : -3;
    actions.push({
      type: 'scroll',
      amount: direction,
      label: direction > 0 ? 'Scroll up' : 'Scroll down',
    });
  }

  const waitMatch = description.match(/wait\s+(\d+(?:\.\d+)?)\s*(?:second|sec|s)/i);
  if (waitMatch) {
    actions.push({
      type: 'wait',
      seconds: parseFloat(waitMatch[1]),
      label: `Wait ${waitMatch[1]}s`,
    });
  }

  if (actions.length === 0) {
    actions.push(
      { type: 'move_mouse', x: 960, y: 540, duration: 0.5, label: 'Move to center' },
      { type: 'click', label: 'Click' },
      { type: 'wait', seconds: 0.5, label: 'Brief pause' },
    );
  }

  return normalizeSequence({
    version: SCHEMA_VERSION,
    name,
    description,
    actions,
  });
}

export async function planActions(
  description: string,
  options: PlannerOptions = {},
): Promise<ActionSequence> {
  const apiKey = options.apiKey ?? import.meta.env.VITE_AI_API_KEY;
  if (apiKey) {
    try {
      return await planWithApi(description, options);
    } catch {
      return planWithRules(description);
    }
  }
  return planWithRules(description);
}