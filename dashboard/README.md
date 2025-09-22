# RL Dashboard

Real-time Reinforcement Learning Monitoring and Control Dashboard

## Features

### Monitoring Features

- **Real-time Training Progress**
  - Episode/Step counters
  - Reward graphs (with moving average)
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

### 1. Basic Dashboard (Monitoring Only)

```typescript
import { DashboardWrapper } from 'rl-dashboard';

const dashboardWrapper = new DashboardWrapper({
  refreshRate: 100,
  historyLength: 200,
  movingAverageWindow: 20,
});

const agentWithDashboard = dashboardWrapper.wrapAgent(agent);
agentWithDashboard.train({
  episodes: 500,
  maxStepsPerEpisode: 100,
});
```

### 2. Interactive Dashboard (Full Control)

```typescript
import { InteractiveWrapper } from 'rl-dashboard';

const wrapper = new InteractiveWrapper({
  refreshRate: 100,
  historyLength: 200,
  movingAverageWindow: 20,
});

const interactiveAgent = wrapper.wrapAgent(agent, env);

// Start asynchronous training
await interactiveAgent.trainInteractive({
  maxStepsPerEpisode: 100,
});
```

### 3. Running Examples

Basic Dashboard:

```bash
npx tsx gridworld/gridworld-dashboard.ts
```

Interactive Dashboard:

```bash
npx tsx gridworld/test-interactive.ts
```

## Keyboard Shortcuts

### Basic Controls

- `Space` - Pause/Resume
- `r` - Reset training (reinitialize Q-table)
- `c` - Toggle continuous/fixed mode
- `s` - Stop training
- `q`, `ESC` - Quit

### Parameter Adjustments

- `1`/`2` - Decrease/Increase learning rate (α) (±0.01)
- `3`/`4` - Decrease/Increase discount factor (γ) (±0.01)
- `5`/`6` - Decrease/Increase exploration rate (ε) (±0.05)
- `7`/`8` - Decrease/Increase decay rate (±0.001)

### Episode Controls

- `+`/`-` - Target episodes ±10
- `*` - Target episodes ×2

## Dashboard Layout

### Basic Dashboard

```
┌──────────────────────┬──────────┐
│   Episode Rewards    │  Stats   │
│      (Graph)         │  (Table) │
├──────────────────────┼──────────┤
│  Steps per Episode   │ Current  │
│      (Graph)         │ Episode  │
├──────────────────────┴──────────┤
│         Training Log            │
└─────────────────────────────────┘
```

### Interactive Dashboard

```
┌────────────┬──────────┬──────────┐
│  Rewards   │ Control  │  Stats   │
│   (Graph)  │  Panel   │  (Table) │
├────────────┼──────────┼──────────┤
│   Steps    │Parameters│ Current  │
│   (Graph)  │  Panel   │ Episode  │
├────────────┴──────────┼──────────┤
│     Training Log      │   Help   │
└───────────────────────┴──────────┘
```
