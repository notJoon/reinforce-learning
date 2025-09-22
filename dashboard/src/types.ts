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
  refreshRate?: number; // milliseconds
  historyLength?: number; // number of episodes to keep in history
  movingAverageWindow?: number; // for smoothing reward curves
  enableControls?: boolean; // enable interactive controls
}

export interface DashboardCallbacks {
  onUpdate: (metrics: TrainingMetrics) => void;
  onEpisodeEnd?: (metrics: TrainingMetrics) => void;
  onClose?: () => void;
  onParameterChange?: (param: string, value: number) => void;
  onControlCommand?: (command: ControlCommand) => void;
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

export enum ControlCommand {
  PAUSE = 'pause',
  RESUME = 'resume',
  RESET = 'reset',
  STOP = 'stop',
  CONTINUOUS_MODE = 'continuous',
  FIXED_MODE = 'fixed',
}

export interface TrainingControl {
  isPaused: boolean;
  continuousMode: boolean;
  targetEpisodes: number;
  maxStepsPerEpisode: number;
  parameters: {
    alpha: number;
    gamma: number;
    epsilon: number;
    epsilonDecay?: number;
  };
}
