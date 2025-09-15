# Q-Table Visualization Demo

This demo shows how to export Q-table values to JSON and visualize them as a heatmap.

## Prerequisites

1. Build the qlearn-lite library:

```bash
cd ../.. && npm run build
```

2. Install Python dependencies (if not already installed):

```bash
pip install -r ../../../requirements.txt
```

## Usage

### 1. Train and Export Q-table

Run the export script:

```bash
# Using tsx (recommended)
npx tsx export-qtable.ts

# Or using Node after building
cd ../.. && npm run build && cd demo/qtable-visualization
node ../../dist/demo/qtable-visualization/export-qtable.js
```

This creates two JSON files in the `generated/` directory:

- `generated/gridworld_qtable.json`: Full Q-table with all state-action pairs
- `generated/gridworld_qtable_grid.json`: Simplified grid with max Q-values per state

### 2. Visualize the Q-table

Generate a heatmap visualization:

```bash
python ../../visualize_qtable.py ../generated/gridworld_qtable_grid.json -o ../generated/gridworld_heatmap.png -r 4 -c 4
```

### Visualization Options

- `-o, --output`: Save visualization to file (e.g., `qtable.png`)
- `-r, --rows`: Number of grid rows (default: 4)
- `-c, --cols`: Number of grid columns (default: 4)
- `-t, --title`: Custom plot title

### Understanding the Output

The heatmap shows:

- **Brighter colors**: Higher Q-values (better states)
- **Darker colors**: Lower Q-values (worse states)
- **Goal state**: Usually has the highest value (brightest)
- **Start state**: Usually has intermediate values

### Custom Environments

To visualize Q-tables from other environments:

1. Ensure your state encoder produces parseable strings
2. Supported formats: `(x,y)`, `x,y`, `[x,y]`
3. For custom formats, modify `parse_grid_state()` in `visualize_qtable.py`
