/**
 * Grid World Environment
 *
 * A simple deterministic grid world environment for testing and demonstration.
 * The agent starts at (0,0) and needs to reach the goal at (N-1, N-1).
 */

import type { DiscreteEnv } from 'qlearn-lite';

export interface GridPos {
  x: number;
  y: number;
}

export type GridAction = 'up' | 'down' | 'left' | 'right';

export interface GridWorldParams {
  /** Size of the grid (NxN) */
  size?: number;
  /** Starting position */
  start?: GridPos;
  /** Goal position (defaults to bottom-right) */
  goal?: GridPos;
  /** Reward for reaching the goal */
  rewardGoal?: number;
  /** Step cost (negative reward) */
  stepCost?: number;
  /** Penalty for hitting walls */
  wallPenalty?: number;
  /** Enable potential-based reward shaping */
  enablePotentialShaping?: boolean;
}

/**
 * Create a Grid World environment
 */
export function createGridWorld(params: GridWorldParams = {}): DiscreteEnv<GridPos, GridAction> {
  const size = params.size ?? 5;
  const start: GridPos = params.start ?? { x: 0, y: 0 };
  const goal: GridPos = params.goal ?? { x: size - 1, y: size - 1 };
  const rewardGoal = params.rewardGoal ?? 10;
  const stepCost = params.stepCost ?? -0.1;
  const wallPenalty = params.wallPenalty ?? -0.5;
  const usePotential = params.enablePotentialShaping ?? false;

  // Current position
  let current: GridPos = { ...start };

  function inBounds(p: GridPos): boolean {
    return p.x >= 0 && p.x < size && p.y >= 0 && p.y < size;
  }

  function isGoal(p: GridPos): boolean {
    return p.x === goal.x && p.y === goal.y;
  }

  function manhattanDistance(p1: GridPos, p2: GridPos): number {
    return Math.abs(p1.x - p2.x) + Math.abs(p1.y - p2.y);
  }

  return {
    reset(): GridPos {
      current = { ...start };
      return current;
    },

    actions(_state: GridPos): GridAction[] {
      // All actions are always available (hitting walls gives penalty)
      return ['up', 'down', 'left', 'right'];
    },

    step(
      state: GridPos,
      action: GridAction,
    ): { nextState: GridPos; reward: number; done: boolean } {
      // Calculate next position
      let next: GridPos = { ...state };

      switch (action) {
        case 'up':
          next.y -= 1;
          break;
        case 'down':
          next.y += 1;
          break;
        case 'left':
          next.x -= 1;
          break;
        case 'right':
          next.x += 1;
          break;
      }

      // Check if hit wall
      const hitWall = !inBounds(next);
      if (hitWall) {
        next = { ...state }; // Stay in same position
      }

      // Calculate reward
      let reward = stepCost;

      if (hitWall) {
        reward += wallPenalty;
      }

      if (isGoal(next)) {
        reward += rewardGoal;
      }

      // Update current position
      current = next;

      return {
        nextState: next,
        reward,
        done: isGoal(next),
      };
    },

    potential(state: GridPos): number {
      if (!usePotential) return 0;
      // Negative Manhattan distance as potential (closer to goal = higher potential)
      return -manhattanDistance(state, goal);
    },
  };
}

/**
 * String encoder for GridPos (for Q-table keys)
 */
export function encodeGridPos(pos: GridPos): string {
  return `${pos.x},${pos.y}`;
}

/**
 * Decode string back to GridPos
 */
export function decodeGridPos(s: string): GridPos {
  const [x, y] = s.split(',').map(Number);
  return { x, y };
}
