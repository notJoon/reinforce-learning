// Generic RL types for discrete environments.

/** Serialize/deserialize state & action to stable string key for Q-table. */
export type Encoder<T> = (x: T) => string;

export interface DiscreteEnv<S, A> {
    /** Reset to a new episode.
     * @return initial state
     */
    reset(): S;

    /** Enumerate legal actions in the given state.
     * return empty array if terminal state (no legal actions)
     */
    actions(state: S): A[];

    /**
     * Transition: apply action to state.
     * Implementation may ignore state if they maintain internal pointer.
     */
    step(state: S, action: A): { nextState: S; reward: number; done: boolean };

    /** Optional potential function for reward shaping Φ(s)*/
    potential?(state: S): number;
}

/**
 * Learning and discount configuration
 */
export interface QLearningConfig {
    alpha: number; // learning rate
    gamma: number; // discount factor
}

/** ε policy interface (can be ε-greedy, softmax, etc.)*/
export interface Policy<S, A> {
    select(state: S, legal: A[], qval: (s: S, a: A) => number): A | undefined;
}

/** Training options per episode run. */
export interface TrainOptions<S, A> {
    episodes: number;
    maxStepsPerEpisode?: number;
    onEpisodeEnd?: (info: {
      episode: number;
      steps: number;
      totalReward: number;
      terminated: boolean;
    }) => void;
    /** Called on each TD update (s, a, r, s') */
    onUpdate?: (info: {
      state: S;
      action: A;
      reward: number;
      nextState: S;
      done: boolean;
      oldQ: number;
      newQ: number;
    }) => void;
  }
  
  /** Greedy rollout (evaluation) options. */
  export interface RolloutOptions {
    maxSteps?: number;
  }
  