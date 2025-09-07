# Q-Table Visualization Examples

## Export and Visualize Q-Table

This example demonstrates how to export Q-table values to JSON and visualize them as a heatmap.

### Setup

1. Install TypeScript dependencies:
```bash
cd qlearn-lite
npm install
```

2. Install Python dependencies:
```bash
pip install -r ../requirements.txt
```

### Usage

1. Train an agent and export Q-table:
```bash
npm run example:export
# or
npx ts-node examples/export-qtable.ts
```

This will create two JSON files:
- `qtable.json`: Full Q-table with all state-action pairs
- `qtable_grid.json`: Simplified grid with max Q-values per state

2. Visualize the Q-table:
```bash
python ../visualize_qtable.py qtable.json -o qtable_heatmap.png -r 4 -c 4
```

### Visualization Options

The Python script supports several options:
- `-o, --output`: Save visualization to file (e.g., `qtable.png`)
- `-r, --rows`: Number of grid rows
- `-c, --cols`: Number of grid columns  
- `-t, --title`: Custom plot title

### Custom State Encoders

The visualization script attempts to parse state strings to extract grid coordinates. It supports formats like:
- `(x,y)` - Parentheses with comma
- `x,y` - Plain comma-separated
- `[x,y]` - Brackets with comma

For custom state representations, modify the `parse_grid_state()` function in `visualize_qtable.py`.