/**
 * Gym-like environment contract with standardized interfaces
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
 * Action mask to indicate which actions are valid
 */
export type ActionMask = 
  | { type: 'boolean'; mask: boolean[] }
  | { type: 'ids'; validActionIds: number[] };

/**
 * Information about the step or episode
 */
export interface Info {
  /** Reason for episode termination */
  reason?: 'timeout' | 'success' | 'invalid' | 'stuck';
  
  /** Number of steps in current episode */
  episodeSteps: number;
  
  /** Total steps across all episodes */
  totalSteps: number;
  
  /** Additional metadata */
  [key: string]: any;
}

/**
 * Standardized gym-like environment interface
 */
export interface GymEnv<A> {
  /**
   * Set the random seed for deterministic behavior
   */
  seed(s: number): void;
  
  /**
   * Reset the environment to initial state
   */
  reset(): Observation;
  
  /**
   * Take a step in the environment
   */
  step(action: A): {
    observation: Observation;
    reward: number;
    done: boolean;
    info: Info;
  };
  
  /**
   * Clean up resources
   */
  close(): void;
  
  /**
   * Get the current action mask
   */
  getActionMask(): ActionMask;
}

/**
 * Validate an observation object
 */
export function validateObservation(obs: any): void {
  if (!obs || typeof obs !== 'object') {
    throw new Error('Observation must be an object');
  }
  
  if (!obs.goalText || typeof obs.goalText !== 'string') {
    throw new Error('goalText is required and must be a string');
  }
  
  if (!obs.meta || typeof obs.meta !== 'object') {
    throw new Error('meta is required and must be an object');
  }
  
  if (typeof obs.meta.goalDepth !== 'number') {
    throw new Error('meta.goalDepth must be a number');
  }
  
  if (typeof obs.meta.subgoalCount !== 'number') {
    throw new Error('meta.subgoalCount must be a number');
  }
  
  if (obs.hints !== undefined) {
    if (!Array.isArray(obs.hints)) {
      throw new Error('hints must be an array of strings');
    }
    for (const hint of obs.hints) {
      if (typeof hint !== 'string') {
        throw new Error('Each hint must be a string');
      }
    }
  }
}

/**
 * Simple seeded random number generator
 */
export function seedRandom(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 2147483647;
    return state / 2147483647;
  };
}