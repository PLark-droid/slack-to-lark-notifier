import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LarkReceiver } from '../lark-receiver.js';
import { SlackSender } from '../slack-sender.js';

describe('LarkReceiver', () => {
  const mockSlackSender = {
    sendMessage: vi.fn(),
    findChannelByName: vi.fn(),
  } as unknown as SlackSender;

  const defaultConfig = {
    appId: 'test-app-id',
    appSecret: 'test-secret',
    verificationToken: 'test-token',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('parseSlackCommand', () => {
    it('should parse /slack #channel message format', () => {
      const receiver = new LarkReceiver(defaultConfig, mockSlackSender);

      const result = receiver.parseSlackCommand('/slack #general Hello world');

      expect(result).toEqual({
        channel: 'general',
        message: 'Hello world',
      });
    });

    it('should parse /slack channel message format (without #)', () => {
      const receiver = new LarkReceiver(defaultConfig, mockSlackSender);

      const result = receiver.parseSlackCommand('/slack general Hello world');

      expect(result).toEqual({
        channel: 'general',
        message: 'Hello world',
      });
    });

    it('should handle multiline messages', () => {
      const receiver = new LarkReceiver(defaultConfig, mockSlackSender);

      const result = receiver.parseSlackCommand('/slack #general Line 1\nLine 2\nLine 3');

      expect(result).toEqual({
        channel: 'general',
        message: 'Line 1\nLine 2\nLine 3',
      });
    });

    it('should return null for non-command messages', () => {
      const receiver = new LarkReceiver(defaultConfig, mockSlackSender);

      const result = receiver.parseSlackCommand('Hello world');

      expect(result).toBeNull();
    });

    it('should return null for invalid command format', () => {
      const receiver = new LarkReceiver(defaultConfig, mockSlackSender);

      const result = receiver.parseSlackCommand('/slack');

      expect(result).toBeNull();
    });

    it('should return null for command without message', () => {
      const receiver = new LarkReceiver(defaultConfig, mockSlackSender);

      const result = receiver.parseSlackCommand('/slack #general');

      expect(result).toBeNull();
    });
  });

  describe('getExpressApp', () => {
    it('should return an express app', () => {
      const receiver = new LarkReceiver(defaultConfig, mockSlackSender);

      const app = receiver.getExpressApp();

      expect(app).toBeDefined();
      expect(typeof app.listen).toBe('function');
    });
  });
});
