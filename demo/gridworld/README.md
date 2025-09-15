# GridWorld Q-Learning Demo

A simple grid world environment where an agent learns to navigate from the start position (0,0) to the goal position (N-1, N-1) using Q-learning.

## Prerequisites

For visualization support, install Python dependencies:

```bash
pip install matplotlib numpy seaborn
```

## Environment

- **Grid Size**: 5x5 (configurable)
- **Start Position**: (0, 0) - top-left corner
- **Goal Position**: (4, 4) - bottom-right corner
- **Actions**: Up, Down, Left, Right
- **Rewards**:
  - Goal reached: +100
  - Each step: -1 (encourages finding shortest path)
  - Hitting wall: -5 (additional penalty)

## Features

- Tabular Q-learning with configurable hyperparameters
- Epsilon-greedy exploration with linear decay
- Potential-based reward shaping for faster convergence
- Visual representation of learned policy
- Training history and Q-table export

## Running the Demo

```bash
# From the demo directory
npm run gridworld

# Or using the development version
npm run dev:gridworld

# With visualization (requires Python dependencies)
npm run dev:gridworld -- --visualize
# or
npm run dev:gridworld -- -v
```

## Output

The demo will:

1. Train the agent for 100 episodes
2. Show training progress every 10 episodes
3. Test the learned policy with 5 greedy rollouts
4. Display a grid visualization showing the best action for each state
5. Save the Q-table and training history to `generated/` directory

### Example Output

```
🎮 GridWorld Q-Learning Demo
Grid Size: 5x5
Start: (0, 0), Goal: (4, 4)

🏃 Training...

Episode 10/100 | Avg Reward: -45.2 | Success Rate: 3/10 | ε: 0.910
Episode 20/100 | Avg Reward: -12.7 | Success Rate: 8/10 | ε: 0.820
...

📊 Q-Table Visualization:
   0   1   2   3   4
0 [ ↓ | → | → | → | ↓ ]
1 [ ↓ | → | → | → | ↓ ]
2 [ → | → | → | → | ↓ ]
3 [ → | → | → | → | ↓ ]
4 [ → | → | → | → | G ]
```

## Customization

You can modify the following parameters in `gridworld.ts`:

- `GRID_SIZE`: Size of the grid (default: 5)
- `EPISODES`: Number of training episodes (default: 100)
- `ALPHA`: Learning rate (default: 0.1)
- `GAMMA`: Discount factor (default: 0.95)
- `EPS_START` / `EPS_END`: Exploration rate range

## Visualization

The grid visualization shows arrows indicating the best action for each state:

- `↑` : Move up
- `↓` : Move down
- `←` : Move left
- `→` : Move right
- `G` : Goal state

## Files Generated

### Always Generated:

- `generated/gridworld_qtable.json`: Complete Q-table with all state-action values
- `generated/gridworld_history.json`: Training history including rewards and steps per episode

### With `--visualize` flag:

- `generated/gridworld_training.png`: Training progress curves showing episode rewards and steps
- `generated/gridworld_qvalues.png`: Heatmap of maximum Q-values for each state
- `generated/gridworld_policy.png`: Grid visualization with arrows showing best action per state
- `generated/gridworld_paths.png`: Sample paths following the learned policy
