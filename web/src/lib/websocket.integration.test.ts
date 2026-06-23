/**
 * @vitest-environment node
 *
 * Drives the shipped RunnerClient against a live `python main.py` subprocess
 * using the canonical shared/verification-sequence.json fixture.
 */
import { readFileSync } from 'node:fs';
import { spawn, type ChildProcess } from 'node:child_process';
import { createServer } from 'node:net';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import WebSocket from 'ws';
import { RunnerClient } from './websocket';
import { validateSequence } from './schema';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', '..', '..');
const RUNNER_DIR = join(ROOT, 'runner');

const rawSeq = JSON.parse(
  readFileSync(join(ROOT, 'shared', 'verification-sequence.json'), 'utf-8'),
);
const TEST_SEQUENCE = validateSequence(rawSeq);

function getFreePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address();
      if (!addr || typeof addr === 'string') {
        reject(new Error('no port'));
        return;
      }
      server.close(() => resolve(addr.port));
    });
  });
}

function waitForRunner(port: number, timeoutMs = 15000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  return new Promise((resolve, reject) => {
    const attempt = () => {
      const ws = new WebSocket(`ws://127.0.0.1:${port}`);
      ws.on('open', () => {
        ws.close();
        resolve();
      });
      ws.on('error', () => {
        if (Date.now() > deadline) {
          reject(new Error('Runner server did not start'));
        } else {
          setTimeout(attempt, 100);
        }
      });
    };
    attempt();
  });
}

let runnerProc: ChildProcess | null = null;
let port = 0;

beforeAll(async () => {
  globalThis.WebSocket = WebSocket as unknown as typeof globalThis.WebSocket;

  port = await getFreePort();
  runnerProc = spawn('python', ['main.py', '--host', '127.0.0.1', '--port', String(port)], {
    cwd: RUNNER_DIR,
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  await waitForRunner(port);
}, 30000);

afterAll(async () => {
  if (runnerProc) {
    runnerProc.kill();
    await new Promise((r) => setTimeout(r, 500));
  }
});

describe('RunnerClient against live python main.py', () => {
  it('connects via RunnerClient.connect, sends ping, and executes via RunnerClient.execute', async () => {
    const client = new RunnerClient(`ws://127.0.0.1:${port}`);
    const messages: string[] = [];

    const unsub = client.onMessage((msg) => messages.push(msg.type));
    client.connect();

    await new Promise<void>((resolve, reject) => {
      const deadline = setTimeout(() => reject(new Error('connect/pong timeout')), 10000);
      const check = () => {
        if (messages.includes('pong')) {
          clearTimeout(deadline);
          resolve();
        } else {
          setTimeout(check, 50);
        }
      };
      check();
    });

    expect(messages).toContain('pong');

    client.execute(TEST_SEQUENCE);

    await new Promise<void>((resolve, reject) => {
      const deadline = setTimeout(() => reject(new Error('execute timeout')), 20000);
      const check = () => {
        if (messages.includes('complete')) {
          clearTimeout(deadline);
          resolve();
        } else {
          setTimeout(check, 100);
        }
      };
      check();
    });

    expect(messages).toContain('progress');
    expect(messages).toContain('complete');
    expect(TEST_SEQUENCE.actions.length).toBe(6);

    unsub();
    client.disconnect();
  });
});