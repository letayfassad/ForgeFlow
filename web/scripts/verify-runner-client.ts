/**
 * RunnerClient → live main.py unified verification.
 * Appends executor logs to runner-exec.log in VERIFY_SCRATCH.
 */
import { spawn, type ChildProcess } from 'node:child_process';
import { appendFileSync, readFileSync } from 'node:fs';
import { createServer } from 'node:net';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import WebSocket from 'ws';
import { RunnerClient } from '../src/lib/websocket';
import { validateSequence } from '../src/lib/schema';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', '..');
const RUNNER_DIR = join(ROOT, 'runner');
const SCRATCH = process.env.VERIFY_SCRATCH ?? join(ROOT, 'scratch');
const LOG_FILE = join(SCRATCH, 'runner-exec.log');

const rawSeq = JSON.parse(
  readFileSync(join(ROOT, 'shared', 'verification-sequence.json'), 'utf-8'),
);
const TEST_SEQUENCE = validateSequence(rawSeq);

const runnerLogs: string[] = [];

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

function waitForRunner(port: number): Promise<void> {
  const deadline = Date.now() + 15000;
  return new Promise((resolve, reject) => {
    const attempt = () => {
      const ws = new WebSocket(`ws://127.0.0.1:${port}`);
      ws.on('open', () => {
        ws.close();
        resolve();
      });
      ws.on('error', () => {
        if (Date.now() > deadline) reject(new Error('Runner did not start'));
        else setTimeout(attempt, 100);
      });
    };
    attempt();
  });
}

async function main(): Promise<void> {
  globalThis.WebSocket = WebSocket as unknown as typeof globalThis.WebSocket;

  const port = await getFreePort();
  let proc: ChildProcess | null = null;

  try {
    proc = spawn('python', ['main.py', '--host', '127.0.0.1', '--port', String(port)], {
      cwd: RUNNER_DIR,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    proc.stdout?.on('data', (chunk: Buffer) => {
      const line = chunk.toString();
      runnerLogs.push(line);
      process.stderr.write(`[main.py] ${line}`);
    });
    proc.stderr?.on('data', (chunk: Buffer) => {
      const line = chunk.toString();
      runnerLogs.push(line);
      process.stderr.write(`[main.py stderr] ${line}`);
    });

    await waitForRunner(port);

    const client = new RunnerClient(`ws://127.0.0.1:${port}`);
    const messageTypes: string[] = [];

    const unsub = client.onMessage((msg) => messageTypes.push(msg.type));
    client.connect();

    await new Promise<void>((resolve, reject) => {
      const deadline = setTimeout(() => reject(new Error('connect timeout')), 10000);
      const check = () => {
        if (client.isConnected()) {
          clearTimeout(deadline);
          resolve();
        } else setTimeout(check, 50);
      };
      check();
    });

    client.execute(TEST_SEQUENCE);

    await new Promise<void>((resolve, reject) => {
      const deadline = setTimeout(() => reject(new Error('execute timeout')), 20000);
      const check = () => {
        if (messageTypes.includes('complete')) {
          clearTimeout(deadline);
          resolve();
        } else setTimeout(check, 100);
      };
      check();
    });

    unsub();
    client.disconnect();

    const section = [
      '',
      '=== RunnerClient → main.py executor log (unified capture) ===',
      `RunnerClient message types: ${messageTypes.join(', ')}`,
      `Sequence: ${JSON.stringify(TEST_SEQUENCE.name)} (${TEST_SEQUENCE.actions.length} actions)`,
      '',
      ...runnerLogs.filter(
        (l) => l.includes('forgeflow.execute') || l.includes('pyautogui active'),
      ),
      '',
    ].join('\n');

    appendFileSync(LOG_FILE, section, 'utf-8');
    console.log(section);

    const logText = runnerLogs.join('');
    const required = ['library=pynput', 'library=pyautogui', 'library=keyboard', 'library=mouse'];
    for (const token of required) {
      if (!logText.includes(token)) {
        console.error(`MISSING in executor log: ${token}`);
        process.exit(1);
      }
    }
    if (!messageTypes.includes('complete')) {
      console.error('RunnerClient did not receive complete message');
      process.exit(1);
    }
    console.log('RunnerClient unified verification passed.');
  } finally {
    proc?.kill();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});