# Reward System

This document describes the reward configuration system for reinforcement learning environments.

## Overview

The reward system provides configurable presets for different types of reward structures, supporting both sparse and shaped rewards.

## Reward Events

The system recognizes four types of events that can generate rewards:

- `solve`: Successfully completing the task
- `invalid`: Taking an invalid action
- `timeout`: Exceeding time limits
- `step`: Each step taken (for reward shaping)

## Reward Configuration

```typescript
interface RewardConfig {
  solve: number; // Reward for solving
  invalid: number; // Penalty for invalid actions
  timeout: number; // Penalty for timeout
  stepCost: number; // Cost per step (for shaping)
}
```

## Predefined Presets

### Default Preset

Balanced rewards suitable for most environments:

```typescript
{
  solve: 10,
  invalid: -1,
  timeout: -5,
  stepCost: -0.1
}
```

### Shaping-Lite Preset

Gentler penalties to encourage exploration:

```typescript
{
  solve: 10,
  invalid: -0.5,
  timeout: -2,
  stepCost: -0.05
}
```

### Strict Preset

Harsh penalties with no step cost (sparse rewards):

```typescript
{
  solve: 10,
  invalid: -10,
  timeout: -10,
  stepCost: 0
}
```

## Usage

### Using Presets

```typescript
import { getRewardPreset, calculateReward } from 'qlearn-lite';

// Get a preset configuration
const config = getRewardPreset('default');

// Calculate reward for an event
const reward = calculateReward({
  config,
  event: 'step',
  shapingEnabled: true,
});
```

### Custom Configuration

```typescript
const customConfig: RewardConfig = {
  solve: 100, // Big reward for solving
  invalid: -50, // Heavy penalty for mistakes
  timeout: -25, // Moderate timeout penalty
  stepCost: -2, // Higher step cost
};

const reward = calculateReward({
  config: customConfig,
  event: 'solve',
  shapingEnabled: true,
});
```

### Multiple Events

Handle multiple events in a single step:

```typescript
const reward = calculateReward({
  config: getRewardPreset('default'),
  event: 'step',
  additionalEvents: ['invalid'], // Step + invalid action
  shapingEnabled: true,
});
// Returns: stepCost + invalid penalty
```

## Reward Shaping

Reward shaping helps guide learning by providing intermediate feedback:

```typescript
// With shaping enabled
const shapedReward = calculateReward({
  config: getRewardPreset('shaping-lite'),
  event: 'step',
  shapingEnabled: true,
});
// Returns: -0.05 (step cost)

// With shaping disabled
const sparseReward = calculateReward({
  config: getRewardPreset('shaping-lite'),
  event: 'step',
  shapingEnabled: false,
});
// Returns: 0 (no step cost applied)
```

## Integration Example

```typescript
class RewardedEnvironment {
  private rewardConfig: RewardConfig;
  private shapingEnabled: boolean;

  constructor(preset: RewardPreset = 'default', shaping = true) {
    this.rewardConfig = getRewardPreset(preset);
    this.shapingEnabled = shaping;
  }

  step(action: string): StepResult {
    // Check if action is valid
    if (!this.isValidAction(action)) {
      return {
        observation: this.getObservation(),
        reward: calculateReward({
          config: this.rewardConfig,
          event: 'invalid',
          shapingEnabled: this.shapingEnabled,
        }),
        done: false,
        info: { reason: 'invalid_action' },
      };
    }

    // Execute action
    const done = this.executeAction(action);

    // Determine reward
    let event: RewardEvent = 'step';
    if (done && this.isSolved()) {
      event = 'solve';
    } else if (this.isTimeout()) {
      event = 'timeout';
    }

    return {
      observation: this.getObservation(),
      reward: calculateReward({
        config: this.rewardConfig,
        event,
        shapingEnabled: this.shapingEnabled,
      }),
      done,
      info: this.getInfo(),
    };
  }
}
```

## Validation

The system includes validation to ensure reward configurations are sensible:

```typescript
import { validateRewardConfig } from 'qlearn-lite';

try {
  validateRewardConfig({
    solve: -10, // Error: must be positive
    invalid: 5, // Error: must be non-positive
    timeout: 10, // Error: must be non-positive
    stepCost: 1, // Error: must be non-positive
  });
} catch (error) {
  console.error('Invalid configuration:', error.message);
}
```

## Best Practices

1. **Start with default preset** and adjust based on performance
2. **Use shaping for complex tasks** where sparse rewards make learning difficult
3. **Use strict preset for simple tasks** where the path to solution is clear
4. **Monitor reward distribution** to ensure appropriate signal strength
5. **Consider domain-specific rewards** beyond the standard events

## Choosing a Preset

- **Default**: Good starting point for most environments
- **Shaping-Lite**: When agents struggle to find any rewards
- **Strict**: When you want to minimize suboptimal behavior
- **Custom**: When domain-specific requirements don't fit presets

## See Also

- [Environment Contract](./ENV.md) - Environment interface
- [Timeout Policy](./TIMEOUT.md) - Managing timeouts
- [Logging](./LOGGING.md) - Recording rewards in trajectories
