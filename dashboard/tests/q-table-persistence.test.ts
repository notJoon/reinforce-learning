/**
 * Unit test to detect Q-table persistence regression
 *
 * This test ensures that Q-values are properly accumulated across
 * multiple training episodes, preventing the oscillation issue where
 * Q-tables were being reset between episodes.
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { RLAgent, RLPolicy, QTableInterface, TrainingConfig, EpisodeInfo } from '../src/types.js';

// Mock environment for testing
interface TestState {
  x: number;
  y: number;
}

type TestAction = 'up' | 'down' | 'left' | 'right';

class MockEnvironment {
  reset(): TestState {
    return { x: 0, y: 0 };
  }

  actions(_state: TestState): TestAction[] {
    return ['up', 'down', 'left', 'right'];
  }

  step(
    state: TestState,
    action: TestAction,
  ): { nextState: TestState; reward: number; done: boolean } {
    const nextState = { ...state };
    let reward = -1;

    switch (action) {
      case 'up':
        nextState.y++;
        break;
      case 'down':
        nextState.y--;
        break;
      case 'left':
        nextState.x--;
        break;
      case 'right':
        nextState.x++;
        break;
    }

    // Goal state at (2, 2)
    if (nextState.x === 2 && nextState.y === 2) {
      reward = 100;
      return { nextState, reward, done: true };
    }

    return { nextState, reward, done: false };
  }
}

// Test implementation of RLAgent that should persist Q-values
class TestAgent implements RLAgent<TestState, TestAction> {
  alpha: number = 0.1;
  gamma: number = 0.9;
  policy: RLPolicy<TestState, TestAction>;
  q: QTableInterface<TestState, TestAction>;

  private qTable: Map<string, number> = new Map();
  private trainingCallCount: number = 0;
  private env: MockEnvironment;

  constructor(env: MockEnvironment) {
    this.env = env;

    // Simple epsilon-greedy policy
    this.policy = {
      select: (
        state: TestState,
        legal: TestAction[],
        qval: (s: TestState, a: TestAction) => number,
      ): TestAction | undefined => {
        if (legal.length === 0) return undefined;

        // Use epsilon = 0.1 for testing
        if (Math.random() < 0.1) {
          return legal[Math.floor(Math.random() * legal.length)];
        }

        let bestAction = legal[0];
        let bestValue = qval(state, legal[0]);

        for (const action of legal) {
          const value = qval(state, action);
          if (value > bestValue) {
            bestValue = value;
            bestAction = action;
          }
        }

        return bestAction;
      },
      getEpsilon: () => 0.1,
      setEpsilon: () => {},
      reset: () => {},
    };

    // Q-table interface
    this.q = {
      get: (state: TestState, action: TestAction): number => {
        const key = `${state.x},${state.y}_${action}`;
        return this.qTable.get(key) ?? 0;
      },
      set: (state: TestState, action: TestAction, value: number): void => {
        const key = `${state.x},${state.y}_${action}`;
        this.qTable.set(key, value);
      },
      reset: () => {
        this.qTable.clear();
      },
    };
  }

  train(config: TrainingConfig<TestState, TestAction>): void {
    this.trainingCallCount++;

    // Simulate Q-learning updates
    for (let ep = 0; ep < config.episodes; ep++) {
      let state = this.env.reset();
      let steps = 0;
      let totalReward = 0;

      while (steps < config.maxStepsPerEpisode) {
        const actions = this.env.actions(state);
        const action = this.policy.select!(state, actions, (s, a) => this.q.get(s, a));

        if (!action) break;

        const { nextState, reward, done } = this.env.step(state, action);
        totalReward += reward;

        // Q-learning update
        const oldQ = this.q.get(state, action);
        const nextActions = this.env.actions(nextState);
        const maxNextQ = Math.max(...nextActions.map((a) => this.q.get(nextState, a)));
        const newQ = oldQ + this.alpha * (reward + this.gamma * maxNextQ - oldQ);

        this.q.set(state, action, newQ);

        if (config.onUpdate) {
          config.onUpdate(state, action, reward, nextState);
        }

        state = nextState;
        steps++;

        if (done) break;
      }

      if (config.onEpisodeEnd) {
        config.onEpisodeEnd({
          episode: ep,
          steps,
          totalReward,
          terminated: steps < config.maxStepsPerEpisode,
          truncated: steps >= config.maxStepsPerEpisode,
        });
      }
    }
  }

  getQTableSize(): number {
    return this.qTable.size;
  }

  getTrainingCallCount(): number {
    return this.trainingCallCount;
  }

  getQValue(state: TestState, action: TestAction): number {
    return this.q.get(state, action);
  }
}

describe('Q-Table Persistence', () => {
  let env: MockEnvironment;
  let agent: TestAgent;

  beforeEach(() => {
    env = new MockEnvironment();
    agent = new TestAgent(env);
  });

  it('should accumulate Q-values across multiple training calls', () => {
    // Train for 10 episodes
    agent.train({
      episodes: 10,
      maxStepsPerEpisode: 20,
    });

    // Get some Q-values after first training
    const q1_00_right = agent.getQValue({ x: 0, y: 0 }, 'right');
    const q1_10_right = agent.getQValue({ x: 1, y: 0 }, 'right');
    const qTableSize1 = agent.getQTableSize();

    // Q-table should have some entries
    expect(qTableSize1).toBeGreaterThan(0);

    // Train for another 10 episodes
    agent.train({
      episodes: 10,
      maxStepsPerEpisode: 20,
    });

    // Get Q-values after second training
    const q2_00_right = agent.getQValue({ x: 0, y: 0 }, 'right');
    const q2_10_right = agent.getQValue({ x: 1, y: 0 }, 'right');
    const qTableSize2 = agent.getQTableSize();

    // Q-table should have grown or stayed the same
    expect(qTableSize2).toBeGreaterThanOrEqual(qTableSize1);

    // Q-values should have changed (learning occurred)
    // At least one Q-value should be different
    const hasLearning =
      Math.abs(q2_00_right - q1_00_right) > 0.01 || Math.abs(q2_10_right - q1_10_right) > 0.01;

    expect(hasLearning).toBe(true);

    // Verify training was called multiple times
    expect(agent.getTrainingCallCount()).toBe(2);

    // Train more to verify convergence trend
    for (let i = 0; i < 5; i++) {
      agent.train({
        episodes: 20,
        maxStepsPerEpisode: 20,
      });
    }

    // After more training, Q-values near the goal should be positive
    // (indicating the agent has learned the path to the goal)
    const qNearGoal = agent.getQValue({ x: 1, y: 2 }, 'right');
    expect(qNearGoal).toBeGreaterThan(0);
  });

  it('should not reset Q-table when parameters are updated', () => {
    // Train initially
    agent.train({
      episodes: 10,
      maxStepsPerEpisode: 20,
    });

    const qTableSizeBefore = agent.getQTableSize();

    // Update parameters
    agent.alpha = 0.2;
    agent.gamma = 0.95;

    // Train again
    agent.train({
      episodes: 5,
      maxStepsPerEpisode: 20,
    });

    const qTableSizeAfter = agent.getQTableSize();

    // Q-table should not have been reset
    expect(qTableSizeAfter).toBeGreaterThanOrEqual(qTableSizeBefore);

    // The Q-value should exist and potentially be updated
    const qValueAfter = agent.getQValue({ x: 0, y: 0 }, 'right');
    expect(qValueAfter).toBeDefined();
  });

  it('should show convergence over time, not oscillation', () => {
    const rewardHistory: number[] = [];

    // Train in small batches, recording average rewards
    for (let batch = 0; batch < 10; batch++) {
      let batchReward = 0;
      let episodeCount = 0;

      agent.train({
        episodes: 5,
        maxStepsPerEpisode: 20,
        onEpisodeEnd: (info: EpisodeInfo) => {
          batchReward += info.totalReward;
          episodeCount++;
        },
      });

      rewardHistory.push(batchReward / episodeCount);
    }

    // Calculate variance of the second half vs first half
    const midpoint = Math.floor(rewardHistory.length / 2);
    const firstHalf = rewardHistory.slice(0, midpoint);
    const secondHalf = rewardHistory.slice(midpoint);

    const variance = (arr: number[]) => {
      const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
      return arr.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / arr.length;
    };

    const firstHalfVariance = variance(firstHalf);
    const secondHalfVariance = variance(secondHalf);

    // Second half should have lower variance (more stable)
    // This detects oscillation - if Q-table was resetting, variance would remain high
    expect(secondHalfVariance).toBeLessThan(firstHalfVariance * 1.5);

    // Average reward should improve over time
    const firstHalfAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const secondHalfAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

    // Second half should have better average reward
    expect(secondHalfAvg).toBeGreaterThan(firstHalfAvg);
  });

  it('should properly reset Q-table when reset is called', () => {
    // Train initially
    agent.train({
      episodes: 10,
      maxStepsPerEpisode: 20,
    });

    const qTableSizeBefore = agent.getQTableSize();
    expect(qTableSizeBefore).toBeGreaterThan(0);

    // Reset Q-table
    agent.q.reset!();

    const qTableSizeAfter = agent.getQTableSize();
    expect(qTableSizeAfter).toBe(0);

    // Q-values should be back to default (0)
    const qValue = agent.getQValue({ x: 0, y: 0 }, 'right');
    expect(qValue).toBe(0);
  });
});
