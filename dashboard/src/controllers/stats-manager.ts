import { TrainingStats, TrainingMetrics } from '../types.js';

/**
 * Manages training statistics and metrics calculation
 */
export class StatsManager {
  private stats: TrainingStats;
  private config: {
    historyLength: number;
    movingAverageWindow: number;
  };

  constructor(config?: { historyLength?: number; movingAverageWindow?: number }) {
    this.config = {
      historyLength: config?.historyLength ?? 100,
      movingAverageWindow: config?.movingAverageWindow ?? 10,
    };

    this.stats = this.createEmptyStats();
  }

  private createEmptyStats(): TrainingStats {
    return {
      episodes: 0,
      totalSteps: 0,
      avgReward: 0,
      maxReward: -Infinity,
      minReward: Infinity,
      successRate: 0,
      rewardHistory: [],
      epsilonHistory: [],
      stepsHistory: [],
    };
  }

  reset(): void {
    this.stats = this.createEmptyStats();
  }

  update(metrics: TrainingMetrics): void {
    this.stats.totalSteps++;

    // Episode completed
    if (metrics.step === 0 || this.stats.episodes < metrics.episode) {
      if (metrics.episode > 0) {
        this.stats.episodes = metrics.episode;
        this.addEpisodeData(metrics);
        this.updateStatistics(metrics);
      }
    }
  }

  private addEpisodeData(metrics: TrainingMetrics): void {
    this.stats.rewardHistory.push(metrics.episodeReward);
    this.stats.stepsHistory.push(metrics.step);

    if (metrics.epsilon !== undefined) {
      this.stats.epsilonHistory.push(metrics.epsilon);
    }

    // Keep history limited
    this.trimHistory();
  }

  private trimHistory(): void {
    if (this.stats.rewardHistory.length > this.config.historyLength) {
      this.stats.rewardHistory.shift();
      this.stats.stepsHistory.shift();
      if (this.stats.epsilonHistory.length > 0) {
        this.stats.epsilonHistory.shift();
      }
    }
  }

  private updateStatistics(metrics: TrainingMetrics): void {
    // Calculate moving average
    const recentRewards = this.stats.rewardHistory.slice(-this.config.movingAverageWindow);
    this.stats.avgReward = this.calculateAverage(recentRewards);

    // Update min/max
    this.stats.maxReward = Math.max(this.stats.maxReward, metrics.episodeReward);
    this.stats.minReward = Math.min(this.stats.minReward, metrics.episodeReward);

    // Update success rate
    if (metrics.terminated) {
      const successWindow = Math.min(100, this.stats.episodes);
      const recentSuccesses = this.stats.rewardHistory
        .slice(-successWindow)
        .filter((r) => r > 0).length;
      this.stats.successRate = recentSuccesses / successWindow;
    }
  }

  private calculateAverage(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((a, b) => a + b, 0) / values.length;
  }

  calculateMovingAverage(data: number[], windowSize?: number): number[] {
    const window = windowSize ?? this.config.movingAverageWindow;
    const result: number[] = [];

    for (let i = 0; i < data.length; i++) {
      const start = Math.max(0, i - window + 1);
      const windowData = data.slice(start, i + 1);
      result.push(this.calculateAverage(windowData));
    }

    return result;
  }

  getStats(): TrainingStats {
    return { ...this.stats };
  }

  getFormattedStats(): Array<[string, string]> {
    return [
      ['Episodes', String(this.stats.episodes)],
      ['Total Steps', String(this.stats.totalSteps)],
      ['Avg Reward', this.stats.avgReward.toFixed(2)],
      ['Max Reward', this.stats.maxReward === -Infinity ? 'N/A' : this.stats.maxReward.toFixed(2)],
      ['Min Reward', this.stats.minReward === Infinity ? 'N/A' : this.stats.minReward.toFixed(2)],
      ['Success Rate', `${(this.stats.successRate * 100).toFixed(1)}%`],
    ];
  }

  getPlotData(): {
    rewards: { x: string[]; y: number[] };
    movingAvg: { x: string[]; y: number[] };
    steps: { x: string[]; y: number[] };
  } {
    const x = Array.from({ length: this.stats.rewardHistory.length }, (_, i) =>
      String(this.stats.episodes - this.stats.rewardHistory.length + i + 1),
    );

    return {
      rewards: {
        x,
        y: this.stats.rewardHistory,
      },
      movingAvg: {
        x,
        y: this.calculateMovingAverage(this.stats.rewardHistory),
      },
      steps: {
        x,
        y: this.stats.stepsHistory,
      },
    };
  }
}
