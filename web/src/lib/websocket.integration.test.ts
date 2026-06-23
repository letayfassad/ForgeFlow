/**
 * @vitest-environment node
 */
import { describe, expect, it, afterAll, beforeAll } from 'vitest';
import WebSocket, { WebSocketServer } from 'ws';
import { validateSequence } from './schema';

const TEST_SEQUENCE = validateSequence({
  version: '1.0',
  name: 'Integration',
  actions: [
    { type: 'move_mouse', x: 1, y: 2, duration: 0.05 },
    { type: 'wait', seconds: 0.01 },
    { type: 'click' },
  ],
});

let wss: WebSocketServer;
let receivedExecute: Record<string, unknown> | null = null;
let port = 0;

beforeAll(async () => {
  wss = new WebSocketServer({ port: 0 });
  port = (wss.address() as { port: number }).port;
  wss.on('connection', (ws) => {
    ws.send(JSON.stringify({ type: 'status', status: { connected: true, executing: false } }));
    ws.on('message', (raw) => {
      const msg = JSON.parse(raw.toString());
      if (msg.type === 'ping') {
        ws.send(JSON.stringify({ type: 'pong' }));
      }
      if (msg.type === 'execute') {
        receivedExecute = msg.sequence;
        ws.send(JSON.stringify({ type: 'progress', step: 1, total: 3, action: 'move_mouse' }));
        ws.send(JSON.stringify({ type: 'complete', success: true }));
      }
    });
  });
  await new Promise((r) => setTimeout(r, 100));
});

afterAll(async () => {
  for (const client of wss.clients) {
    client.terminate();
  }
  await new Promise<void>((resolve) => wss.close(() => resolve()));
});

describe('Web client WebSocket protocol (matches RunnerClient)', () => {
  it('sends ping and execute messages in the format RunnerClient uses', async () => {
    const messages: Record<string, unknown>[] = [];
    const ws = new WebSocket(`ws://127.0.0.1:${port}`);

    ws.on('message', (data) => {
      messages.push(JSON.parse(data.toString()));
    });

    await new Promise<void>((resolve, reject) => {
      ws.on('open', () => resolve());
      ws.on('error', reject);
    });

    await new Promise((r) => setTimeout(r, 100));
    expect(messages.some((m) => m.type === 'status')).toBe(true);

    ws.send(JSON.stringify({ type: 'ping' }));
    await new Promise((r) => setTimeout(r, 100));
    expect(messages.some((m) => m.type === 'pong')).toBe(true);

    ws.send(JSON.stringify({ type: 'execute', sequence: TEST_SEQUENCE }));
    await new Promise((r) => setTimeout(r, 100));

    expect(messages.some((m) => m.type === 'progress')).toBe(true);
    expect(messages.some((m) => m.type === 'complete')).toBe(true);
    expect(receivedExecute).toBeTruthy();
    const actions = (receivedExecute as { actions: unknown[] }).actions;
    expect(actions).toHaveLength(3);

    ws.close();
  });
});