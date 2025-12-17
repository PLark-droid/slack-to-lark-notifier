import { describe, it, expect } from 'vitest';
import { formatSlackMessage } from '../formatter.js';

describe('formatSlackMessage', () => {
  it('should format a basic Slack message', () => {
    const message = {
      channel: 'C123456',
      user: 'U123456',
      text: 'Hello, Lark!',
      ts: '1700000000.000000',
    };

    const result = formatSlackMessage(message);

    expect(result.channel).toBe('C123456');
    expect(result.user).toBe('U123456');
    expect(result.text).toBe('Hello, Lark!');
    expect(result.timestamp).toBeDefined();
  });

  it('should handle missing fields', () => {
    const message = {};

    const result = formatSlackMessage(message);

    expect(result.channel).toBe('unknown');
    expect(result.user).toBe('unknown');
    expect(result.text).toBe('');
    expect(result.timestamp).toBeDefined();
  });

  it('should convert timestamp to JST', () => {
    const message = {
      ts: '1700000000.000000',
    };

    const result = formatSlackMessage(message);

    expect(result.timestamp).toContain('/');
  });
});
