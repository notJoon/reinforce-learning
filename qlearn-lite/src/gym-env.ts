/**
 * Gym-like environment contract with standardized interfaces
 */

/**
 * Action mask to indicate which actions are valid
 */
export type ActionMask =
  | { type: 'boolean'; mask: boolean[] }
  | { type: 'ids'; validActionIds: number[] };

/**
 * Step result from the environment
 */
export interface StepResult<TObservation, TInfo> {
  observation: TObservation;
  reward: number;
  done: boolean;
  info: TInfo;
}

/**
 * Standardized gym-like environment interface
 */
export interface GymEnv<TObservation, TAction, TInfo> {
  /**
   * Set the random seed for deterministic behavior
   */
  seed(s: number): void;

  /**
   * Reset the environment to initial state
   */
  reset(): TObservation;

  /**
   * Take a step in the environment
   */
  step(action: TAction): StepResult<TObservation, TInfo>;

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
 * Simple seeded random number generator
 */
export function seedRandom(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 2147483647;
    return state / 2147483647;
  };
}
