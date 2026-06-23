import {
  SCHEMA_VERSION,
  type ActionSequence,
  type ForgeAction,
  SAFETY_LIMITS,
} from '../types/actions';

export class SchemaValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SchemaValidationError';
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function normalizeAction(action: ForgeAction): ForgeAction {
  switch (action.type) {
    case 'move_mouse':
      return {
        ...action,
        duration: clamp(
          action.duration ?? 0.5,
          SAFETY_LIMITS.minMouseDuration,
          SAFETY_LIMITS.maxMouseDuration,
        ),
      };
    case 'type_text':
      return {
        ...action,
        interval: clamp(
          action.interval ?? 0.05,
          SAFETY_LIMITS.minTypeInterval,
          SAFETY_LIMITS.maxTypeInterval,
        ),
      };
    case 'wait':
      return {
        ...action,
        seconds: clamp(action.seconds, 0.1, SAFETY_LIMITS.maxWaitSeconds),
      };
    case 'click':
      return { ...action, button: action.button ?? 'left' };
    default:
      return action;
  }
}

export function normalizeSequence(sequence: ActionSequence): ActionSequence {
  return {
    version: SCHEMA_VERSION,
    name: sequence.name,
    description: sequence.description,
    actions: sequence.actions.map(normalizeAction),
  };
}

export function validateAction(action: unknown): ForgeAction {
  if (!action || typeof action !== 'object') {
    throw new SchemaValidationError('Action must be an object');
  }

  const a = action as Record<string, unknown>;
  const type = a.type;

  if (typeof type !== 'string') {
    throw new SchemaValidationError('Action type is required');
  }

  switch (type) {
    case 'move_mouse':
      if (typeof a.x !== 'number' || typeof a.y !== 'number') {
        throw new SchemaValidationError('move_mouse requires numeric x and y');
      }
      return normalizeAction({
        type: 'move_mouse',
        x: a.x,
        y: a.y,
        duration: typeof a.duration === 'number' ? a.duration : 0.5,
        label: typeof a.label === 'string' ? a.label : undefined,
      });
    case 'click':
      return normalizeAction({
        type: 'click',
        x: typeof a.x === 'number' ? a.x : undefined,
        y: typeof a.y === 'number' ? a.y : undefined,
        button: a.button === 'right' || a.button === 'middle' ? a.button : 'left',
        label: typeof a.label === 'string' ? a.label : undefined,
      });
    case 'double_click':
      return {
        type: 'double_click',
        x: typeof a.x === 'number' ? a.x : undefined,
        y: typeof a.y === 'number' ? a.y : undefined,
        label: typeof a.label === 'string' ? a.label : undefined,
      };
    case 'right_click':
      return {
        type: 'right_click',
        x: typeof a.x === 'number' ? a.x : undefined,
        y: typeof a.y === 'number' ? a.y : undefined,
        label: typeof a.label === 'string' ? a.label : undefined,
      };
    case 'type_text':
      if (typeof a.text !== 'string') {
        throw new SchemaValidationError('type_text requires text');
      }
      return normalizeAction({
        type: 'type_text',
        text: a.text,
        interval: typeof a.interval === 'number' ? a.interval : 0.05,
        label: typeof a.label === 'string' ? a.label : undefined,
      });
    case 'press_key':
      if (typeof a.key !== 'string') {
        throw new SchemaValidationError('press_key requires key');
      }
      return {
        type: 'press_key',
        key: a.key,
        label: typeof a.label === 'string' ? a.label : undefined,
      };
    case 'hotkey':
      if (!Array.isArray(a.keys) || a.keys.length < 2) {
        throw new SchemaValidationError('hotkey requires at least 2 keys');
      }
      return {
        type: 'hotkey',
        keys: a.keys as string[],
        label: typeof a.label === 'string' ? a.label : undefined,
      };
    case 'wait':
      if (typeof a.seconds !== 'number') {
        throw new SchemaValidationError('wait requires seconds');
      }
      return normalizeAction({
        type: 'wait',
        seconds: a.seconds,
        label: typeof a.label === 'string' ? a.label : undefined,
      });
    case 'open_application':
      if (typeof a.target !== 'string') {
        throw new SchemaValidationError('open_application requires target');
      }
      return {
        type: 'open_application',
        target: a.target,
        label: typeof a.label === 'string' ? a.label : undefined,
      };
    case 'scroll':
      if (typeof a.amount !== 'number') {
        throw new SchemaValidationError('scroll requires amount');
      }
      return {
        type: 'scroll',
        amount: a.amount,
        x: typeof a.x === 'number' ? a.x : undefined,
        y: typeof a.y === 'number' ? a.y : undefined,
        label: typeof a.label === 'string' ? a.label : undefined,
      };
    default:
      throw new SchemaValidationError(`Unknown action type: ${type}`);
  }
}

export function validateSequence(input: unknown): ActionSequence {
  if (!input || typeof input !== 'object') {
    throw new SchemaValidationError('Sequence must be an object');
  }

  const seq = input as Record<string, unknown>;
  const actions = seq.actions;

  if (!Array.isArray(actions) || actions.length === 0) {
    throw new SchemaValidationError('Sequence must have at least one action');
  }

  return normalizeSequence({
    version: SCHEMA_VERSION,
    name: typeof seq.name === 'string' ? seq.name : undefined,
    description: typeof seq.description === 'string' ? seq.description : undefined,
    actions: actions.map(validateAction),
  });
}

export function serializeSequence(sequence: ActionSequence): string {
  return JSON.stringify(normalizeSequence(sequence), null, 2);
}

export function deserializeSequence(json: string): ActionSequence {
  return validateSequence(JSON.parse(json));
}

export function createSampleSequence(): ActionSequence {
  return validateSequence({
    version: SCHEMA_VERSION,
    name: 'Sample',
    description: 'Demo sequence',
    actions: [
      { type: 'move_mouse', x: 100, y: 100, duration: 0.3, label: 'Move to start' },
      { type: 'click', label: 'Click' },
      { type: 'type_text', text: 'Hello ForgeFlow', interval: 0.05, label: 'Type greeting' },
      { type: 'wait', seconds: 1, label: 'Pause' },
      { type: 'press_key', key: 'enter', label: 'Press Enter' },
      { type: 'hotkey', keys: ['ctrl', 's'], label: 'Save' },
      { type: 'scroll', amount: -3, label: 'Scroll down' },
      { type: 'open_application', target: 'notepad', label: 'Open Notepad' },
      { type: 'double_click', x: 200, y: 200, label: 'Double click' },
      { type: 'right_click', x: 300, y: 300, label: 'Right click' },
    ],
  });
}