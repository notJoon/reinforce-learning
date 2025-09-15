# Reinforcement Learning Demos

This directory contains demonstration examples using the `qlearn-lite` library.

## Generated Files

All output files (JSON data, visualizations) are saved to the `generated/` directory, which is excluded from version control.

## Available Demos

### 1. Knight's Tour (`knight/`)

A classic chess puzzle where a knight must visit every square on the board exactly once.

**Run the demo:**

```bash
npm run dev:knight    # Development mode with tsx
npm run knight        # Production mode (requires build)
```

**Command line options:**

```bash
npm run dev:knight -- 5   # 5x5 board (default)
npm run dev:knight -- 8   # 8x8 board
```

**Generated files:**

- `generated/knight_path_data.json` - Path taken by the knight
- `generated/knight_qtable.json` - Full Q-table data
- `generated/knight_qtable_grid.json` - Simplified grid Q-values

### 2. Q-Table Visualization (`qtable-visualization/`)

Export and visualize Q-learning results as heatmaps.

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

## Project Structure

```
demo/
├── knight/                  # Knight's Tour RL implementation
│   ├── knight.ts           # Main training script
│   └── src/
│       └── env.ts          # Knight environment
├── qtable-visualization/    # Q-table export and visualization
│   ├── export-qtable.ts    # GridWorld example
│   └── README.md           # Detailed instructions
├── generated/              # Output directory (gitignored)
│   └── *.json, *.png      # Generated data and visualizations
├── package.json            # Demo package configuration
└── tsconfig.json           # TypeScript configuration
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
