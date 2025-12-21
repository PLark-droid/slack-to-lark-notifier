/**
 * HTTP Server for Lark Webhook reception and Desktop App integration
 * This module enables bidirectional Slack ↔ Lark communication
 */

import { createServer, IncomingMessage, ServerResponse } from 'http';
import { LarkSlackBridge } from '../bridge';
import { BridgeConfig, BridgeStatus } from '../types';

export interface ServerOptions {
  port?: number;
  host?: string;
}

export interface BridgeServerEvents {
  onStatusChange?: (status: BridgeStatus) => void;
  onLog?: (level: string, message: string) => void;
  onError?: (error: Error) => void;
}

/**
 * BridgeServer - Wraps LarkSlackBridge with HTTP server for Lark webhooks
 */
export class BridgeServer {
  private bridge: LarkSlackBridge;
  private server: ReturnType<typeof createServer> | null = null;
  private port: number;
  private host: string;
  private events: BridgeServerEvents;
  private statusInterval: NodeJS.Timeout | null = null;

  constructor(config: BridgeConfig, options: ServerOptions = {}, events: BridgeServerEvents = {}) {
    this.port = options.port || 3456;
    this.host = options.host || '127.0.0.1';
    this.events = events;

    // Create bridge instance
    this.bridge = new LarkSlackBridge({ config });

    // Set up event forwarding
    this.bridge.on('*', (event) => {
      if (this.events.onLog) {
        const data = event.data as Record<string, unknown>;
        const direction = data.direction as string | undefined;
        if (event.type === 'bridge:forward' && direction) {
          this.events.onLog('info', `メッセージ転送 (${direction})`);
        } else if (event.type === 'bridge:error') {
          this.events.onLog('error', `エラー: ${data.error}`);
        } else if (event.type === 'bridge:connected') {
          this.events.onLog('info', 'ブリッジ接続完了');
        } else if (event.type === 'bridge:disconnected') {
          this.events.onLog('info', 'ブリッジ切断');
        }
      }
    });
  }

  /**
   * Start the bridge and HTTP server
   */
  async start(): Promise<void> {
    // Start the bridge (Slack Socket Mode connection)
    await this.bridge.start();

    // Start HTTP server for Lark webhooks
    this.server = createServer((req, res) => this.handleRequest(req, res));

    await new Promise<void>((resolve, reject) => {
      this.server!.listen(this.port, this.host, () => {
        this.events.onLog?.('info', `HTTPサーバー起動: http://${this.host}:${this.port}`);
        resolve();
      });
      this.server!.on('error', reject);
    });

    // Start status update interval
    this.statusInterval = setInterval(() => {
      this.events.onStatusChange?.(this.bridge.getStatus());
    }, 1000);

    // Emit initial status
    this.events.onStatusChange?.(this.bridge.getStatus());
  }

  /**
   * Stop the bridge and HTTP server
   */
  async stop(): Promise<void> {
    // Stop status updates
    if (this.statusInterval) {
      clearInterval(this.statusInterval);
      this.statusInterval = null;
    }

    // Stop HTTP server
    if (this.server) {
      await new Promise<void>((resolve) => {
        this.server!.close(() => resolve());
      });
      this.server = null;
    }

    // Stop bridge
    await this.bridge.stop();

    // Emit final status
    this.events.onStatusChange?.(this.bridge.getStatus());
  }

  /**
   * Get current status
   */
  getStatus(): BridgeStatus {
    return this.bridge.getStatus();
  }

  /**
   * Handle incoming HTTP requests
   */
  private async handleRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Handle preflight
    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    const url = req.url || '/';

    try {
      // Health check
      if (req.method === 'GET' && url === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok', timestamp: Date.now() }));
        return;
      }

      // Status endpoint
      if (req.method === 'GET' && url === '/status') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(this.bridge.getStatus()));
        return;
      }

      // Lark webhook endpoint
      if (req.method === 'POST' && url === '/lark/webhook') {
        const body = await this.readBody(req);
        this.events.onLog?.('info', `[Webhook] Received POST /lark/webhook, body length: ${body.length}`);

        const event = JSON.parse(body);
        this.events.onLog?.('info', `[Webhook] Lark event received: ${JSON.stringify(event).slice(0, 200)}...`);

        // Handle the webhook
        const result = await this.bridge.handleLarkWebhook(event);
        this.events.onLog?.('info', `[Webhook] Webhook processed, result: ${JSON.stringify(result)}`);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result || { code: 0, msg: 'success' }));
        return;
      }

      // Stop endpoint (for graceful shutdown from desktop app)
      if (req.method === 'POST' && url === '/stop') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'stopping' }));

        // Stop after response sent
        setTimeout(() => this.stop().then(() => process.exit(0)), 100);
        return;
      }

      // 404 for unknown routes
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Not found' }));
    } catch (error) {
      this.events.onError?.(error as Error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: String(error) }));
    }
  }

  /**
   * Read request body
   */
  private readBody(req: IncomingMessage): Promise<string> {
    return new Promise((resolve, reject) => {
      let body = '';
      req.on('data', (chunk) => (body += chunk));
      req.on('end', () => resolve(body));
      req.on('error', reject);
    });
  }
}

/**
 * Create and start a bridge server from config
 */
export async function startBridgeServer(
  config: BridgeConfig,
  options?: ServerOptions,
  events?: BridgeServerEvents
): Promise<BridgeServer> {
  const server = new BridgeServer(config, options, events);
  await server.start();
  return server;
}
