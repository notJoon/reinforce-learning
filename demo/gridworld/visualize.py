#!/usr/bin/env python3
"""
Visualize GridWorld Q-learning results.

This script creates visualizations for:
1. Learned path from start to goal
2. Q-value heatmap
3. Policy arrows showing best action per state
"""

import json
import sys
import numpy as np
import matplotlib.pyplot as plt
import matplotlib.patches as patches
from matplotlib.patches import FancyBboxPatch
import seaborn as sns


def load_data(history_path, qtable_path):
    """Load training history and Q-table data."""
    with open(history_path, 'r') as f:
        history = json.load(f)
    
    with open(qtable_path, 'r') as f:
        qtable_data = json.load(f)
    
    return history, qtable_data


def plot_training_history(history, output_path):
    """Plot training curves (rewards and steps per episode)."""
    episodes = history['episodes']
    rewards = history['episodeRewards']
    steps = history['episodeSteps']
    
    fig, (ax1, ax2) = plt.subplots(2, 1, figsize=(10, 8))
    
    # Plot rewards
    ax1.plot(rewards, alpha=0.3, label='Episode Rewards')
    
    # Calculate moving average
    window = min(10, episodes // 10)
    if window > 1:
        moving_avg = np.convolve(rewards, np.ones(window)/window, mode='valid')
        ax1.plot(range(window-1, len(rewards)), moving_avg, 'r-', linewidth=2, label=f'{window}-Episode Moving Avg')
    
    ax1.set_xlabel('Episode')
    ax1.set_ylabel('Total Reward')
    ax1.set_title('Training Progress: Episode Rewards')
    ax1.legend()
    ax1.grid(True, alpha=0.3)
    
    # Plot steps
    ax2.plot(steps, alpha=0.3, color='green', label='Steps per Episode')
    
    if window > 1:
        steps_avg = np.convolve(steps, np.ones(window)/window, mode='valid')
        ax2.plot(range(window-1, len(steps)), steps_avg, 'darkgreen', linewidth=2, label=f'{window}-Episode Moving Avg')
    
    ax2.set_xlabel('Episode')
    ax2.set_ylabel('Steps')
    ax2.set_title('Steps to Goal per Episode')
    ax2.legend()
    ax2.grid(True, alpha=0.3)
    
    plt.tight_layout()
    plt.savefig(output_path, dpi=150, bbox_inches='tight')
    plt.close()
    
    print(f"Training history plot saved to: {output_path}")


def plot_qtable_heatmap(qtable_data, grid_size, output_path):
    """Create a heatmap of max Q-values for each state."""
    qtable = qtable_data['qtable']
    
    # Create grid for max Q-values
    q_grid = np.zeros((grid_size, grid_size))
    
    for state_key, actions in qtable.items():
        x, y = map(int, state_key.split(','))
        if actions:  # If there are any actions for this state
            max_q = max(actions.values())
            q_grid[y, x] = max_q
    
    # Create heatmap
    plt.figure(figsize=(8, 8))
    sns.heatmap(q_grid, annot=True, fmt='.1f', cmap='RdYlGn', 
                square=True, cbar_kws={'label': 'Max Q-value'})
    
    plt.title(f'Q-values Heatmap ({grid_size}×{grid_size} GridWorld)')
    plt.xlabel('X Position')
    plt.ylabel('Y Position')
    
    # Mark start and goal
    plt.text(0.5, 0.5, 'S', ha='center', va='center', fontsize=20, fontweight='bold', color='blue')
    plt.text(grid_size-0.5, grid_size-0.5, 'G', ha='center', va='center', fontsize=20, fontweight='bold', color='red')
    
    plt.savefig(output_path, dpi=150, bbox_inches='tight')
    plt.close()
    
    print(f"Q-value heatmap saved to: {output_path}")


def plot_policy_grid(qtable_data, grid_size, output_path):
    """Visualize the learned policy as arrows on a grid."""
    qtable = qtable_data['qtable']
    
    fig, ax = plt.subplots(figsize=(10, 10))
    
    # Set up the grid
    ax.set_xlim(-0.5, grid_size - 0.5)
    ax.set_ylim(-0.5, grid_size - 0.5)
    ax.set_aspect('equal')
    
    # Draw grid lines
    for i in range(grid_size + 1):
        ax.axhline(i - 0.5, color='gray', linewidth=0.5)
        ax.axvline(i - 0.5, color='gray', linewidth=0.5)
    
    # Action to arrow mapping
    action_arrows = {
        'up': (0, 0.3),
        'down': (0, -0.3),
        'left': (-0.3, 0),
        'right': (0.3, 0)
    }
    
    # Draw arrows for best actions
    for state_key, actions in qtable.items():
        if not actions:
            continue
            
        x, y = map(int, state_key.split(','))
        y_plot = grid_size - 1 - y  # Invert y for plotting
        
        # Find best action
        best_action = max(actions.items(), key=lambda x: x[1])[0]
        
        # Skip goal state
        if x == grid_size - 1 and y == grid_size - 1:
            # Draw goal
            goal_box = FancyBboxPatch(
                (x - 0.4, y_plot - 0.4), 0.8, 0.8,
                boxstyle="round,pad=0.1",
                facecolor='gold',
                edgecolor='darkgoldenrod',
                linewidth=2
            )
            ax.add_patch(goal_box)
            ax.text(x, y_plot, 'GOAL', ha='center', va='center', fontsize=10, fontweight='bold')
            continue
        
        # Draw arrow for best action
        if best_action in action_arrows:
            dx, dy = action_arrows[best_action]
            ax.arrow(x, y_plot, dx, dy, head_width=0.15, head_length=0.1, 
                    fc='darkblue', ec='darkblue', linewidth=2)
        
        # Add Q-value text
        max_q = max(actions.values())
        ax.text(x, y_plot - 0.35, f'{max_q:.1f}', ha='center', va='top', fontsize=8, color='gray')
    
    # Mark start position
    start_box = FancyBboxPatch(
        (-0.4, grid_size - 1 - 0.4), 0.8, 0.8,
        boxstyle="round,pad=0.1",
        facecolor='lightgreen',
        edgecolor='darkgreen',
        linewidth=2
    )
    ax.add_patch(start_box)
    ax.text(0, grid_size - 1, 'START', ha='center', va='center', fontsize=10, fontweight='bold')
    
    # Labels and title
    ax.set_xlabel('X Position', fontsize=12)
    ax.set_ylabel('Y Position', fontsize=12)
    ax.set_title(f'Learned Policy - GridWorld {grid_size}×{grid_size}', fontsize=16, fontweight='bold')
    
    # Set ticks
    ax.set_xticks(range(grid_size))
    ax.set_yticks(range(grid_size))
    ax.set_yticklabels(range(grid_size - 1, -1, -1))  # Invert y labels
    
    ax.invert_yaxis()  # To match standard coordinate system
    
    plt.tight_layout()
    plt.savefig(output_path, dpi=150, bbox_inches='tight')
    plt.close()
    
    print(f"Policy visualization saved to: {output_path}")


def plot_sample_paths(qtable_data, grid_size, num_paths, output_path):
    """Visualize multiple sample paths following the learned policy."""
    qtable = qtable_data['qtable']
    
    fig, axes = plt.subplots(1, num_paths, figsize=(5 * num_paths, 5))
    if num_paths == 1:
        axes = [axes]
    
    for idx, ax in enumerate(axes):
        # Set up the grid
        ax.set_xlim(-0.5, grid_size - 0.5)
        ax.set_ylim(-0.5, grid_size - 0.5)
        ax.set_aspect('equal')
        
        # Draw grid
        for i in range(grid_size + 1):
            ax.axhline(i - 0.5, color='lightgray', linewidth=0.5)
            ax.axvline(i - 0.5, color='lightgray', linewidth=0.5)
        
        # Simulate a greedy path
        path = [(0, 0)]
        x, y = 0, 0
        max_steps = grid_size * grid_size
        
        for step in range(max_steps):
            state_key = f"{x},{y}"
            if state_key not in qtable or not qtable[state_key]:
                break
            
            # Get best action
            actions = qtable[state_key]
            best_action = max(actions.items(), key=lambda x: x[1])[0]
            
            # Move according to action
            if best_action == 'up':
                y = max(0, y - 1)
            elif best_action == 'down':
                y = min(grid_size - 1, y + 1)
            elif best_action == 'left':
                x = max(0, x - 1)
            elif best_action == 'right':
                x = min(grid_size - 1, x + 1)
            
            path.append((x, y))
            
            # Check if reached goal
            if x == grid_size - 1 and y == grid_size - 1:
                break
        
        # Plot the path
        path_x = [p[0] for p in path]
        path_y = [grid_size - 1 - p[1] for p in path]  # Invert y for plotting
        
        ax.plot(path_x, path_y, 'b-', linewidth=2, marker='o', markersize=6, alpha=0.7)
        
        # Mark start and goal
        ax.scatter(0, grid_size - 1, color='green', s=200, marker='s', zorder=5)
        ax.text(0, grid_size - 1, 'S', ha='center', va='center', fontsize=12, fontweight='bold')
        
        ax.scatter(grid_size - 1, 0, color='red', s=200, marker='*', zorder=5)
        ax.text(grid_size - 1, 0, 'G', ha='center', va='center', fontsize=12, fontweight='bold')
        
        ax.set_title(f'Path {idx + 1} (Length: {len(path)})', fontsize=12)
        ax.set_xlabel('X')
        ax.set_ylabel('Y')
        ax.set_xticks(range(grid_size))
        ax.set_yticks(range(grid_size))
        ax.set_yticklabels(range(grid_size - 1, -1, -1))
        ax.invert_yaxis()
    
    plt.suptitle(f'Sample Paths - GridWorld {grid_size}×{grid_size}', fontsize=16, fontweight='bold')
    plt.tight_layout()
    plt.savefig(output_path, dpi=150, bbox_inches='tight')
    plt.close()
    
    print(f"Sample paths saved to: {output_path}")


def main():
    if len(sys.argv) < 3:
        print("Usage: python visualize.py <history.json> <qtable.json> [output_prefix]")
        sys.exit(1)
    
    history_path = sys.argv[1]
    qtable_path = sys.argv[2]
    output_prefix = sys.argv[3] if len(sys.argv) > 3 else "gridworld"
    
    # Load data
    history, qtable_data = load_data(history_path, qtable_path)
    grid_size = qtable_data['gridSize']
    
    # Generate visualizations
    plot_training_history(history, f"{output_prefix}_training.png")
    plot_qtable_heatmap(qtable_data, grid_size, f"{output_prefix}_qvalues.png")
    plot_policy_grid(qtable_data, grid_size, f"{output_prefix}_policy.png")
    plot_sample_paths(qtable_data, grid_size, 3, f"{output_prefix}_paths.png")
    
    print("\nAll visualizations generated successfully!")


if __name__ == "__main__":
    main()