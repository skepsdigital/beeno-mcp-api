import type { Transport, TransportSendOptions } from '@modelcontextprotocol/sdk/shared/transport.js';
import type { JSONRPCMessage } from '@modelcontextprotocol/sdk/types.js';

export class LambdaTransport implements Transport {
  private _resolve: ((msg: JSONRPCMessage) => void) | null = null;
  private _reject: ((err: Error) => void) | null = null;

  onmessage?: (message: JSONRPCMessage, extra?: unknown) => void;
  onerror?: (error: Error) => void;
  onclose?: () => void;

  async start(): Promise<void> {}

  async send(message: JSONRPCMessage, _options?: TransportSendOptions): Promise<void> {
    // Only resolve for actual responses (have id, no method) — ignore server-sent notifications
    if ('id' in message && !('method' in message)) {
      this._resolve?.(message);
      this._resolve = null;
      this._reject = null;
    }
  }

  async close(): Promise<void> {
    this._reject?.(new Error('Transport closed'));
    this._resolve = null;
    this._reject = null;
    this.onclose?.();
  }

  handleRequest(message: JSONRPCMessage): Promise<JSONRPCMessage> {
    return new Promise<JSONRPCMessage>((resolve, reject) => {
      this._resolve = resolve;
      this._reject = reject;
      this.onmessage?.(message);
    });
  }
}
