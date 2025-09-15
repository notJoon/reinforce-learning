# Environment

This document describes the gym-like environment interface used in the reinforcement learning framework.

## Overview

The `GymEnv` interface provides a standardized contract for environments, inspired by OpenAI Gym but adapted for TypeScript with strong typing support.

## Core Interface

```typescript
interface GymEnv<TObservation, TAction, TInfo> {
  seed(s: number): void;
  reset(): TObservation;
  step(action: TAction): StepResult<TObservation, TInfo>;
  close(): void;
  getActionMask(): ActionMask;
}
```

### Type Parameters

- `TObservation`: The type of observations returned by the environment
- `TAction`: The type of actions accepted by the environment
- `TInfo`: Additional information provided with each step

## Methods

### `seed(s: number): void`

Sets the random seed for deterministic behavior. This ensures reproducible experiments.

```typescript
env.seed(42); // Set seed for reproducibility
```

### `reset(): TObservation`

Resets the environment to its initial state and returns the initial observation.

```typescript
const initialObs = env.reset();
```

### `step(action: TAction): StepResult<TObservation, TInfo>`

Executes an action in the environment and returns the result.

```typescript
const result = env.step(action);
// result.observation - next observation
// result.reward - reward for this step
// result.done - whether episode is finished
// result.info - additional information
```

### `close(): void`

Cleans up any resources used by the environment.

```typescript
env.close(); // Clean up when done
```

### `getActionMask(): ActionMask`

Returns information about which actions are currently valid.

```typescript
const mask = env.getActionMask();
```

## Action Masks

Action masks indicate which actions are valid in the current state:

```typescript
type ActionMask = 
  | { type: 'boolean'; mask: boolean[] }
  | { type: 'ids'; validActionIds: number[] };
```

### Boolean Mask

```typescript
{
  type: 'boolean',
  mask: [true, false, true, true] // Actions 0, 2, 3 are valid
}
```

### ID List
```typescript
{
  type: 'ids',
  validActionIds: [0, 2, 3] // Same as above
}
```

## Step Result

The `step` method returns a structured result:

```typescript
interface StepResult<TObservation, TInfo> {
  observation: TObservation;
  reward: number;
  done: boolean;
  info: TInfo;
}
```

## Example Implementation

Here's a simple grid world environment:

```typescript
interface GridObservation {
  position: [number, number];
  goalVisible: boolean;
}

interface GridInfo {
  steps: number;
  distanceToGoal: number;
}

class GridWorld implements GymEnv<GridObservation, string, GridInfo> {
  private position: [number, number] = [0, 0];
  private goal: [number, number] = [4, 4];
  private rng: () => number;
  private steps: number = 0;

  seed(s: number): void {
    this.rng = seedRandom(s);
  }

  reset(): GridObservation {
    this.position = [0, 0];
    this.steps = 0;
    return {
      position: [...this.position],
      goalVisible: this.canSeeGoal()
    };
  }

  step(action: string): StepResult<GridObservation, GridInfo> {
    // Move based on action
    switch (action) {
      case 'up':    this.position[1] = Math.max(0, this.position[1] - 1); break;
      case 'down':  this.position[1] = Math.min(4, this.position[1] + 1); break;
      case 'left':  this.position[0] = Math.max(0, this.position[0] - 1); break;
      case 'right': this.position[0] = Math.min(4, this.position[0] + 1); break;
    }

    this.steps++;
    const done = this.position[0] === this.goal[0] && 
                 this.position[1] === this.goal[1];
    
    return {
      observation: {
        position: [...this.position],
        goalVisible: this.canSeeGoal()
      },
      reward: done ? 10 : -1,
      done,
      info: {
        steps: this.steps,
        distanceToGoal: this.manhattanDistance()
      }
    };
  }

  getActionMask(): ActionMask {
    const validActions: string[] = [];
    if (this.position[1] > 0) validActions.push('up');
    if (this.position[1] < 4) validActions.push('down');
    if (this.position[0] > 0) validActions.push('left');
    if (this.position[0] < 4) validActions.push('right');
    
    return {
      type: 'ids',
      validActionIds: validActions
    };
  }

  close(): void {
    // Clean up if needed
  }

  private canSeeGoal(): boolean {
    return this.manhattanDistance() <= 2;
  }

  private manhattanDistance(): number {
    return Math.abs(this.position[0] - this.goal[0]) + 
           Math.abs(this.position[1] - this.goal[1]);
  }
}
```

## Integration with DiscreteEnv

The older `DiscreteEnv` interface from qlearn-lite can be adapted to work with `GymEnv`:

```typescript
class DiscreteEnvAdapter<S, A> implements GymEnv<S, A, { steps: number }> {
  private rng: () => number = Math.random;
  private episodeSteps: number = 0;

  constructor(private env: DiscreteEnv<S, A>) {}

  seed(s: number): void {
    this.rng = seedRandom(s);
  }

  reset(): S {
    this.episodeSteps = 0;
    return this.env.reset();
  }

  step(action: A): StepResult<S, { steps: number }> {
    const result = this.env.step(this.lastState!, action);
    this.episodeSteps++;
    this.lastState = result.nextState;
    
    return {
      observation: result.nextState,
      reward: result.reward,
      done: result.done,
      info: { steps: this.episodeSteps }
    };
  }

  getActionMask(): ActionMask {
    const actions = this.env.actions(this.lastState!);
    return {
      type: 'ids',
      validActionIds: actions
    };
  }

  close(): void {}

  private lastState?: S;
}
```

## Best Practices

1. **Always seed your environment** for reproducible experiments
2. **Check action masks** before selecting actions to avoid invalid moves
3. **Handle terminal states** properly (when `done = true`)
4. **Clean up resources** by calling `close()` when finished
5. **Use type parameters** to ensure type safety throughout your code

## See Also

- [Reward System](./REWARD.md) - Configuring rewards
- [Timeout Policy](./TIMEOUT.md) - Managing episode and total step limits
- [Logging](./LOGGING.md) - Recording trajectories