import { chromium } from 'playwright';
import { createServer } from 'http';
import { readFileSync, existsSync } from 'fs';
import { join, extname } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const distDir = join(__dirname, 'dist');

const mime = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
};

const server = createServer((req, res) => {
  const path = req.url === '/' ? '/index.html' : req.url;
  const file = join(distDir, path);
  if (!existsSync(file)) {
    res.writeHead(404);
    res.end('Not found');
    return;
  }
  res.writeHead(200, { 'Content-Type': mime[extname(file)] || 'text/plain' });
  res.end(readFileSync(file));
});

const PORT = 4174;
await new Promise((resolve) => server.listen(PORT, resolve));

const browser = await chromium.launch();
const page = await browser.newPage();

await page.addInitScript(() => {
  const nativeFetch = window.fetch.bind(window);
  window.fetch = async (input, init) => {
    const url = String(input);
    if (url.includes('11434') || url.includes('localhost:8765')) {
      throw new TypeError('offline in verify harness');
    }
    return nativeFetch(input, init);
  };

  class MockWebSocket {
    static CONNECTING = 0;
    static OPEN = 1;
    static CLOSING = 2;
    static CLOSED = 3;
    readyState = MockWebSocket.CONNECTING;
    onopen = null;
    onmessage = null;
    onclose = null;
    onerror = null;
    constructor() {
      setTimeout(() => {
        this.readyState = MockWebSocket.OPEN;
        this.onopen?.();
        this.onmessage?.({ data: JSON.stringify({ type: 'pong' }) });
      }, 50);
    }
    send() {}
    close() {
      this.readyState = MockWebSocket.CLOSED;
      this.onclose?.();
    }
  }
  window.WebSocket = MockWebSocket;
});
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (msg) => {
  if (msg.type() !== 'error') return;
  const text = msg.text();
  if (text.includes('ERR_CONNECTION_REFUSED') && (text.includes('8765') || text.includes('11434'))) {
    return;
  }
  errors.push(text);
});

await page.goto(`http://localhost:${PORT}`);
await page.waitForSelector('[data-testid="task-input"]');
await page.waitForTimeout(200);

const surfaces = {
  taskInput: await page.locator('[data-testid="task-input"]').count(),
  connectionStatus: await page.getByText(/Runner/).count(),
  libraryTab: await page.getByRole('button', { name: 'Library', exact: true }).count(),
  historyTab: await page.getByRole('button', { name: 'History', exact: true }).count(),
};

await page.locator('[data-testid="task-input"]').fill('Move mouse to 500, 400, click, type "hello", wait 1 second');
await page.getByRole('button', { name: 'Generate Action Plan' }).click();
await page.waitForSelector('[data-testid="action-preview"]', { timeout: 5000 });

surfaces.actionPreview = await page.locator('[data-testid="action-preview"]').count();
surfaces.speedControl = await page.locator('[data-testid^="speed-control-"], [data-testid^="interval-control-"]').count();
surfaces.runButton = await page.locator('[data-testid="run-button"]').count();

await page.getByRole('button', { name: 'Library', exact: true }).click();
surfaces.librarySection = await page.locator('[data-testid="library-section"]').count();

await page.getByRole('button', { name: 'History', exact: true }).click();
surfaces.historySection = await page.locator('[data-testid="history-section"]').count();

await page.getByRole('button', { name: 'Create', exact: true }).click();
await page.locator('[data-testid="run-button"]').click();
surfaces.confirmDialog = await page.locator('[data-testid="confirm-dialog"]').count();

const result = {
  errors,
  surfaces,
  allSurfacesPresent: Object.values(surfaces).every((c) => c > 0),
  zeroErrors: errors.length === 0,
};

console.log(JSON.stringify(result, null, 2));

await browser.close();
server.close();
process.exit(result.allSurfacesPresent && result.zeroErrors ? 0 : 1);