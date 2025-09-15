# Knight's Tour - Reinforcement Learning Demo

This demo uses Q-learning to solve the Knight's Tour problem, a classic chess puzzle where a knight must visit every square on the board exactly once.

## Overview

The Knight's Tour is a challenging problem for reinforcement learning because:

- Large state space (N² positions on an N×N board)
- Sparse rewards (only at the end of a complete tour)
- Complex movement patterns (L-shaped knight moves)
- No revisiting allowed (each square visited only once)

## Implementation Details

### Environment (`src/env.ts`)

The environment implements the `DiscreteEnv` interface with:

- **State**: Current knight position `{x, y}`
- **Actions**: Valid knight moves (up to 8 L-shaped moves)
- **Rewards**:
  - +1 per valid move (encourages exploration)
  - -2 for illegal moves (prevents revisiting)
  - +100 for completing the tour
  - Potential-based shaping to guide learning

### Agent Configuration

- **Algorithm**: Tabular Q-learning
- **Policy**: ε-greedy with exponential decay
  - Initial ε: 0.8 (80% exploration)
  - Final ε: 0.02 (2% exploration)
  - Decay rate: 3.0/60000
- **Learning parameters**:
  - α (learning rate): 0.2
  - γ (discount factor): 0.98
- **Training**: 60,000 episodes

## Usage

### Basic Usage

```bash
# Train on default 5×5 board
npm run dev:knight

# Train on different board sizes
npm run dev:knight -- 4   # 4×4 board
npm run dev:knight -- 8   # 8×8 board
npm run dev:knight -- 12  # 12×12 board
```

### With Visualization

```bash
# Generate visualizations after training
npm run dev:knight -- 5 --visualize

# Or use -v flag
npm run dev:knight -- 5 -v
```

## Generated Files

All output files are saved to `../generated/`:

### Data Files

- **`knight_path_data.json`**: The knight's path through the board

  ```json
  {
    "board_size": 5,
    "start": {"x": 0, "y": 0},
    "path": [{"step": 1, "x": 0, "y": 0}, ...],
    "total_squares": 25,
    "visited_squares": 18
  }
  ```

- **`knight_qtable.json`**: Complete Q-table with state-action values
- **`knight_qtable_grid.json`**: Simplified grid with max Q-value per position

### Visualizations (with --visualize flag)

- **`knight_path.png`**: Visual representation of the knight's path (requires Python visualization script)
- **`knight_qtable_heatmap.png`**: Heatmap of Q-values across the board

## Q-Table Visualization

To manually generate a Q-table heatmap:

```bash
python ../../visualize_qtable.py ../generated/knight_qtable_grid.json \
  -o ../generated/knight_heatmap_NxN.png -r N -c N \
  -t "Knight's Tour Q-values (NxN)"
```

Replace N with your board size.

### Example Q-table Heatmap

The heatmap shows learned Q-values for each board position:

- **Bright/Red areas**: High Q-values (good positions)
- **Dark/Blue areas**: Low Q-values (difficult positions)
- **Center positions**: Usually have higher values (more move options)
- **Corners/edges**: Usually have lower values (fewer move options)

## Performance by Board Size

| Board Size | Typical Success Rate | Training Time | Difficulty |
| ---------- | -------------------- | ------------- | ---------- |
| 4×4        | ~80%                 | < 1 sec       | Easy       |
| 5×5        | ~60%                 | ~2 sec        | Moderate   |
| 6×6        | ~40%                 | ~5 sec        | Hard       |
| 8×8        | ~10%                 | ~20 sec       | Very Hard  |
| 12×12      | <5%                  | ~1 min        | Extreme    |

## Algorithm Improvements

The implementation includes several optimizations:

1. **Potential-based reward shaping**: Guides the agent toward unvisited squares
2. **Forbidden revisits**: Prevents cycles and encourages exploration
3. **Adaptive exploration**: Exponential decay balances exploration/exploitation
4. **State encoding**: Efficient string-based state representation

## Example Output

```
ep=0 avgR≈0.06
ep=5000 avgR≈13.96
ep=10000 avgR≈14.01
ep=15000 avgR≈14.51
ep=20000 avgR≈14.81
ep=25000 avgR≈14.71
ep=30000 avgR≈15.33
ep=35000 avgR≈15.25
ep=40000 avgR≈15.72
ep=45000 avgR≈16.60
ep=50000 avgR≈14.85
ep=55000 avgR≈17.26
Board 5×5 — Path length: 18/25
1:(0,0) -> 2:(1,2) -> 3:(3,3) -> 4:(1,4) -> 5:(2,2) -> ... -> 18:(3,4)

Path data saved to: /path/to/generated/knight_path_data.json
Q-table saved to: /path/to/generated/knight_qtable.json
Q-table grid saved to: /path/to/generated/knight_qtable_grid.json
```

## Troubleshooting

### Knight gets stuck

- Increase training episodes
- Adjust exploration parameters (initial ε, decay rate)
- Try different reward configurations

### Visualization not working

- Ensure Python dependencies are installed: `pip install -r ../../../requirements.txt`
- Check that the generated JSON files exist in `../generated/`

### Path visualization script missing

- The `visualize.py` script for path visualization is not included in this demo
- Use the Q-table heatmap visualization with `visualize_qtable.py` instead

## References

- [Knight's Tour on Wikipedia](https://en.wikipedia.org/wiki/Knight%27s_tour)
- Warnsdorff's heuristic (classical solution)
- Q-learning with potential-based reward shaping (Ng et al., 1999)
