#!/usr/bin/env python3
"""
Visualize Knight's Tour path from JSON data
"""

import json
import sys
import matplotlib.pyplot as plt
import matplotlib.patches as patches

def visualize_knight_tour(json_path, output_path):
    # Load path data
    with open(json_path, 'r') as f:
        data = json.load(f)
    
    N = data['board_size']
    start = data['start']
    path = [(p['x'], p['y']) for p in data['path']]
    
    # Create figure and axis
    fig, ax = plt.subplots(figsize=(8, 8))
    
    # Draw chessboard
    for x in range(N):
        for y in range(N):
            # Alternate colors for chessboard pattern
            color = "#F0D9B5" if (x + y) % 2 == 0 else "#B58863"
            square = patches.Rectangle((x, y), 1, 1, 
                                      facecolor=color, 
                                      edgecolor="black", 
                                      linewidth=1)
            ax.add_patch(square)
    
    # Mark start position
    ax.text(start['x'] + 0.5, start['y'] + 0.5, "S", 
            ha="center", va="center", 
            fontsize=16, weight="bold", color="darkgreen")
    
    # Draw path with arrows
    for i in range(len(path) - 1):
        x0, y0 = path[i]
        x1, y1 = path[i + 1]
        
        # Draw arrow from current to next position
        ax.annotate("", xy=(x1 + 0.5, y1 + 0.5), 
                   xytext=(x0 + 0.5, y0 + 0.5),
                   arrowprops=dict(arrowstyle="->", 
                                 lw=2.5, 
                                 color="red",
                                 alpha=0.7))
        
        # Add step number at each position
        if i > 0:  # Skip start position (already has 'S')
            ax.text(x0 + 0.15, y0 + 0.85, str(i + 1), 
                   fontsize=10, color="white", 
                   bbox=dict(boxstyle="circle,pad=0.1", 
                           facecolor="red", alpha=0.7))
    
    # Mark end position
    if len(path) > 1:
        fx, fy = path[-1]
        ax.text(fx + 0.5, fy + 0.5, "E", 
               ha="center", va="center", 
               fontsize=16, weight="bold", color="darkred")
        
        # Add final step number
        ax.text(fx + 0.15, fy + 0.85, str(len(path)), 
               fontsize=10, color="white",
               bbox=dict(boxstyle="circle,pad=0.1", 
                       facecolor="red", alpha=0.7))
    
    # Set axis properties
    ax.set_xlim(0, N)
    ax.set_ylim(0, N)
    ax.set_xticks(range(N))
    ax.set_yticks(range(N))
    ax.set_aspect("equal")
    ax.grid(True, alpha=0.3)
    ax.invert_yaxis()  # Invert y-axis to match standard chess board orientation
    
    # Add title
    visited = data['visited_squares']
    total = data['total_squares']
    completion_pct = (visited / total) * 100
    
    title = f"Knight's Tour via Q-learning ({N}×{N} board)\n"
    title += f"Path length: {visited}/{total} ({completion_pct:.1f}% complete)"
    ax.set_title(title, fontsize=14, pad=20)
    
    # Add labels
    ax.set_xlabel("X coordinate", fontsize=12)
    ax.set_ylabel("Y coordinate", fontsize=12)
    
    # Save the figure
    plt.tight_layout()
    plt.savefig(output_path, dpi=150, bbox_inches='tight')
    print(f"Visualization saved successfully")
    
    # Also save a high-resolution version
    hq_path = output_path.replace('.png', '_hq.png')
    plt.savefig(hq_path, dpi=300, bbox_inches='tight')
    print(f"High-quality version saved to: {hq_path}")

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python visualize.py <json_path> <output_path>")
        sys.exit(1)
    
    json_path = sys.argv[1]
    output_path = sys.argv[2]
    
    try:
        visualize_knight_tour(json_path, output_path)
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)
