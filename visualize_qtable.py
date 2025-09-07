#!/usr/bin/env python3
"""
Visualize Q-table values as a heatmap.
Reads Q-table JSON data and creates a heatmap visualization similar to the example.
"""

import json
import numpy as np
import matplotlib.pyplot as plt
import argparse
from typing import Dict, Tuple, Optional
import re


def parse_grid_state(state_str: str) -> Optional[Tuple[int, int]]:
    """
    Parse state string to extract grid coordinates.
    Assumes state format like "(x,y)" or "x,y" or similar patterns.
    """
    # Try to extract two numbers from the state string
    numbers = re.findall(r'-?\d+', state_str)
    if len(numbers) >= 2:
        return (int(numbers[0]), int(numbers[1]))
    return None


def qtable_to_grid(qtable_data: Dict, grid_shape: Optional[Tuple[int, int]] = None) -> np.ndarray:
    """
    Convert Q-table JSON to a 2D grid of max Q-values per state.
    
    Args:
        qtable_data: Q-table data as either:
            - nested dict {state: {action: q_value}} for full Q-table
            - flat dict {state: max_q_value} for simplified grid
        grid_shape: Optional grid dimensions (rows, cols). If None, inferred from data.
    
    Returns:
        2D numpy array with max Q-values for each grid position
    """
    # Parse states to get grid coordinates
    state_coords = {}
    max_x, max_y = 0, 0
    
    for state_key in qtable_data.keys():
        coords = parse_grid_state(state_key)
        if coords:
            x, y = coords
            state_coords[state_key] = (x, y)
            max_x = max(max_x, x)
            max_y = max(max_y, y)
    
    # Determine grid shape
    if grid_shape is None:
        grid_shape = (max_y + 1, max_x + 1)
    
    # Initialize grid with zeros
    grid = np.zeros(grid_shape)
    
    # Fill grid with max Q-values for each state
    for state_key, value in qtable_data.items():
        if state_key in state_coords:
            x, y = state_coords[state_key]
            if 0 <= y < grid_shape[0] and 0 <= x < grid_shape[1]:
                # Handle both formats: nested dict or direct value
                if isinstance(value, dict):
                    # Full Q-table format: get max Q-value across all actions
                    max_q = max(value.values()) if value else 0
                else:
                    # Simplified format: direct Q-value
                    max_q = value
                grid[y, x] = max_q
    
    return grid


def visualize_qtable(json_file: str, output_file: Optional[str] = None, 
                     grid_shape: Optional[Tuple[int, int]] = None,
                     title: str = "Learned Q-values for each state"):
    """
    Create a heatmap visualization of Q-table values.
    
    Args:
        json_file: Path to JSON file containing Q-table data
        output_file: Optional path to save the figure. If None, displays interactively.
        grid_shape: Optional grid dimensions (rows, cols)
        title: Title for the plot
    """
    # Load Q-table data
    with open(json_file, 'r') as f:
        qtable_data = json.load(f)
    
    # Convert to grid
    grid = qtable_to_grid(qtable_data, grid_shape)
    
    # Create figure
    fig, ax = plt.subplots(figsize=(8, 6))
    
    # Create heatmap
    im = ax.imshow(grid, cmap='RdBu_r', aspect='equal')
    
    # Add grid lines
    ax.set_xticks(np.arange(grid.shape[1] + 1) - 0.5, minor=True)
    ax.set_yticks(np.arange(grid.shape[0] + 1) - 0.5, minor=True)
    ax.grid(which='minor', color='white', linestyle='-', linewidth=2)
    
    # Set major ticks for labels
    ax.set_xticks(np.arange(grid.shape[1]))
    ax.set_yticks(np.arange(grid.shape[0]))
    ax.set_xticklabels(np.arange(grid.shape[1]))
    ax.set_yticklabels(np.arange(grid.shape[0]))
    
    # Add values to cells
    for i in range(grid.shape[0]):
        for j in range(grid.shape[1]):
            text = ax.text(j, i, f'{grid[i, j]:.2f}',
                          ha='center', va='center', color='black', fontsize=10)
    
    # Add colorbar
    cbar = plt.colorbar(im, ax=ax)
    cbar.set_label('Q-value', rotation=270, labelpad=20)
    
    # Set title and labels
    ax.set_title(title, fontsize=14, fontweight='bold')
    ax.set_xlabel('X')
    ax.set_ylabel('Y')
    
    # Invert y-axis to match typical grid representation
    ax.invert_yaxis()
    
    # Remove tick marks
    ax.tick_params(which='both', length=0)
    
    plt.tight_layout()
    
    # Save or show
    if output_file:
        plt.savefig(output_file, dpi=150, bbox_inches='tight')
        print(f"Visualization saved to {output_file}")
    else:
        plt.show()


def main():
    parser = argparse.ArgumentParser(description='Visualize Q-table values as a heatmap')
    parser.add_argument('json_file', help='Path to Q-table JSON file')
    parser.add_argument('-o', '--output', help='Output file path (e.g., qtable.png)')
    parser.add_argument('-r', '--rows', type=int, help='Number of grid rows')
    parser.add_argument('-c', '--cols', type=int, help='Number of grid columns')
    parser.add_argument('-t', '--title', default='Learned Q-values for each state',
                       help='Plot title')
    
    args = parser.parse_args()
    
    # Parse grid shape if provided
    grid_shape = None
    if args.rows and args.cols:
        grid_shape = (args.rows, args.cols)
    
    # Visualize
    visualize_qtable(args.json_file, args.output, grid_shape, args.title)


if __name__ == '__main__':
    main()