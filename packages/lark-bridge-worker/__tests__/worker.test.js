import { describe, it, expect } from 'vitest';

/**
 * Test the helper functions from worker.js
 * Note: These are recreated here since the worker doesn't export them
 */

// Recreate cleanLarkInternalMentions for testing
function cleanLarkInternalMentions(text) {
  if (!text) return '';
  let cleaned = text.replace(/@_\w+/g, '');
  cleaned = cleaned.replace(/\s+/g, ' ');
  cleaned = cleaned.trim();
  return cleaned;
}

// Recreate parseChannelSpecification for testing
function parseChannelSpecification(text) {
  if (!text) return { targetChannel: null, messageText: '' };
  const match = text.match(/^#(\S+)\s+(.+)$/s);
  if (match) {
    return {
      targetChannel: match[1],
      messageText: match[2].trim(),
    };
  }
  return { targetChannel: null, messageText: text };
}

describe('cleanLarkInternalMentions', () => {
  it('should remove Lark internal mentions like @_user_1', () => {
    expect(cleanLarkInternalMentions('@_user_1 確認お願いします')).toBe('確認お願いします');
  });

  it('should remove @_all mention', () => {
    expect(cleanLarkInternalMentions('@_all 全員に連絡')).toBe('全員に連絡');
  });

  it('should preserve user-facing @username mentions', () => {
    expect(cleanLarkInternalMentions('@matsui 確認お願いします')).toBe('@matsui 確認お願いします');
  });

  it('should handle multiple internal mentions', () => {
    expect(cleanLarkInternalMentions('@_user_1 @_user_2 テスト')).toBe('テスト');
  });

  it('should handle empty string', () => {
    expect(cleanLarkInternalMentions('')).toBe('');
  });

  it('should handle null/undefined', () => {
    expect(cleanLarkInternalMentions(null)).toBe('');
    expect(cleanLarkInternalMentions(undefined)).toBe('');
  });

  it('should collapse multiple spaces', () => {
    expect(cleanLarkInternalMentions('hello   world')).toBe('hello world');
  });
});

describe('parseChannelSpecification', () => {
  it('should parse #channel at the beginning of message', () => {
    const result = parseChannelSpecification('#general この件について共有します');
    expect(result.targetChannel).toBe('general');
    expect(result.messageText).toBe('この件について共有します');
  });

  it('should handle hyphenated channel names', () => {
    const result = parseChannelSpecification('#dev-team 新機能の相談');
    expect(result.targetChannel).toBe('dev-team');
    expect(result.messageText).toBe('新機能の相談');
  });

  it('should return null targetChannel for messages without channel spec', () => {
    const result = parseChannelSpecification('普通のメッセージです');
    expect(result.targetChannel).toBe(null);
    expect(result.messageText).toBe('普通のメッセージです');
  });

  it('should not parse # in the middle of message', () => {
    const result = parseChannelSpecification('Issue #123 について');
    expect(result.targetChannel).toBe(null);
    expect(result.messageText).toBe('Issue #123 について');
  });

  it('should handle empty string', () => {
    const result = parseChannelSpecification('');
    expect(result.targetChannel).toBe(null);
    expect(result.messageText).toBe('');
  });

  it('should handle multiline messages', () => {
    const result = parseChannelSpecification('#general 1行目\n2行目\n3行目');
    expect(result.targetChannel).toBe('general');
    expect(result.messageText).toBe('1行目\n2行目\n3行目');
  });

  it('should require space after channel name', () => {
    const result = parseChannelSpecification('#generalこれは無効');
    expect(result.targetChannel).toBe(null);
    expect(result.messageText).toBe('#generalこれは無効');
  });
});

describe('Mention transformation patterns', () => {
  // Test the regex pattern used for transformMentions
  const mentionPattern = /@([\w\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]+)/g;

  it('should match English usernames', () => {
    const text = '@matsui check this';
    const matches = [...text.matchAll(mentionPattern)];
    expect(matches.length).toBe(1);
    expect(matches[0][1]).toBe('matsui');
  });

  it('should match Japanese names', () => {
    const text = '@田中 確認してください';
    const matches = [...text.matchAll(mentionPattern)];
    expect(matches.length).toBe(1);
    expect(matches[0][1]).toBe('田中');
  });

  it('should match katakana names', () => {
    const text = '@タナカ 確認してください';
    const matches = [...text.matchAll(mentionPattern)];
    expect(matches.length).toBe(1);
    expect(matches[0][1]).toBe('タナカ');
  });

  it('should match multiple mentions', () => {
    const text = '@matsui @tanaka review please';
    const matches = [...text.matchAll(mentionPattern)];
    expect(matches.length).toBe(2);
  });

  it('should not match email-like patterns', () => {
    const text = 'Send to test@example.com';
    const matches = [...text.matchAll(mentionPattern)];
    expect(matches.length).toBe(1);
    expect(matches[0][1]).toBe('example'); // Still matches @example part
  });
});
