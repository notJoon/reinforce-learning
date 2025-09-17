/**
 * Gym-style Grid World Environment
 *
 * Implements the GymEnv interface for GridWorld with proper seed handling
 * for deterministic behavior in tests.
 */

import type { GymEnv, StepResult, ActionMask } from 'qlearn-lite';
import type { Observation, StepInfo } from 'rl-logger';

export interface GridWorldGymParams {
  /** Size of the grid (NxN) */
  size?: number;
  /** Goal reward */
  rewardGoal?: number;
  /** Step cost */
  stepCost?: number;
  /** Wall penalty */
  wallPenalty?: number;
}

/**
 * GridWorld implementing the GymEnv interface
 */
export class GridWorldGym implements GymEnv<Observation, number, StepInfo> {
  private size: number;
  private rewardGoal: number;
  private stepCost: number;
  private wallPenalty: number;
  private x: number = 0;
  private y: number = 0;
  private episodeSteps: number = 0;
  private totalSteps: number = 0;

  constructor(params: GridWorldGymParams = {}) {
    this.size = params.size ?? 5;
    this.rewardGoal = params.rewardGoal ?? 10;
    this.stepCost = params.stepCost ?? -0.1;
    this.wallPenalty = params.wallPenalty ?? -0.5;
  }

  seed(_s: number): void {
    // For this simple deterministic environment, seed doesn't affect behavior
    // But we reset state for consistency
    this.x = 0;
    this.y = 0;
    this.episodeSteps = 0;
    // Note: We don't reset totalSteps as it tracks across episodes
  }

  reset(): Observation {
    this.x = 0;
    this.y = 0;
    this.episodeSteps = 0;

    return {
      goalText: `Grid position: (${this.x}, ${this.y}), Goal: (${this.size - 1}, ${this.size - 1})`,
      meta: {
        goalDepth: 0,
        subgoalCount: 0,
      },
      hints: [`Distance to goal: ${this.manhattanDistance()}`],
    };
  }

  step(action: number): StepResult<Observation, StepInfo> {
    this.episodeSteps++;
    this.totalSteps++;

    // Map action number to movement
    // 0: up, 1: down, 2: left, 3: right
    let nextX = this.x;
    let nextY = this.y;

    switch (action) {
      case 0: // up
        nextY = Math.max(0, this.y - 1);
        break;
      case 1: // down
        nextY = Math.min(this.size - 1, this.y + 1);
        break;
      case 2: // left
        nextX = Math.max(0, this.x - 1);
        break;
      case 3: // right
        nextX = Math.min(this.size - 1, this.x + 1);
        break;
      default:
        throw new Error(`Invalid action: ${action}`);
    }

    // Check if hit wall
    const hitWall = nextX === this.x && nextY === this.y;

    // Update position
    this.x = nextX;
    this.y = nextY;

    // Check if reached goal
    const isGoal = this.x === this.size - 1 && this.y === this.size - 1;

    // Calculate reward
    let reward = this.stepCost;
    if (hitWall) {
      reward += this.wallPenalty;
    }
    if (isGoal) {
      reward += this.rewardGoal;
    }

    const observation: Observation = {
      goalText: `Grid position: (${this.x}, ${this.y}), Goal: (${this.size - 1}, ${this.size - 1})`,
      meta: {
        goalDepth: 0,
        subgoalCount: 0,
      },
      hints: [`Distance to goal: ${this.manhattanDistance()}`],
    };

    const info: StepInfo = {
      episodeSteps: this.episodeSteps,
      totalSteps: this.totalSteps,
      reason: isGoal ? 'success' : undefined,
    };

    return {
      observation,
      reward,
      done: isGoal,
      info,
    };
  }

  close(): void {
    // No cleanup needed
  }

  getActionMask(): ActionMask {
    // All actions are always valid (hitting walls just gives penalty)
    return {
      type: 'boolean',
      mask: [true, true, true, true], // up, down, left, right
    };
  }

  private manhattanDistance(): number {
    return Math.abs(this.x - (this.size - 1)) + Math.abs(this.y - (this.size - 1));
  }

  /**
   * Get current position (for testing)
   */
  getPosition(): { x: number; y: number } {
    return { x: this.x, y: this.y };
  }
}
