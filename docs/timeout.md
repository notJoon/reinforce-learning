# Timeout Policy

This document describes the timeout management system for controlling episode and total step limits.

## Overview

The timeout system provides configurable limits for:
- Steps per episode
- Total steps across all episodes

This ensures experiments complete in reasonable time and prevents infinite loops.

## Configuration

```typescript
interface TimeoutConfig {
  maxStepsPerEpisode?: number;  // Limit per episode
  maxTotalSteps?: number;       // Total limit across all episodes
}
```

## Basic Usage

### With TimeoutManager

```typescript
import { TimeoutManager } from 'qlearn-lite';

const manager = new TimeoutManager({
  maxStepsPerEpisode: 1000,
  maxTotalSteps: 10000
});

// Training loop
for (let episode = 0; episode < 100; episode++) {
  manager.resetEpisode();
  
  while (!manager.isEpisodeTimeout()) {
    // Take action
    manager.step();
    
    if (done) break;
  }
  
  if (manager.isTotalTimeout()) {
    console.log('Total step limit reached');
    break;
  }
}
```

### With TimeoutPolicy

```typescript
import { TimeoutPolicy } from 'qlearn-lite';

const policy = new TimeoutPolicy({
  maxStepsPerEpisode: 1000,
  maxTotalSteps: 10000
});

try {
  const done = policy.runEpisode(() => {
    policy.step();
    // Your step logic here
    return isDone;
  });
} catch (error) {
  if (error.message === 'Total step limit exceeded') {
    console.log('Training stopped: total timeout');
  }
}
```

## Integration with Q-Learning

The Q-learning agent already supports episode timeouts:

```typescript
agent.train({
  episodes: 100,
  maxStepsPerEpisode: 1000,  // Built-in support
  onEpisodeEnd: (info) => {
    if (!info.terminated) {
      console.log(`Episode ${info.episode} timed out`);
    }
  }
});
```

For total step limits, use TimeoutManager:

```typescript
const timeoutManager = new TimeoutManager({
  maxTotalSteps: 50000
});

for (let run = 0; run < 10; run++) {
  agent.train({
    episodes: 10,
    maxStepsPerEpisode: 1000,
    onUpdate: () => {
      timeoutManager.step();
      if (timeoutManager.isTotalTimeout()) {
        throw new Error('Total timeout reached');
      }
    }
  });
}
```

## Timeout Information

Get detailed timeout status:

```typescript
const info = manager.getTimeoutInfo();
console.log({
  episodeSteps: info.episodeSteps,
  totalSteps: info.totalSteps,
  isEpisodeTimeout: info.isEpisodeTimeout,
  isTotalTimeout: info.isTotalTimeout,
  reason: info.reason  // 'episode_timeout' | 'total_timeout' | undefined
});
```

## Common Patterns

### Early Stopping

```typescript
function trainWithEarlyStopping(agent, maxSteps: number) {
  const timeout = new TimeoutManager({ maxTotalSteps: maxSteps });
  let bestReward = -Infinity;
  let stepsWithoutImprovement = 0;
  
  while (!timeout.isTotalTimeout() && stepsWithoutImprovement < 1000) {
    const result = agent.rollout();
    timeout.step();
    
    if (result.totalReward > bestReward) {
      bestReward = result.totalReward;
      stepsWithoutImprovement = 0;
    } else {
      stepsWithoutImprovement++;
    }
  }
  
  return bestReward;
}
```

### Curriculum Learning

```typescript
class CurriculumTimeout {
  private difficulties = [100, 200, 500, 1000];
  private currentLevel = 0;
  
  getConfig(): TimeoutConfig {
    return {
      maxStepsPerEpisode: this.difficulties[this.currentLevel]
    };
  }
  
  advance() {
    if (this.currentLevel < this.difficulties.length - 1) {
      this.currentLevel++;
    }
  }
}
```

### Adaptive Timeouts

```typescript
class AdaptiveTimeout {
  private recentLengths: number[] = [];
  private windowSize = 10;
  
  updateEpisodeLength(length: number) {
    this.recentLengths.push(length);
    if (this.recentLengths.length > this.windowSize) {
      this.recentLengths.shift();
    }
  }
  
  getConfig(): TimeoutConfig {
    if (this.recentLengths.length === 0) {
      return { maxStepsPerEpisode: 1000 };
    }
    
    const avg = this.recentLengths.reduce((a, b) => a + b) / this.recentLengths.length;
    const buffer = 1.5; // 50% buffer
    
    return {
      maxStepsPerEpisode: Math.ceil(avg * buffer)
    };
  }
}
```

## Best Practices

1. **Set reasonable defaults** - Start with generous limits and tighten as needed
2. **Monitor timeout frequency** - Frequent timeouts may indicate limits are too tight
3. **Use episode timeouts for safety** - Prevent infinite loops in buggy environments
4. **Use total timeouts for budgets** - Control computational resources
5. **Log timeout events** - Track when and why timeouts occur

## Timeout Strategies

### Conservative
```typescript
{
  maxStepsPerEpisode: 10000,  // Very generous
  maxTotalSteps: 1000000      // Allow long training
}
```

### Balanced
```typescript
{
  maxStepsPerEpisode: 1000,   // Reasonable for most tasks
  maxTotalSteps: 100000       // Good for experiments
}
```

### Strict
```typescript
{
  maxStepsPerEpisode: 100,    // Force quick solutions
  maxTotalSteps: 10000        // Limited budget
}
```

## Debugging Timeouts

```typescript
const debug = new TimeoutManager({
  maxStepsPerEpisode: 100,
  maxTotalSteps: 1000
});

// Track timeout patterns
const timeoutReasons: string[] = [];

for (let ep = 0; ep < 50; ep++) {
  debug.resetEpisode();
  
  while (!debug.isAnyTimeout()) {
    debug.step();
    // ... environment step ...
  }
  
  const info = debug.getTimeoutInfo();
  if (info.reason) {
    timeoutReasons.push(info.reason);
  }
}

// Analyze timeout distribution
const episodeTimeouts = timeoutReasons.filter(r => r === 'episode_timeout').length;
const totalTimeouts = timeoutReasons.filter(r => r === 'total_timeout').length;
```

## See Also

- [Environment Contract](./ENV.md) - Environment interface
- [Reward System](./REWARD.md) - Timeout penalties
- [Logging](./LOGGING.md) - Recording timeout events