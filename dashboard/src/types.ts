/**
 * Metrics collected during training
 */
export interface TrainingMetrics {
  readonly episode: number;
  readonly step: number;
  readonly totalReward: number;
  readonly episodeReward: number;
  readonly epsilon?: number;
  readonly alpha?: number;
  readonly terminated: boolean;
  readonly truncated: boolean;
  readonly timestamp: number;
}

/**
 * Dashboard configuration options
 */
export interface DashboardConfig {
  /** Refresh rate in milliseconds */
  readonly refreshRate?: number;
  /** Number of episodes to keep in history */
  readonly historyLength?: number;
  /** Window size for moving average calculation */
  readonly movingAverageWindow?: number;
  /** Enable interactive controls */
  readonly enableControls?: boolean;
}

export interface DashboardCallbacks {
  onUpdate: (metrics: TrainingMetrics) => void;
  onEpisodeEnd?: (metrics: TrainingMetrics) => void;
  onClose?: () => void;
  onParameterChange?: (param: string, value: number) => void;
  onControlCommand?: (command: ControlCommand) => void;
}

/**
 * Accumulated training statistics
 */
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

/**
 * Training control state and parameters
 */
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

/**
 * Generic reinforcement learning policy interface
 */
export interface RLPolicy<S, A> {
  select(state: S, legal: A[], qval: (s: S, a: A) => number): A | undefined;
  getEpsilon?(): number;
  setEpsilon?(value: number): void;
  getDecay?(): number;
  setDecay?(value: number): void;
  reset?(): void;
}

/**
 * Q-table storage interface
 */
export interface QTableInterface<S, A> {
  get(state: S, action: A): number;
  set(state: S, action: A, value: number): void;
  reset?(): void;
}

/**
 * Base reinforcement learning agent interface
 */
export interface RLAgent<S, A> {
  alpha: number;
  gamma: number;
  readonly policy?: RLPolicy<S, A>;
  readonly q?: QTableInterface<S, A>;
  train(config: TrainingConfig<S, A>): void;
}

export interface TrainingConfig<S, A> {
  episodes: number;
  maxStepsPerEpisode: number;
  onEpisodeEnd?: (info: EpisodeInfo) => void;
  onUpdate?: (state: S, action: A, reward: number, nextState: S) => void;
}

/**
 * Information about a completed episode
 */
export interface EpisodeInfo {
  readonly episode: number;
  readonly steps: number;
  readonly totalReward: number;
  readonly terminated: boolean;
  readonly truncated?: boolean;
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

/**
 * Discrete environment interface for RL agents
 */
export interface DiscreteEnvironment<S, A> {
  reset(): S;
  actions(state: S): A[];
  step(state: S, action: A): { nextState: S; reward: number; done: boolean };
  potential?(state: S): number;
}
