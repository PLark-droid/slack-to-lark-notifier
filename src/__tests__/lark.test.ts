import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { sendToLark, type FormattedMessage } from '../lark.js';

describe('sendToLark', () => {
  const originalEnv = process.env;
  const mockFetch = vi.fn();

  beforeEach(() => {
    process.env = { ...originalEnv };
    process.env.LARK_WEBHOOK_URL = 'https://lark.example.com/webhook';
    global.fetch = mockFetch;
    mockFetch.mockReset();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should throw error when webhook URL is not configured', async () => {
    delete process.env.LARK_WEBHOOK_URL;

    const message: FormattedMessage = {
      channel: 'general',
      user: 'U123',
      text: 'Hello',
      timestamp: '2024-01-01 12:00:00',
    };

    await expect(sendToLark(message)).rejects.toThrow('LARK_WEBHOOK_URL is not configured');
  });

  it('should send message to Lark webhook', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      text: () => Promise.resolve('{}'),
    });

    const message: FormattedMessage = {
      channel: 'general',
      user: 'U123',
      text: 'Hello, Lark!',
      timestamp: '2024-01-01 12:00:00',
    };

    await sendToLark(message);

    expect(mockFetch).toHaveBeenCalledWith(
      'https://lark.example.com/webhook',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
    );
  });

  it('should include shared channel info in message', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      text: () => Promise.resolve('{}'),
    });

    const message: FormattedMessage = {
      channel: 'shared-channel',
      user: 'U123',
      text: 'Hello from shared channel',
      timestamp: '2024-01-01 12:00:00',
      isSharedChannel: true,
      workspaceName: 'Partner Workspace',
    };

    await sendToLark(message);

    const call = mockFetch.mock.calls[0];
    const body = JSON.parse(call[1].body);

    expect(body.content.post.ja_jp.title).toContain('共有チャンネル');
    expect(JSON.stringify(body)).toContain('Partner Workspace');
  });

  it('should include mention indicator in message', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      text: () => Promise.resolve('{}'),
    });

    const message: FormattedMessage = {
      channel: 'general',
      user: 'U123',
      text: 'You were mentioned!',
      timestamp: '2024-01-01 12:00:00',
      isMention: true,
    };

    await sendToLark(message);

    const call = mockFetch.mock.calls[0];
    const body = JSON.parse(call[1].body);

    expect(body.content.post.ja_jp.title).toContain('📣');
  });

  it('should throw error on Lark API failure', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 400,
      text: () => Promise.resolve('Bad Request'),
    });

    const message: FormattedMessage = {
      channel: 'general',
      user: 'U123',
      text: 'Hello',
      timestamp: '2024-01-01 12:00:00',
    };

    await expect(sendToLark(message)).rejects.toThrow('Lark API error: 400');
  });
});
