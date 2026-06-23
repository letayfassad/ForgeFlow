export const SCHEMA_VERSION = '1.0' as const;

export type ActionType =
  | 'move_mouse'
  | 'click'
  | 'double_click'
  | 'right_click'
  | 'type_text'
  | 'press_key'
  | 'hotkey'
  | 'wait'
  | 'open_application'
  | 'scroll';

export interface BaseAction {
  type: ActionType;
  label?: string;
}

export interface MoveMouseAction extends BaseAction {
  type: 'move_mouse';
  x: number;
  y: number;
  duration?: number;
}

export interface ClickAction extends BaseAction {
  type: 'click';
  x?: number;
  y?: number;
  button?: 'left' | 'right' | 'middle';
}

export interface DoubleClickAction extends BaseAction {
  type: 'double_click';
  x?: number;
  y?: number;
}

export interface RightClickAction extends BaseAction {
  type: 'right_click';
  x?: number;
  y?: number;
}

export interface TypeTextAction extends BaseAction {
  type: 'type_text';
  text: string;
  interval?: number;
}

export interface PressKeyAction extends BaseAction {
  type: 'press_key';
  key: string;
}

export interface HotkeyAction extends BaseAction {
  type: 'hotkey';
  keys: string[];
}

export interface WaitAction extends BaseAction {
  type: 'wait';
  seconds: number;
}

export interface OpenApplicationAction extends BaseAction {
  type: 'open_application';
  target: string;
}

export interface ScrollAction extends BaseAction {
  type: 'scroll';
  amount: number;
  x?: number;
  y?: number;
}

export type ForgeAction =
  | MoveMouseAction
  | ClickAction
  | DoubleClickAction
  | RightClickAction
  | TypeTextAction
  | PressKeyAction
  | HotkeyAction
  | WaitAction
  | OpenApplicationAction
  | ScrollAction;

export interface ActionSequence {
  version: typeof SCHEMA_VERSION;
  name?: string;
  description?: string;
  actions: ForgeAction[];
}

export interface SavedAutomation {
  id: string;
  name: string;
  description: string;
  sequence: ActionSequence;
  createdAt: string;
  updatedAt: string;
}

export type ExecutionStatus = 'pending' | 'running' | 'completed' | 'failed' | 'stopped';

export interface ExecutionRecord {
  id: string;
  automationName: string;
  sequence: ActionSequence;
  status: ExecutionStatus;
  startedAt: string;
  completedAt?: string;
  error?: string;
}

export interface RunnerStatus {
  connected: boolean;
  executing: boolean;
  currentStep?: number;
  totalSteps?: number;
  message?: string;
}

export const SAFETY_LIMITS = {
  maxMouseDuration: 30,
  minMouseDuration: 0.05,
  maxTypeInterval: 2,
  minTypeInterval: 0.01,
  maxWaitSeconds: 300,
} as const;