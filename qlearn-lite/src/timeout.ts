/**
 * Timeout policy implementation for RL environments
 */

/**
 * Configuration for timeout limits
 */
export interface TimeoutConfig {
  /** Maximum steps allowed per episode */
  maxStepsPerEpisode?: number;

  /** Maximum total steps across all episodes */
  maxTotalSteps?: number;
}

/**
 * Information about timeout status
 */
export interface TimeoutInfo {
  /** Current episode step count */
  episodeSteps: number;

  /** Total steps across all episodes */
  totalSteps: number;

  /** Whether episode timeout is reached */
  isEpisodeTimeout: boolean;

  /** Whether total timeout is reached */
  isTotalTimeout: boolean;

  /** Timeout reason if any */
  reason?: 'episode_timeout' | 'total_timeout';
}

/**
 * Manages timeout tracking for RL training
 */
export class TimeoutManager {
  private config: TimeoutConfig;
  private episodeSteps: number = 0;
  private totalSteps: number = 0;

  constructor(config: TimeoutConfig) {
    this.config = config;
  }

  /**
   * Increment step counters
   */
  step(): void {
    this.episodeSteps++;
    this.totalSteps++;
  }

  /**
   * Reset episode counter (not total)
   */
  resetEpisode(): void {
    this.episodeSteps = 0;
  }

  /**
   * Check if episode timeout is reached
   */
  isEpisodeTimeout(): boolean {
    if (this.config.maxStepsPerEpisode === undefined) {
      return false;
    }
    return this.episodeSteps >= this.config.maxStepsPerEpisode;
  }

  /**
   * Check if total timeout is reached
   */
  isTotalTimeout(): boolean {
    if (this.config.maxTotalSteps === undefined) {
      return false;
    }
    return this.totalSteps >= this.config.maxTotalSteps;
  }

  /**
   * Check if any timeout is reached
   */
  isAnyTimeout(): boolean {
    return this.isEpisodeTimeout() || this.isTotalTimeout();
  }

  /**
   * Get current episode steps
   */
  getEpisodeSteps(): number {
    return this.episodeSteps;
  }

  /**
   * Get total steps
   */
  getTotalSteps(): number {
    return this.totalSteps;
  }

  /**
   * Get timeout information
   */
  getTimeoutInfo(): TimeoutInfo {
    const isEpisodeTimeout = this.isEpisodeTimeout();
    const isTotalTimeout = this.isTotalTimeout();

    let reason: 'episode_timeout' | 'total_timeout' | undefined;
    if (isTotalTimeout) {
      reason = 'total_timeout';
    } else if (isEpisodeTimeout) {
      reason = 'episode_timeout';
    }

    return {
      episodeSteps: this.episodeSteps,
      totalSteps: this.totalSteps,
      isEpisodeTimeout,
      isTotalTimeout,
      reason,
    };
  }
}

/**
 * High-level timeout policy for training loops
 */
export class TimeoutPolicy {
  private manager: TimeoutManager;

  constructor(config: TimeoutConfig) {
    this.manager = new TimeoutManager(config);
  }

  /**
   * Run an episode with timeout checking
   * @param stepFn Function that executes one step and returns done flag
   * @returns The final done flag from stepFn
   */
  runEpisode(stepFn: () => boolean): boolean {
    this.manager.resetEpisode();

    while (true) {
      if (this.manager.isTotalTimeout()) {
        throw new Error('Total step limit exceeded');
      }

      const done = stepFn();

      if (done || this.manager.isEpisodeTimeout()) {
        return done;
      }
    }
  }

  /**
   * Increment step counter
   */
  step(): void {
    this.manager.step();
  }

  /**
   * Check if episode timeout is reached
   */
  isEpisodeTimeout(): boolean {
    return this.manager.isEpisodeTimeout();
  }

  /**
   * Check if total timeout is reached
   */
  isTotalTimeout(): boolean {
    return this.manager.isTotalTimeout();
  }

  /**
   * Get current episode steps
   */
  getEpisodeSteps(): number {
    return this.manager.getEpisodeSteps();
  }

  /**
   * Get total steps
   */
  getTotalSteps(): number {
    return this.manager.getTotalSteps();
  }

  /**
   * Get timeout information
   */
  getTimeoutInfo(): TimeoutInfo {
    return this.manager.getTimeoutInfo();
  }
}
