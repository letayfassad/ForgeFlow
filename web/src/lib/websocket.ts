import type { ActionSequence, RunnerStatus } from '../types/actions';

export const DEFAULT_WS_URL = 'ws://localhost:8765';

export type WsMessage =
  | { type: 'ping' }
  | { type: 'pong' }
  | { type: 'execute'; sequence: ActionSequence }
  | { type: 'stop' }
  | { type: 'status'; status: RunnerStatus }
  | { type: 'progress'; step: number; total: number; action: string }
  | { type: 'complete'; success: boolean; error?: string }
  | { type: 'error'; message: string };

export type WsEventHandler = (message: WsMessage) => void;

export class RunnerClient {
  private ws: WebSocket | null = null;
  private url: string;
  private handlers: Set<WsEventHandler> = new Set();
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private shouldReconnect = true;

  constructor(url: string = DEFAULT_WS_URL) {
    this.url = url;
  }

  connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN) return;

    this.ws = new WebSocket(this.url);

    this.ws.onopen = () => {
      this.emit({ type: 'status', status: { connected: true, executing: false } });
      this.send({ type: 'ping' });
    };

    this.ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data) as WsMessage;
        this.emit(message);
      } catch {
        this.emit({ type: 'error', message: 'Invalid message from runner' });
      }
    };

    this.ws.onclose = () => {
      this.emit({ type: 'status', status: { connected: false, executing: false } });
      if (this.shouldReconnect) {
        this.reconnectTimer = setTimeout(() => this.connect(), 3000);
      }
    };

    this.ws.onerror = () => {
      this.emit({ type: 'error', message: 'WebSocket connection error' });
    };
  }

  disconnect(): void {
    this.shouldReconnect = false;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.ws?.close();
    this.ws = null;
  }

  onMessage(handler: WsEventHandler): () => void {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }

  private emit(message: WsMessage): void {
    this.handlers.forEach((h) => h(message));
  }

  send(message: WsMessage): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }

  execute(sequence: ActionSequence): void {
    this.send({ type: 'execute', sequence });
  }

  stop(): void {
    this.send({ type: 'stop' });
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}