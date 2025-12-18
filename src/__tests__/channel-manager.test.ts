import { describe, it, expect, beforeEach } from 'vitest';
import { ChannelManager } from '../channel-manager.js';
import type { ChannelFilter } from '../config.js';

describe('ChannelManager', () => {
  let channelManager: ChannelManager;

  describe('shouldProcessChannel', () => {
    it('should exclude channels in excludeChannelIds', () => {
      const filter: ChannelFilter = {
        includeSharedChannels: true,
        excludeChannelIds: ['C123'],
      };
      channelManager = new ChannelManager(filter);

      expect(channelManager.shouldProcessChannel('C123')).toBe(false);
      expect(channelManager.shouldProcessChannel('C456')).toBe(true);
    });

    it('should only process channels in channelIds when specified', () => {
      const filter: ChannelFilter = {
        includeSharedChannels: true,
        channelIds: ['C123', 'C456'],
      };
      channelManager = new ChannelManager(filter);

      expect(channelManager.shouldProcessChannel('C123')).toBe(true);
      expect(channelManager.shouldProcessChannel('C456')).toBe(true);
      expect(channelManager.shouldProcessChannel('C789')).toBe(false);
    });

    it('should process all channels when no filter specified', () => {
      const filter: ChannelFilter = {
        includeSharedChannels: true,
      };
      channelManager = new ChannelManager(filter);

      expect(channelManager.shouldProcessChannel('C123')).toBe(true);
      expect(channelManager.shouldProcessChannel('C456')).toBe(true);
    });
  });

  describe('getSharedChannels', () => {
    it('should return empty array when no channels loaded', () => {
      const filter: ChannelFilter = {
        includeSharedChannels: true,
      };
      channelManager = new ChannelManager(filter);

      expect(channelManager.getSharedChannels()).toHaveLength(0);
    });
  });

  describe('isSharedChannel', () => {
    it('should return false for unknown channel', () => {
      const filter: ChannelFilter = {
        includeSharedChannels: true,
      };
      channelManager = new ChannelManager(filter);

      expect(channelManager.isSharedChannel('C123')).toBe(false);
    });
  });

  describe('getChannelInfo', () => {
    it('should return undefined for unknown channel', () => {
      const filter: ChannelFilter = {
        includeSharedChannels: true,
      };
      channelManager = new ChannelManager(filter);

      expect(channelManager.getChannelInfo('C123')).toBeUndefined();
    });
  });
});
