# Reinforcement Learning Demos

This directory contains demonstration examples using the `qlearn-lite` library.

## Quick Start

```bash
# Run a demo
npm run dev:gridworld              # GridWorld navigation
npm run dev:knight -- 5            # Knight's Tour on 5×5 board
npm run qtable                     # Q-table visualization example

# With visualizations (requires Python dependencies)
npm run dev:gridworld -- --visualize
npm run dev:knight -- 5 --visualize
```

## Demo Overview

| Demo                                            | Description                           | Difficulty | Visualization   |
| ----------------------------------------------- | ------------------------------------- | ---------- | --------------- |
| [GridWorld](./gridworld/README.md)              | Navigate from start to goal in a grid | Easy       | ✅ Full support |
| [Knight's Tour](./knight/README.md)             | Visit all chess squares exactly once  | Hard       | ✅ Full support |
| [Q-Table Viz](./qtable-visualization/README.md) | Visualize Q-learning results          | Easy       | ✅ Built-in     |

## Generated Files

All output files (JSON data, visualizations) are saved to the `generated/` directory, which is excluded from version control.

## Available Demos

### Grid World

A simple grid navigation task where an agent learns to find the shortest path from start to goal.

[doc](./gridworld/README.md) (`gridworld/`)

**Features:**

- 5×5 grid environment with configurable size
- Tabular Q-learning with epsilon-greedy exploration
- Potential-based reward shaping for faster convergence
- Visualization support for training curves, Q-values, and learned policy

**Run the demo:**

```bash
npm run dev:gridworld              # Basic training
npm run dev:gridworld -- --visualize  # With visualizations
```

**Generated files:**

- `gridworld_qtable.json` - Complete Q-table
- `gridworld_history.json` - Training history
- `gridworld_policy.png` - Learned policy visualization (with --visualize)

### 2. Knight's Tour

A classic chess puzzle where a knight must visit every square on the board exactly once.

[doc](./knight/README.md) (`knight/`)

**Features:**

- Configurable board sizes (4×4 to 12×12)
- Sparse reward environment with potential shaping
- Exponential epsilon decay for exploration
- Path and Q-value heatmap visualizations

**Run the demo:**

```bash
npm run dev:knight -- 5              # 5×5 board
npm run dev:knight -- 8 --visualize  # 8×8 with visualizations
```

**Generated files:**

- `knight_path_data.json` - Knight's path coordinates
- `knight_qtable.json` - Full Q-table data
- `knight_path.png` - Path visualization (with --visualize)

### 3. Q-Table Visualization

Export and visualize Q-learning results as heatmaps. Demonstrates a simple 4×4 GridWorld.

[doc](./qtable-visualization/README.md) (`qtable-visualization/`)

**Run the demo:**

```bash
npm run qtable        # Train agent and export Q-table
```

**Visualize results:**

```bash
python ../visualize_qtable.py generated/gridworld_qtable_grid.json -o generated/gridworld_heatmap.png -r 4 -c 4
```

**Generated files:**

- `generated/gridworld_qtable.json` - Full Q-table data
- `generated/gridworld_qtable_grid.json` - Grid with max Q-values
- `generated/gridworld_heatmap.png` - Visualization (after running python script)

## Setup

1. Install dependencies from the root directory:

```bash
cd .. && npm install
```

2. For visualization, install Python dependencies:

```bash
pip install -r ../requirements.txt
```

## Development

To add a new demo:

1. Create a new directory under `demo/`
2. Add your TypeScript implementation
3. Update `package.json` with a new script
4. Document usage in this README

## Notes

- All demos use the local `qlearn-lite` package via npm workspaces
- TypeScript files can be run directly with `tsx` for development
- Build with `npm run build` for production deployment
