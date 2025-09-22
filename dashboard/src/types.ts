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

// Agent-related interfaces
export interface RLPolicy<S, A> {
  select(state: S, legal: A[], qval: (s: S, a: A) => number): A | undefined;
  getEpsilon?(): number;
  setEpsilon?(value: number): void;
  getDecay?(): number;
  setDecay?(value: number): void;
  reset?(): void;
}

export interface QTableInterface<S, A> {
  get(state: S, action: A): number;
  set(state: S, action: A, value: number): void;
  reset?(): void;
}

export interface RLAgent<S, A> {
  alpha: number;
  gamma: number;
  policy?: RLPolicy<S, A>;
  q?: QTableInterface<S, A>;
  train(config: TrainingConfig<S, A>): void;
}

export interface TrainingConfig<S, A> {
  episodes: number;
  maxStepsPerEpisode: number;
  onEpisodeEnd?: (info: EpisodeInfo) => void;
  onUpdate?: (state: S, action: A, reward: number, nextState: S) => void;
}

export interface EpisodeInfo {
  episode: number;
  steps: number;
  totalReward: number;
  terminated: boolean;
  truncated?: boolean;
}

export interface InteractiveAgent<S, A> extends RLAgent<S, A> {
  trainInteractive(config: InteractiveTrainingConfig): Promise<void>;
  trainOriginal?: (config: TrainingConfig<S, A>) => void;
}

export interface InteractiveTrainingConfig {
  maxStepsPerEpisode: number;
  targetEpisodes?: number;
  onEpisodeEnd?: (info: EpisodeInfo) => void;
  onUpdate?: (state: unknown, action: unknown, reward: number, nextState: unknown) => void;
}

export interface DiscreteEnvironment<S, A> {
  reset(): S;
  actions(state: S): A[];
  step(state: S, action: A): { nextState: S; reward: number; done: boolean };
  potential?(state: S): number;
}
