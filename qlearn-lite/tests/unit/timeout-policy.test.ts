/**
 * Unit tests for timeout policy
 */

import { TimeoutPolicy, TimeoutManager, TimeoutConfig } from '../../src/timeout';

describe('Timeout Policy', () => {
  describe('TimeoutConfig', () => {
    it('should create valid timeout config with both limits', () => {
      const config: TimeoutConfig = {
        maxStepsPerEpisode: 100,
        maxTotalSteps: 1000,
      };

      expect(config.maxStepsPerEpisode).toBe(100);
      expect(config.maxTotalSteps).toBe(1000);
    });

    it('should allow only episode limit', () => {
      const config: TimeoutConfig = {
        maxStepsPerEpisode: 50,
      };

      expect(config.maxStepsPerEpisode).toBe(50);
      expect(config.maxTotalSteps).toBeUndefined();
    });

    it('should allow only total steps limit', () => {
      const config: TimeoutConfig = {
        maxTotalSteps: 5000,
      };

      expect(config.maxStepsPerEpisode).toBeUndefined();
      expect(config.maxTotalSteps).toBe(5000);
    });
  });

  describe('TimeoutManager', () => {
    it('should track episode and total steps', () => {
      const manager = new TimeoutManager({
        maxStepsPerEpisode: 10,
        maxTotalSteps: 50,
      });

      expect(manager.getEpisodeSteps()).toBe(0);
      expect(manager.getTotalSteps()).toBe(0);
    });

    it('should increment steps correctly', () => {
      const manager = new TimeoutManager({
        maxStepsPerEpisode: 10,
      });

      manager.step();
      expect(manager.getEpisodeSteps()).toBe(1);
      expect(manager.getTotalSteps()).toBe(1);

      manager.step();
      expect(manager.getEpisodeSteps()).toBe(2);
      expect(manager.getTotalSteps()).toBe(2);
    });

    it('should detect episode timeout', () => {
      const manager = new TimeoutManager({
        maxStepsPerEpisode: 3,
      });

      expect(manager.isEpisodeTimeout()).toBe(false);

      manager.step();
      expect(manager.isEpisodeTimeout()).toBe(false);

      manager.step();
      expect(manager.isEpisodeTimeout()).toBe(false);

      manager.step();
      expect(manager.isEpisodeTimeout()).toBe(true);
    });

    it('should detect total steps timeout', () => {
      const manager = new TimeoutManager({
        maxStepsPerEpisode: 10,
        maxTotalSteps: 5,
      });

      for (let i = 0; i < 4; i++) {
        manager.step();
        expect(manager.isTotalTimeout()).toBe(false);
      }

      manager.step();
      expect(manager.isTotalTimeout()).toBe(true);
    });

    it('should reset episode counter', () => {
      const manager = new TimeoutManager({
        maxStepsPerEpisode: 3,
        maxTotalSteps: 10,
      });

      manager.step();
      manager.step();
      expect(manager.getEpisodeSteps()).toBe(2);
      expect(manager.getTotalSteps()).toBe(2);

      manager.resetEpisode();
      expect(manager.getEpisodeSteps()).toBe(0);
      expect(manager.getTotalSteps()).toBe(2); // Total should not reset
    });

    it('should handle no limits gracefully', () => {
      const manager = new TimeoutManager({});

      for (let i = 0; i < 1000; i++) {
        manager.step();
      }

      expect(manager.isEpisodeTimeout()).toBe(false);
      expect(manager.isTotalTimeout()).toBe(false);
    });

    it('should check any timeout', () => {
      const manager = new TimeoutManager({
        maxStepsPerEpisode: 2,
        maxTotalSteps: 5,
      });

      expect(manager.isAnyTimeout()).toBe(false);

      manager.step();
      manager.step();
      expect(manager.isEpisodeTimeout()).toBe(true);
      expect(manager.isAnyTimeout()).toBe(true);

      manager.resetEpisode();
      expect(manager.isEpisodeTimeout()).toBe(false);
      expect(manager.isAnyTimeout()).toBe(false);

      // Continue until total timeout
      manager.step();
      manager.step();
      manager.step();
      expect(manager.isTotalTimeout()).toBe(true);
      expect(manager.isAnyTimeout()).toBe(true);
    });

    it('should provide timeout info', () => {
      const manager = new TimeoutManager({
        maxStepsPerEpisode: 2,
        maxTotalSteps: 5,
      });

      manager.step();
      manager.step();

      const info = manager.getTimeoutInfo();
      expect(info.episodeSteps).toBe(2);
      expect(info.totalSteps).toBe(2);
      expect(info.isEpisodeTimeout).toBe(true);
      expect(info.isTotalTimeout).toBe(false);
      expect(info.reason).toBe('episode_timeout');
    });

    it('should prioritize total timeout reason', () => {
      const manager = new TimeoutManager({
        maxStepsPerEpisode: 2,
        maxTotalSteps: 2,
      });

      manager.step();
      manager.step();

      const info = manager.getTimeoutInfo();
      expect(info.isEpisodeTimeout).toBe(true);
      expect(info.isTotalTimeout).toBe(true);
      expect(info.reason).toBe('total_timeout'); // Total timeout takes precedence
    });
  });

  describe('TimeoutPolicy', () => {
    it('should apply timeout to function execution', () => {
      const policy = new TimeoutPolicy({
        maxStepsPerEpisode: 3,
      });

      let stepCount = 0;
      const result = policy.runEpisode(() => {
        stepCount++;
        policy.step();
        return policy.isEpisodeTimeout();
      });

      expect(stepCount).toBe(3);
      expect(result).toBe(true);
    });

    it('should reset between episodes', () => {
      const policy = new TimeoutPolicy({
        maxStepsPerEpisode: 2,
        maxTotalSteps: 10,
      });

      // First episode
      let steps1 = 0;
      policy.runEpisode(() => {
        steps1++;
        policy.step();
        return policy.isEpisodeTimeout();
      });

      expect(steps1).toBe(2);

      // Second episode
      let steps2 = 0;
      policy.runEpisode(() => {
        steps2++;
        policy.step();
        return policy.isEpisodeTimeout();
      });

      expect(steps2).toBe(2);
      expect(policy.getTotalSteps()).toBe(4);
    });

    it('should handle early termination', () => {
      const policy = new TimeoutPolicy({
        maxStepsPerEpisode: 10,
      });

      let stepCount = 0;
      const result = policy.runEpisode(() => {
        stepCount++;
        policy.step();
        return stepCount >= 3; // Early termination
      });

      expect(stepCount).toBe(3);
      expect(policy.getEpisodeSteps()).toBe(3);
    });

    it('should throw on total timeout', () => {
      const policy = new TimeoutPolicy({
        maxStepsPerEpisode: 10,
        maxTotalSteps: 5,
      });

      expect(() => {
        policy.runEpisode(() => {
          policy.step();
          return false;
        });
      }).toThrow('Total step limit exceeded');
    });
  });
});
