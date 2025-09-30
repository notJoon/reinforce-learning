import { StatsManager } from '../src/controllers/stats-manager';
import { TrainingMetrics } from '../src/types';

describe('StatsManager', () => {
  let manager: StatsManager;

  beforeEach(() => {
    manager = new StatsManager({
      historyLength: 5,
      movingAverageWindow: 3,
    });
  });

  describe('Basic statistics', () => {
    it('should start with empty stats', () => {
      const stats = manager.getStats();
      expect(stats.episodes).toBe(0);
      expect(stats.totalSteps).toBe(0);
      expect(stats.avgReward).toBe(0);
      expect(stats.rewardHistory).toHaveLength(0);
    });

    it('should update stats on episode completion', () => {
      const metrics: TrainingMetrics = {
        episode: 1,
        step: 10,
        totalReward: 100,
        episodeReward: 50,
        epsilon: 0.5,
        alpha: 0.1,
        terminated: true,
        truncated: false,
        timestamp: Date.now(),
      };

      manager.update(metrics);
      const stats = manager.getStats();

      expect(stats.episodes).toBe(1);
      expect(stats.totalSteps).toBe(1);
      expect(stats.maxReward).toBe(50);
      expect(stats.minReward).toBe(50);
      expect(stats.rewardHistory).toEqual([50]);
    });

    it('should maintain history length limit', () => {
      // Add 7 episodes (limit is 5)
      for (let i = 1; i <= 7; i++) {
        const metrics: TrainingMetrics = {
          episode: i,
          step: 10,
          totalReward: i * 100,
          episodeReward: i * 10,
          epsilon: 0.5,
          alpha: 0.1,
          terminated: true,
          truncated: false,
          timestamp: Date.now(),
        };
        manager.update(metrics);
      }

      const stats = manager.getStats();
      expect(stats.rewardHistory).toHaveLength(5);
      expect(stats.rewardHistory).toEqual([30, 40, 50, 60, 70]);
    });
  });

  describe('Moving average calculation', () => {
    it('should calculate moving average correctly', () => {
      const data = [10, 20, 30, 40, 50];
      const movingAvg = manager.calculateMovingAverage(data, 3);

      expect(movingAvg).toHaveLength(5);
      expect(movingAvg[0]).toBe(10); // [10]
      expect(movingAvg[1]).toBe(15); // [10, 20]
      expect(movingAvg[2]).toBe(20); // [10, 20, 30]
      expect(movingAvg[3]).toBe(30); // [20, 30, 40]
      expect(movingAvg[4]).toBe(40); // [30, 40, 50]
    });

    it('should update average reward with moving window', () => {
      // Add episodes
      for (let i = 1; i <= 5; i++) {
        const metrics: TrainingMetrics = {
          episode: i,
          step: 10,
          totalReward: 100,
          episodeReward: i * 10,
          epsilon: 0.5,
          alpha: 0.1,
          terminated: true,
          truncated: false,
          timestamp: Date.now(),
        };
        manager.update(metrics);
      }

      const stats = manager.getStats();
      // Average of last 3: [30, 40, 50] = 40
      expect(stats.avgReward).toBe(40);
    });
  });

  describe('Success rate calculation', () => {
    it('should calculate success rate for terminated episodes', () => {
      // Add successful episodes (positive reward)
      for (let i = 1; i <= 3; i++) {
        manager.update({
          episode: i,
          step: 10,
          totalReward: 100,
          episodeReward: 10,
          epsilon: 0.5,
          alpha: 0.1,
          terminated: true,
          truncated: false,
          timestamp: Date.now(),
        });
      }

      // Add failed episodes (negative reward)
      for (let i = 4; i <= 5; i++) {
        manager.update({
          episode: i,
          step: 10,
          totalReward: 100,
          episodeReward: -10,
          epsilon: 0.5,
          alpha: 0.1,
          terminated: true,
          truncated: false,
          timestamp: Date.now(),
        });
      }

      const stats = manager.getStats();
      expect(stats.successRate).toBe(0.6); // 3 out of 5
    });
  });

  describe('Reset functionality', () => {
    it('should reset all statistics', () => {
      // Add some data
      manager.update({
        episode: 1,
        step: 10,
        totalReward: 100,
        episodeReward: 50,
        epsilon: 0.5,
        alpha: 0.1,
        terminated: true,
        truncated: false,
        timestamp: Date.now(),
      });

      manager.reset();
      const stats = manager.getStats();

      expect(stats.episodes).toBe(0);
      expect(stats.totalSteps).toBe(0);
      expect(stats.rewardHistory).toHaveLength(0);
      expect(stats.maxReward).toBe(-Infinity);
      expect(stats.minReward).toBe(Infinity);
    });
  });

  describe('Formatted output', () => {
    it('should format stats for display', () => {
      manager.update({
        episode: 1,
        step: 10,
        totalReward: 100,
        episodeReward: 42.567,
        epsilon: 0.5,
        alpha: 0.1,
        terminated: true,
        truncated: false,
        timestamp: Date.now(),
      });

      const formatted = manager.getFormattedStats();

      expect(formatted).toContainEqual(['Episodes', '1']);
      expect(formatted).toContainEqual(['Total Steps', '1']);
      expect(formatted).toContainEqual(['Avg Reward', '42.57']);
      expect(formatted).toContainEqual(['Max Reward', '42.57']);
      expect(formatted).toContainEqual(['Success Rate', '100.0%']);
    });

    it('should handle N/A values correctly', () => {
      const formatted = manager.getFormattedStats();

      expect(formatted).toContainEqual(['Max Reward', 'N/A']);
      expect(formatted).toContainEqual(['Min Reward', 'N/A']);
    });
  });

  describe('Plot data generation', () => {
    it('should generate correct plot data', () => {
      // Add 3 episodes
      for (let i = 1; i <= 3; i++) {
        manager.update({
          episode: i,
          step: i * 5,
          totalReward: 100,
          episodeReward: i * 10,
          epsilon: 0.5,
          alpha: 0.1,
          terminated: true,
          truncated: false,
          timestamp: Date.now(),
        });
      }

      const plotData = manager.getPlotData();

      expect(plotData.rewards.x).toEqual(['1', '2', '3']);
      expect(plotData.rewards.y).toEqual([10, 20, 30]);
      expect(plotData.steps.x).toEqual(['1', '2', '3']);
      expect(plotData.steps.y).toEqual([5, 10, 15]);
      expect(plotData.movingAvg.y).toHaveLength(3);
    });
  });
});
