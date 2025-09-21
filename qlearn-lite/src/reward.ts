/**
 * Reward system with configurable presets
 */

/**
 * Reward configuration for different events
 */
export interface RewardConfig {
  /** Reward for successfully solving the problem */
  solve: number;

  /** Penalty for invalid actions */
  invalid: number;

  /** Penalty for timeout */
  timeout: number;

  /** Cost per step (used for reward shaping) */
  stepCost: number;
}

/**
 * Available reward presets
 */
export type RewardPreset = 'default' | 'shaping-lite' | 'strict';

/**
 * Predefined reward configurations
 */
const REWARD_PRESETS: Record<RewardPreset, RewardConfig> = {
  default: {
    solve: 10,
    invalid: -1,
    timeout: -5,
    stepCost: -0.1,
  },
  'shaping-lite': {
    solve: 10,
    invalid: -0.5,
    timeout: -2,
    stepCost: -0.05,
  },
  strict: {
    solve: 10,
    invalid: -10,
    timeout: -10,
    stepCost: 0, // No step cost in strict mode
  },
};

/**
 * Get a predefined reward preset
 */
export function getRewardPreset(preset: RewardPreset): RewardConfig {
  if (!(preset in REWARD_PRESETS)) {
    throw new Error(`Unknown reward preset: ${preset}`);
  }
  return { ...REWARD_PRESETS[preset] }; // Return a copy
}

/**
 * Event types that can trigger rewards
 */
export type RewardEvent = 'solve' | 'invalid' | 'timeout' | 'step';

/**
 * Options for calculating reward
 */
export interface CalculateRewardOptions {
  /** Reward configuration to use */
  config: RewardConfig;

  /** Primary event that occurred */
  event: RewardEvent;

  /** Whether reward shaping is enabled */
  shapingEnabled: boolean;

  /** Additional events that occurred in the same step */
  additionalEvents?: RewardEvent[];
}

/**
 * Calculate reward based on event and configuration
 */
export function calculateReward(options: CalculateRewardOptions): number {
  const { config, event, shapingEnabled, additionalEvents = [] } = options;

  let totalReward = 0;

  // Process primary event
  totalReward += getEventReward(config, event, shapingEnabled);

  // Process additional events
  for (const additionalEvent of additionalEvents) {
    totalReward += getEventReward(config, additionalEvent, shapingEnabled);
  }

  return totalReward;
}

/**
 * Get reward for a specific event
 */
function getEventReward(config: RewardConfig, event: RewardEvent, shapingEnabled: boolean): number {
  const rewardMap: Record<RewardEvent, number> = {
    solve: config.solve,
    invalid: config.invalid,
    timeout: config.timeout,
    step: shapingEnabled ? config.stepCost : 0,
  };
  return rewardMap[event] ?? 0;
}

/**
 * Validate a reward configuration
 */
export function validateRewardConfig(config: RewardConfig): void {
  const validations: Array<[boolean, string]> = [
    [config.solve > 0, 'solve reward must be positive'],
    [config.invalid <= 0, 'invalid penalty must be non-positive'],
    [config.timeout <= 0, 'timeout penalty must be non-positive'],
    [config.stepCost <= 0, 'step cost must be non-positive'],
  ];

  const failedValidation = validations.find(([isValid]) => !isValid);
  if (failedValidation) {
    throw new Error(failedValidation[1]);
  }
}
