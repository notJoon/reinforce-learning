export interface TrainingMetrics {
  episode: number;
  step: number;
  totalReward: number;
  episodeReward: number;
  epsilon?: number;
  alpha?: number;
  terminated: boolean;
  truncated: boolean;
  timestamp: number;
}

export interface DashboardConfig {
  refreshRate?: number;  // milliseconds
  historyLength?: number; // number of episodes to keep in history
  movingAverageWindow?: number; // for smoothing reward curves
}

export interface DashboardCallbacks {
  onUpdate: (metrics: TrainingMetrics) => void;
  onEpisodeEnd?: (metrics: TrainingMetrics) => void;
  onClose?: () => void;
}

export interface TrainingStats {
  episodes: number;
  totalSteps: number;
  avgReward: number;
  maxReward: number;
  minReward: number;
  successRate: number;
  rewardHistory: number[];
  epsilonHistory: number[];
  stepsHistory: number[];
}