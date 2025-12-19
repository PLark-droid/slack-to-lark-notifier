import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import express from 'express';
import { createSetupRouter } from '../setup-ui/setup-server.js';
import { Server } from 'http';

interface ApiResponse {
  success: boolean;
  errors?: string[];
  error?: string;
  message?: string;
  config?: unknown;
  exists?: boolean;
}

describe('Setup Server', () => {
  let app: express.Application;
  let server: Server;
  const TEST_PORT = 3099;

  beforeEach(() => {
    app = express();
    app.use('/setup', createSetupRouter());
    server = app.listen(TEST_PORT);
  });

  afterEach(() => {
    server.close();
  });

  describe('GET /setup', () => {
    it('should return setup wizard HTML', async () => {
      const response = await fetch(`http://localhost:${TEST_PORT}/setup`);
      expect(response.status).toBe(200);

      const html = await response.text();
      expect(html).toContain('Slack to Lark Notifier');
      expect(html).toContain('セットアップ');
    });
  });

  describe('GET /setup/api/config', () => {
    it('should return config status', async () => {
      const response = await fetch(`http://localhost:${TEST_PORT}/setup/api/config`);
      expect(response.status).toBe(200);

      const data = (await response.json()) as ApiResponse;
      expect(data).toHaveProperty('success');
    });
  });

  describe('POST /setup/api/validate', () => {
    it('should validate empty config and return errors', async () => {
      const emptyConfig = {
        slack: { botToken: '', signingSecret: '', appToken: '', workspaceName: '' },
        lark: { webhookUrl: '', receiverEnabled: false },
        server: { port: 3000, larkReceiverPort: 3001 },
      };

      const response = await fetch(`http://localhost:${TEST_PORT}/setup/api/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(emptyConfig),
      });

      const data = (await response.json()) as ApiResponse;
      expect(data.success).toBe(false);
      expect(data.errors).toContain('Slack Bot Token は必須です');
      expect(data.errors).toContain('Lark Webhook URL は必須です');
    });

    it('should validate invalid token format', async () => {
      const invalidConfig = {
        slack: {
          botToken: 'invalid-token',
          signingSecret: 'secret',
          appToken: 'invalid-app-token',
          workspaceName: 'Test',
        },
        lark: {
          webhookUrl: 'https://invalid-url.com',
          receiverEnabled: false,
        },
        server: { port: 3000, larkReceiverPort: 3001 },
      };

      const response = await fetch(`http://localhost:${TEST_PORT}/setup/api/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidConfig),
      });

      const data = (await response.json()) as ApiResponse;
      expect(data.success).toBe(false);
      expect(data.errors).toContain('Slack Bot Token は "xoxb-" で始まる必要があります');
      expect(data.errors).toContain('Slack App Token は "xapp-" で始まる必要があります');
    });

    it('should pass validation with valid config', async () => {
      const validConfig = {
        slack: {
          botToken: 'xoxb-123456789-test',
          signingSecret: 'abc123def456',
          appToken: 'xapp-1-test-token',
          workspaceName: 'Test Workspace',
        },
        lark: {
          webhookUrl: 'https://open.larksuite.com/open-apis/bot/v2/hook/test-id',
          receiverEnabled: false,
        },
        server: { port: 3000, larkReceiverPort: 3001 },
      };

      const response = await fetch(`http://localhost:${TEST_PORT}/setup/api/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validConfig),
      });

      const data = (await response.json()) as ApiResponse;
      expect(data.success).toBe(true);
    });

    it('should require Lark app credentials when receiver is enabled', async () => {
      const configWithReceiver = {
        slack: {
          botToken: 'xoxb-123456789-test',
          signingSecret: 'abc123def456',
          appToken: 'xapp-1-test-token',
          workspaceName: 'Test',
        },
        lark: {
          webhookUrl: 'https://open.larksuite.com/open-apis/bot/v2/hook/test',
          receiverEnabled: true,
          appId: '',
          verificationToken: '',
        },
        server: { port: 3000, larkReceiverPort: 3001 },
      };

      const response = await fetch(`http://localhost:${TEST_PORT}/setup/api/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(configWithReceiver),
      });

      const data = (await response.json()) as ApiResponse;
      expect(data.success).toBe(false);
      expect(data.errors).toContain('Lark App ID は双方向通信時に必須です');
      expect(data.errors).toContain('Lark Verification Token は双方向通信時に必須です');
    });
  });

  describe('POST /setup/api/test/slack', () => {
    it('should require bot token', async () => {
      const response = await fetch(`http://localhost:${TEST_PORT}/setup/api/test/slack`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      const data = (await response.json()) as ApiResponse;
      expect(data.success).toBe(false);
      expect(data.error).toBe('Bot Token が必要です');
    });
  });

  describe('POST /setup/api/test/lark', () => {
    it('should require webhook URL', async () => {
      const response = await fetch(`http://localhost:${TEST_PORT}/setup/api/test/lark`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      const data = (await response.json()) as ApiResponse;
      expect(data.success).toBe(false);
      expect(data.error).toBe('Webhook URL が必要です');
    });
  });
});
