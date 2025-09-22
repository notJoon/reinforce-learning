# RL Interactive Dashboard

Real-time Reinforcement Learning Interactive Control and Monitoring Dashboard

## Features

### Real-time Monitoring

- **Training Progress Display**
  - Episode/Step counters
  - Reward graphs with moving average
  - Steps per episode trend
- **Performance Metrics**
  - Average/Max/Min rewards
  - Success rate
  - Learning rate (α) and exploration rate (ε) display

### Interactive Controls

- **Training Controls**
  - Pause/Resume (Space)
  - Reset training (r)
  - Toggle continuous/fixed episode mode (c)
  - Adjust target episodes (+/-)
  - Stop training (s)
- **Real-time Parameter Adjustment**
  - Learning rate α adjustment (1/2)
  - Discount factor γ adjustment (3/4)
  - Exploration rate ε adjustment (5/6)
  - Decay rate adjustment (7/8)

## Installation

```bash
cd dashboard
npm install
npm run build
```

## Usage

```typescript
import { InteractiveWrapper } from 'rl-dashboard';

const wrapper = new InteractiveWrapper({
  refreshRate: 100,
  historyLength: 200,
  movingAverageWindow: 20,
});

const interactiveAgent = wrapper.wrapAgent(agent, env);

// Start asynchronous training with interactive controls
await interactiveAgent.trainInteractive({
  maxStepsPerEpisode: 100,
});
```

## Running the Example

```bash
# From the demo/gridworld directory
npx tsx gridworld-dashboard.ts
```

## Keyboard Shortcuts

### Training Controls

- `Space` - Pause/Resume training
- `r` - Reset training (reinitialize Q-table with updated parameters)
- `c` - Toggle continuous/fixed episode mode
- `s` - Stop training
- `q`, `ESC` - Quit application

**Note:** The reset function (`r`) will:

1. Clear the Q-table to start fresh
2. Apply any parameter changes made during training
3. Restart training immediately with the new parameters
4. Preserve your parameter adjustments across resets

### Parameter Adjustments

- `1`/`2` - Decrease/Increase learning rate (α) by ±0.01
- `3`/`4` - Decrease/Increase discount factor (γ) by ±0.01
- `5`/`6` - Decrease/Increase exploration rate (ε) by ±0.05
- `7`/`8` - Decrease/Increase decay rate by ±0.001

### Episode Controls

- `+`/`-` - Adjust target episodes by ±10
- `*` - Double target episodes

## Dashboard Layout

```
┌────────────┬──────────┬──────────┐
│  Rewards   │ Control  │  Stats   │
│   Graph    │  Panel   │  Table   │
├────────────┼──────────┼──────────┤
│   Steps    │Parameters│ Current  │
│   Graph    │  Panel   │ Episode  │
├────────────┴──────────┼──────────┤
│     Training Log      │   Help   │
└───────────────────────┴──────────┘
```

## Key Features

- ✨ **Real-time parameter tuning** - Adjust learning parameters during training to see immediate impact
- 🔄 **Reset without stopping** - Reset Q-table and start fresh without terminating the dashboard
- ♾️ **Continuous learning mode** - Train indefinitely until manually stopped
- 📊 **Live performance metrics** - Monitor training progress with real-time graphs and statistics
- 🎮 **Intuitive keyboard interface** - Control all aspects of training with simple keyboard shortcuts
- ⏸️ **Pause and resume** - Pause training at any time to analyze results, then continue where you left off

## API Reference

### InteractiveWrapper

```typescript
class InteractiveWrapper {
  constructor(dashboardConfig?: DashboardConfig);
  wrapAgent<S, A>(agent: RLAgent<S, A>, env?: DiscreteEnvironment<S, A>): InteractiveAgent<S, A>;
}
```

### DashboardConfig

```typescript
interface DashboardConfig {
  refreshRate?: number; // Dashboard update rate in milliseconds (default: 100)
  historyLength?: number; // Number of episodes to keep in history (default: 100)
  movingAverageWindow?: number; // Window size for moving average (default: 10)
}
```

### InteractiveAgent

The wrapped agent gains the `trainInteractive` method:

```typescript
interface InteractiveAgent<S, A> extends RLAgent<S, A> {
  trainInteractive(config: InteractiveTrainingConfig): Promise<void>;
}

interface InteractiveTrainingConfig {
  maxStepsPerEpisode: number;
  targetEpisodes?: number;
}
```

## Requirements

- Node.js 16+
- Terminal with UTF-8 support for proper character rendering
- Reinforcement learning agent implementing the `RLAgent` interface

## License

ISC
