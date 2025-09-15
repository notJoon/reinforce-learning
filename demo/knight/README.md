# Knight's Tour Problem

A Q-learning solution for the classic Knight's Tour problem, where a chess knight must visit as many squares as possible on a board without revisiting any square.

## Overview

The Knight's Tour is a classic chess puzzle where you must move a knight piece to visit every square on the board exactly once. This implementation uses tabular Q-learning to train an agent to solve (or approximate) this problem.

## Features

- Configurable board size (default: 5x5)
- Adjustable training episodes
- Potential-based reward shaping to encourage exploration
- Modular code structure with separate environment and board configurations

## Usage

### Basic Usage

```bash
# Run with default settings (5x5 board, 60000 episodes)
npm run example knight

# Or run directly
npm run example:knight
```

### With Parameters

Example:

```bash
cd examples/knight
```

```bash
npx tsx knight.ts 5 1000 --visualize
```

### Parameters

1. **Board Size** (first argument): Integer from 3 to 8
   - Default: 5
   - Larger boards are exponentially harder to solve

2. **Episodes** (second argument): Number of training episodes
   - Default: 60000
   - More episodes generally lead to better solutions

3. **Visualization** (flag): `--visualize` or `-v`
   - Generates visual representations of:
     - **Path visualization**: Knight's tour path on the board
     - **Q-table heatmap**: Learned Q-values for each state
   - Creates multiple output files:
     - `image.png` and `image_hq.png`: Path visualization
     - `qtable_heatmap.png`: Q-value heatmap
     - `path_data.json`: Path data
     - `qtable.json`: Full Q-table data
     - `qtable_grid.json`: Simplified Q-table (max Q per state)

## Implementation Details

### Reward Structure

- **+1**: For each new square visited
- **+100**: Bonus for completing the full tour
- **-2**: Penalty for illegal moves (revisiting squares or going out of bounds)

### Potential-Based Reward Shaping

The environment uses potential-based reward shaping (Ng et al., 1999) to guide the agent toward states with more available moves, helping it avoid dead-ends early in training.

### Q-Learning Parameters

- **Learning rate (α)**: 0.2
- **Discount factor (γ)**: 0.98
- **Exploration**: Exponential epsilon decay from 0.8 to 0.02

## Example Output

```
ep=0 avgR≈0.12
ep=5000 avgR≈14.24
...
Board 5×5 — Path length: 13/25
1:(0,0) -> 2:(2,1) -> 3:(1,3) -> ... -> 13:(0,4)

Path data saved to: path_data.json
Q-table saved to: qtable.json
Q-table grid saved to: qtable_grid.json

Generating visualizations...
Visualization saved to qtable_heatmap.png
Q-table heatmap saved to: qtable_heatmap.png
Path visualization saved to: image.png
```

### Visualization Outputs

#### Path Visualization
The path visualization (`image.png`) shows:
- Chessboard with alternating colors
- **S**: Start position (green)
- **E**: End position (red)
- Red arrows showing the path
- Numbered circles indicating step order
- Title with completion statistics

#### Q-Table Heatmap
The Q-table heatmap (`qtable_heatmap.png`) shows:
- Heat map of maximum Q-values for each board position
- Red/blue color scale (red = high Q-value, blue = low Q-value)
- Numeric Q-values displayed in each cell
- Grid overlay for clarity
- Helps visualize which states the agent considers most valuable

## References

- Ng, A. Y., Harada, D., & Russell, S. (1999). Policy invariance under reward transformations: Theory and application to reward shaping. *ICML*.
