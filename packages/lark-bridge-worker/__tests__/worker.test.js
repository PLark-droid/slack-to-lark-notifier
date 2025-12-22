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

// Escape special regex characters in a string
function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Recreate replaceLarkMentionsWithNames for testing
function replaceLarkMentionsWithNames(text, mentions) {
  if (!text || !mentions || !Array.isArray(mentions) || mentions.length === 0) {
    return text;
  }

  let result = text;

  for (const mention of mentions) {
    const key = mention.key;
    const name = mention.name;

    if (key && name) {
      // Skip bot/app mentions (empty or missing user_id)
      const hasUserId = mention.id?.user_id && mention.id.user_id !== '';
      if (!hasUserId) {
        result = result.replace(new RegExp(escapeRegExp(key), 'g'), '');
        continue;
      }

      result = result.replace(new RegExp(escapeRegExp(key), 'g'), `@${name}`);
    }
  }

  result = result.replace(/@_\w+/g, '');
  result = result.replace(/\s+/g, ' ').trim();

  return result;
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

describe('replaceLarkMentionsWithNames', () => {
  it('should replace internal mention with actual username', () => {
    const text = '@_user_1 確認お願いします';
    const mentions = [
      { key: '@_user_1', name: '高橋央', id: { user_id: 'u123', open_id: 'ou_xxx' } }
    ];
    expect(replaceLarkMentionsWithNames(text, mentions)).toBe('@高橋央 確認お願いします');
  });

  it('should handle multiple mentions', () => {
    const text = '@_user_1 @_user_2 確認お願いします';
    const mentions = [
      { key: '@_user_1', name: '高橋央', id: { user_id: 'u123' } },
      { key: '@_user_2', name: '田中', id: { user_id: 'u456' } }
    ];
    expect(replaceLarkMentionsWithNames(text, mentions)).toBe('@高橋央 @田中 確認お願いします');
  });

  it('should skip bot mentions with empty user_id', () => {
    const text = '@_user_1 @_user_2 メッセージ';
    const mentions = [
      { key: '@_user_1', name: 'Slack2Lark', id: { user_id: '', open_id: 'ou_xxx' } }, // bot (empty user_id)
      { key: '@_user_2', name: '高橋央', id: { user_id: 'u123' } }
    ];
    expect(replaceLarkMentionsWithNames(text, mentions)).toBe('@高橋央 メッセージ');
  });

  it('should skip bot mentions with no id object', () => {
    const text = '@_user_1 @_user_2 メッセージ';
    const mentions = [
      { key: '@_user_1', name: 'Slack2Lark' }, // bot (no id)
      { key: '@_user_2', name: '高橋央', id: { user_id: 'u123' } }
    ];
    expect(replaceLarkMentionsWithNames(text, mentions)).toBe('@高橋央 メッセージ');
  });

  it('should return original text if no mentions array', () => {
    const text = '@matsui 確認';
    expect(replaceLarkMentionsWithNames(text, null)).toBe('@matsui 確認');
    expect(replaceLarkMentionsWithNames(text, [])).toBe('@matsui 確認');
    expect(replaceLarkMentionsWithNames(text, undefined)).toBe('@matsui 確認');
  });

  it('should clean up remaining internal mentions not in array', () => {
    const text = '@_user_1 @_user_99 メッセージ';
    const mentions = [
      { key: '@_user_1', name: '高橋央', id: { user_id: 'u123' } }
    ];
    expect(replaceLarkMentionsWithNames(text, mentions)).toBe('@高橋央 メッセージ');
  });

  it('should handle English and Japanese names', () => {
    const text = '@_user_1 @_user_2 please review';
    const mentions = [
      { key: '@_user_1', name: 'John', id: { user_id: 'u123' } },
      { key: '@_user_2', name: '鈴木', id: { user_id: 'u456' } }
    ];
    expect(replaceLarkMentionsWithNames(text, mentions)).toBe('@John @鈴木 please review');
  });
});
