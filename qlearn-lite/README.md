# qlearn-lite

Lightweight, reusable tabular Q-learning library for discrete RL environments in TypeScript.

## Quick Start

```bash
# Install dependencies
make install

# Run complete pipeline (build, train, visualize)
make pipeline

# Or run individual steps
make build      # Build TypeScript
make train      # Train agent and export Q-table
make visualize  # Generate heatmap visualization
```

## Features

- **Tabular Q-learning**: Efficient implementation for discrete state/action spaces
- **Modular design**: Separate environment, agent, policy, and Q-table components
- **TypeScript support**: Full type safety with generics
- **JSON export**: Export Q-tables for analysis and visualization
- **Python visualization**: Generate heatmaps of learned Q-values

## Makefile Commands

| Command | Description |
|---------|-------------|
| `make build` | Compile TypeScript to JavaScript |
| `make clean` | Remove build artifacts and generated files |
| `make install` | Install Node.js and Python dependencies |
| `make train` | Train Q-learning agent and export Q-table |
| `make visualize` | Generate heatmap from Q-table data |
| `make pipeline` | Run complete pipeline (clean, build, train, visualize) |
| `make quick` | Quick train and visualize (no rebuild) |
| `make dev` | Development mode (clean + pipeline) |
| `make check` | Check if required tools are installed |
| `make help` | Show available commands |

## Example Usage

### Training and Visualization

```bash
# Quick run - train and visualize
make quick

# Full pipeline from scratch
make pipeline

# Development iteration
make dev
```

### Custom Training

```typescript
import { QLeaningAgent, EpsilonGreedy, ExpEpsilon } from 'qlearn-lite';

// Define your environment
class MyEnvironment {
    reset() { /* ... */ }
    actions(state) { /* ... */ }
    step(state, action) { /* ... */ }
}

// Create and train agent
const env = new MyEnvironment();
const policy = new EpsilonGreedy(new ExpEpsilon(1.0, 0.01, 0.005));
const agent = new QLeaningAgent(env, policy, { alpha: 0.1, gamma: 0.95 });

agent.train({
    episodes: 1000,
    maxStepsPerEpisode: 100
});

// Export Q-table
const qtable = agent.q.toJSON();
```

## Visualization

The Python visualization script creates heatmaps showing learned Q-values:

```bash
# Visualize simplified grid (max Q per state)
python3 visualize_qtable.py qtable_grid.json -o heatmap.png -r 4 -c 4

# Visualize full Q-table
python3 visualize_qtable.py qtable.json -o heatmap_full.png -r 4 -c 4
```

## Project Structure

```
qlearn-lite/
├── src/              # TypeScript source files
│   ├── agent.ts      # Q-learning agent
│   ├── qtable.ts     # Q-table implementation
│   ├── policy.ts     # Action selection policies
│   └── types.ts      # Type definitions
├── examples/         # Example implementations
├── dist/             # Compiled JavaScript (generated)
├── Makefile          # Build automation
└── package.json      # Node.js configuration
```

## Requirements

- Node.js 20+
- npm
- Python 3.6+
- NumPy
- Matplotlib

Check installation:
```bash
make check
```