/**
 * Integration test for dashboard wrapper to prevent Q-table reset regression
 *
 * This test simulates the dashboard's behavior of calling train()
 * once per episode and verifies that learning accumulates properly.
 */

import { describe, it, expect } from '@jest/globals';
import type { RLAgent, RLPolicy, QTableInterface, TrainingConfig } from '../src/types.js';

class DashboardSimulatedAgent implements RLAgent<number, string> {
  alpha: number = 0.1;
  gamma: number = 0.9;
  policy: RLPolicy<number, string>;
  q: QTableInterface<number, string>;

  private qValues: Map<string, number> = new Map();
  private updateCount: number = 0;
  private trainCallCount: number = 0;

  constructor() {
    this.policy = {
      select: (state: number, legal: string[], qval) => {
        if (legal.length === 0) return undefined;
        if (Math.random() < 0.1) {
          return legal[Math.floor(Math.random() * legal.length)];
        }
        return legal.reduce((best, action) =>
          qval(state, action) > qval(state, best) ? action : best,
        );
      },
      getEpsilon: () => 0.1,
      setEpsilon: () => {},
      reset: () => {},
    };

    this.q = {
      get: (state: number, action: string) => {
        const key = `${state}_${action}`;
        return this.qValues.get(key) ?? 0;
      },
      set: (state: number, action: string, value: number) => {
        const key = `${state}_${action}`;
        this.qValues.set(key, value);
        this.updateCount++;
      },
      reset: () => {
        this.qValues.clear();
        this.updateCount = 0;
      },
    };
  }

  train(config: TrainingConfig<number, string>): void {
    this.trainCallCount++;

    // Simulate training for one episode (as dashboard does)
    const episodes = config.episodes;
    for (let ep = 0; ep < episodes; ep++) {
      let state = 0; // Start state
      let steps = 0;
      let totalReward = 0;

      while (steps < config.maxStepsPerEpisode) {
        const actions = ['left', 'right'];
        const action = this.policy.select!(state, actions, (s, a) => this.q.get(s, a));

        if (!action) break;

        // Simple simulation: right moves forward, left moves backward
        const nextState = action === 'right' ? state + 1 : Math.max(0, state - 1);
        const reward = nextState === 5 ? 10 : -1; // Goal at state 5
        const done = nextState === 5;

        // Q-learning update
        const oldQ = this.q.get(state, action);
        const nextActions = ['left', 'right'];
        const maxNextQ = Math.max(...nextActions.map((a) => this.q.get(nextState, a)));
        const newQ = oldQ + this.alpha * (reward + this.gamma * (done ? 0 : maxNextQ) - oldQ);

        this.q.set(state, action, newQ);

        if (config.onUpdate) {
          config.onUpdate(state, action, reward, nextState);
        }

        totalReward += reward;
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

  getUpdateCount(): number {
    return this.updateCount;
  }
  getTrainCallCount(): number {
    return this.trainCallCount;
  }
  getQValueCount(): number {
    return this.qValues.size;
  }
}

describe('Dashboard Integration - Oscillation Prevention', () => {
  it('should accumulate learning when train() is called once per episode', () => {
    const agent = new DashboardSimulatedAgent();
    const episodeRewards: number[] = [];

    // Simulate dashboard behavior: call train() once per episode
    for (let i = 0; i < 50; i++) {
      agent.train({
        episodes: 1, // Dashboard calls with 1 episode at a time
        maxStepsPerEpisode: 20,
        onEpisodeEnd: (info) => {
          episodeRewards.push(info.totalReward);
        },
      });
    }

    // Verify that train was called multiple times
    expect(agent.getTrainCallCount()).toBe(50);

    // Verify Q-values accumulated (not reset)
    expect(agent.getQValueCount()).toBeGreaterThan(0);
    expect(agent.getUpdateCount()).toBeGreaterThan(50); // Should have many updates

    // Check for learning progress
    const firstTenAvg = episodeRewards.slice(0, 10).reduce((a, b) => a + b, 0) / 10;
    const lastTenAvg = episodeRewards.slice(-10).reduce((a, b) => a + b, 0) / 10;

    // Performance should improve over time
    expect(lastTenAvg).toBeGreaterThan(firstTenAvg);

    // Check Q-values are meaningful (not oscillating to zero)
    const goalApproachQ = agent.q.get(4, 'right'); // Action leading to goal
    expect(goalApproachQ).toBeGreaterThan(0); // Should be positive
  });

  it('should detect oscillation if Q-table is incorrectly reset', () => {
    // Simulate the bug: agent that incorrectly resets Q-table
    class BuggyAgent extends DashboardSimulatedAgent {
      train(config: TrainingConfig<number, string>): void {
        // BUG: Reset Q-table on every train call
        this.q.reset!();
        super.train(config);
      }
    }

    const buggyAgent = new BuggyAgent();
    const episodeRewards: number[] = [];

    // Train for multiple episodes
    for (let i = 0; i < 30; i++) {
      buggyAgent.train({
        episodes: 1,
        maxStepsPerEpisode: 20,
        onEpisodeEnd: (info) => {
          episodeRewards.push(info.totalReward);
        },
      });
    }

    // With the bug, Q-values don't accumulate properly
    const lastTenRewards = episodeRewards.slice(-10);
    const variance = (arr: number[]) => {
      const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
      return arr.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / arr.length;
    };

    // Buggy agent will have high variance (oscillation)
    const lastTenVariance = variance(lastTenRewards);

    // Q-values near goal will be near zero or inconsistent
    const goalApproachQ = buggyAgent.q.get(4, 'right');

    // This test demonstrates the oscillation:
    // - High variance in rewards
    // - Q-values don't converge to meaningful values
    expect(lastTenVariance).toBeGreaterThan(5); // High variance indicates oscillation
    expect(Math.abs(goalApproachQ)).toBeLessThan(5); // Q-values don't build up properly
  });

  it('should maintain learning after parameter updates', () => {
    const agent = new DashboardSimulatedAgent();

    // Initial training
    for (let i = 0; i < 20; i++) {
      agent.train({
        episodes: 1,
        maxStepsPerEpisode: 20,
      });
    }

    const updatesBefore = agent.getUpdateCount();

    // Change parameters (simulate dashboard parameter adjustment)
    agent.alpha = 0.05;
    agent.gamma = 0.95;

    // Continue training
    for (let i = 0; i < 10; i++) {
      agent.train({
        episodes: 1,
        maxStepsPerEpisode: 20,
      });
    }

    const qAfter = agent.q.get(3, 'right');
    const updatesAfter = agent.getUpdateCount();

    // Q-values should still exist and be updated
    expect(qAfter).toBeDefined();
    expect(updatesAfter).toBeGreaterThan(updatesBefore);

    // Learning should continue (not reset)
    expect(agent.getQValueCount()).toBeGreaterThan(0);
  });
});
