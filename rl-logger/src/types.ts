/**
 * Common types for RL environments and logging
 */

/**
 * Observation returned by the environment
 */
export interface Observation {
  /** The current goal or state description */
  goalText: string;

  /** Metadata about the current state */
  meta: {
    /** Depth of the current goal in the proof tree */
    goalDepth: number;
    /** Number of subgoals */
    subgoalCount: number;
  };

  /** Optional hints for the current state */
  hints?: string[];
}

/**
 * Information about the step or episode
 */
export interface StepInfo {
  /** Reason for episode termination */
  reason?: 'timeout' | 'success' | 'invalid' | 'stuck';

  /** Number of steps in current episode */
  episodeSteps: number;

  /** Total steps across all episodes */
  totalSteps: number;

  /** Additional metadata */
  [key: string]: unknown;
}

/**
 * A single trajectory entry
 */
export interface TrajectoryEntry<TAction = unknown> {
  /** Unix timestamp in milliseconds */
  timestamp: number;

  /** Episode number */
  episode: number;

  /** Step within episode */
  step: number;

  /** Current state observation */
  state: Observation;

  /** Action taken */
  action: TAction;

  /** Reward received */
  reward: number;

  /** Next state observation */
  nextState: Observation;

  /** Whether episode is done */
  done: boolean;

  /** Additional step information */
  info: StepInfo;
}

/**
 * Run metadata for reproducibility
 */
export interface RunMetadata {
  /** RL engine/library name */
  engine: string;

  /** Dataset or environment name */
  dataset: string;

  /** Environment version */
  envVersion: string;

  /** Algorithm version */
  algoVersion: string;

  /** Random seed for reproducibility */
  seed: number;

  /** Run timestamp */
  timestamp: number;

  /** Additional metadata */
  [key: string]: string | number;
}
