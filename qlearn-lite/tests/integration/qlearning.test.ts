/**
 * Integration tests for Q-learning agent
 * Tests real-world scenarios and convergence properties
 */

import { QLeaningAgent } from '../../src/agent';
import { DiscreteEnv } from '../../src/types';
import { EpsilonGreedy, ExpEpsilon, LinearEpsilon } from '../../src/policy';

/**
 * Simple deterministic grid world for testing convergence
 * Agent starts at (0,0) and needs to reach goal at (2,2)
 */
class DeterministicGridWorld implements DiscreteEnv<[number, number], string> {
  private state: [number, number] = [0, 0];
  private readonly goal: [number, number] = [2, 2];
  private readonly gridSize = 3;

  reset(): [number, number] {
    this.state = [0, 0];
    return [...this.state];
  }

  actions(state: [number, number]): string[] {
    const [x, y] = state;
    if (x === this.goal[0] && y === this.goal[1]) {
      return []; // Terminal state
    }
    
    const acts: string[] = [];
    if (x > 0) acts.push('left');
    if (x < this.gridSize - 1) acts.push('right');
    if (y > 0) acts.push('up');
    if (y < this.gridSize - 1) acts.push('down');
    return acts;
  }

  step(state: [number, number], action: string): { nextState: [number, number]; reward: number; done: boolean } {
    const [x, y] = state;
    let newX = x, newY = y;
    
    switch (action) {
      case 'left': newX = x - 1; break;
      case 'right': newX = x + 1; break;
      case 'up': newY = y - 1; break;
      case 'down': newY = y + 1; break;
    }
    
    this.state = [newX, newY];
    const done = newX === this.goal[0] && newY === this.goal[1];
    const reward = done ? 10.0 : -1.0; // Reward for reaching goal, penalty for each step
    
    return {
      nextState: [...this.state],
      reward,
      done
    };
  }
}

/**
 * Stochastic environment with slippery actions
 * Tests robustness to uncertainty
 */
class StochasticGridWorld extends DeterministicGridWorld {
  constructor(private readonly slipProbability: number = 0.1) {
    super();
  }

  step(state: [number, number], action: string): { nextState: [number, number]; reward: number; done: boolean } {
    // With some probability, action fails and agent doesn't move
    if (Math.random() < this.slipProbability) {
      const done = state[0] === 2 && state[1] === 2;
      return {
        nextState: [...state],
        reward: done ? 10.0 : -1.0,
        done
      };
    }
    return super.step(state, action);
  }
}

describe('Q-Learning Integration Tests', () => {
  
  describe('Convergence in Deterministic Environment', () => {
    it('should find optimal policy in simple grid world', () => {
      const env = new DeterministicGridWorld();
      const policy = new EpsilonGreedy(new LinearEpsilon(1.0, 0.01, 0.001));
      const agent = new QLeaningAgent(
        env,
        policy,
        { alpha: 0.1, gamma: 0.9 }
      );

      // Train agent
      const episodeRewards: number[] = [];
      agent.train({
        episodes: 500,
        maxStepsPerEpisode: 50,
        onEpisodeEnd: (info) => {
          episodeRewards.push(info.totalReward);
        }
      });

      // Check that agent learned to reach goal efficiently
      const lastRewards = episodeRewards.slice(-50);
      const avgLastReward = lastRewards.reduce((a, b) => a + b, 0) / lastRewards.length;
      
      // Optimal path is 4 steps (right, right, down, down) with reward 10 - 4 = 6
      expect(avgLastReward).toBeGreaterThan(3.5); // Allow some exploration

      // Test greedy rollout
      const { path, totalReward } = agent.rollOut();
      expect(path.length).toBeLessThanOrEqual(5); // Should find near-optimal path
      expect(totalReward).toBeGreaterThan(5.0);
    });

    it('should improve performance over time', () => {
      const env = new DeterministicGridWorld();
      const policy = new EpsilonGreedy(new ExpEpsilon(1.0, 0.01, 0.01));
      const agent = new QLeaningAgent(
        env,
        policy,
        { alpha: 0.2, gamma: 0.95 }
      );

      const episodeSteps: number[] = [];
      agent.train({
        episodes: 300,
        maxStepsPerEpisode: 100,
        onEpisodeEnd: (info) => {
          episodeSteps.push(info.steps);
        }
      });

      // Average steps should decrease over time (agent learns shorter paths)
      const firstQuarter = episodeSteps.slice(0, 75);
      const lastQuarter = episodeSteps.slice(-75);
      
      const avgFirst = firstQuarter.reduce((a, b) => a + b, 0) / firstQuarter.length;
      const avgLast = lastQuarter.reduce((a, b) => a + b, 0) / lastQuarter.length;
      
      expect(avgLast).toBeLessThan(avgFirst);
      expect(avgLast).toBeLessThan(10); // Should find efficient path
    });
  });

  describe('Robustness in Stochastic Environment', () => {
    it('should handle stochastic transitions', () => {
      const env = new StochasticGridWorld(0.2); // 20% slip probability
      const policy = new EpsilonGreedy(new LinearEpsilon(1.0, 0.05, 0.002));
      const agent = new QLeaningAgent(
        env,
        policy,
        { alpha: 0.15, gamma: 0.9 }
      );

      const episodeRewards: number[] = [];
      agent.train({
        episodes: 1000,
        maxStepsPerEpisode: 100,
        onEpisodeEnd: (info) => {
          episodeRewards.push(info.totalReward);
        }
      });

      // Despite stochasticity, should still learn good policy
      const lastRewards = episodeRewards.slice(-100);
      const avgLastReward = lastRewards.reduce((a, b) => a + b, 0) / lastRewards.length;
      
      // Performance will be lower due to slipping, but should still be positive
      expect(avgLastReward).toBeGreaterThan(0);
    });
  });

  describe('Q-Table Learning Dynamics', () => {
    it('should update Q-values correctly during learning', () => {
      const env = new DeterministicGridWorld();
      const policy = new EpsilonGreedy(new LinearEpsilon(0.5, 0.1, 0.01));
      const agent = new QLeaningAgent(
        env,
        policy,
        { alpha: 0.5, gamma: 0.9 }
      );

      const qUpdates: { state: string; action: string; oldQ: number; newQ: number }[] = [];
      
      agent.train({
        episodes: 10,
        maxStepsPerEpisode: 50,
        onUpdate: (info) => {
          const state = info.state as [number, number];
          const action = info.action as string;
          qUpdates.push({
            state: `(${state[0]},${state[1]})`,
            action: action,
            oldQ: info.oldQ,
            newQ: info.newQ
          });
        }
      });

      // Check that Q-values are being updated
      expect(qUpdates.length).toBeGreaterThan(0);
      
      // Q-values should change during learning
      const hasChanges = qUpdates.some(u => Math.abs(u.newQ - u.oldQ) > 0.001);
      expect(hasChanges).toBe(true);

      // Terminal state Q-values should propagate backwards
      const goalAdjacentUpdates = qUpdates.filter(u => 
        (u.state === '(2,1)' || u.state === '(1,2)'));
      
      if (goalAdjacentUpdates.length > 0) {
        const lastGoalAdjacent = goalAdjacentUpdates[goalAdjacentUpdates.length - 1];
        expect(lastGoalAdjacent.newQ).toBeGreaterThan(0); // Should have positive value
      }
    });

    it('should differentiate between good and bad actions', () => {
      const env = new DeterministicGridWorld();
      const policy = new EpsilonGreedy(new LinearEpsilon(0.3, 0.01, 0.005));
      const agent = new QLeaningAgent(
        env,
        policy,
        { alpha: 0.3, gamma: 0.95 }
      );

      agent.train({
        episodes: 200,
        maxStepsPerEpisode: 50
      });

      // Check Q-values for starting position
      const startState: [number, number] = [0, 0];
      
      // Moving towards goal should have higher Q-values
      const qRight = agent.q.get(startState, 'right');
      const qDown = agent.q.get(startState, 'down');
      
      // At least one direction should be positive (moving towards goal)
      const maxQ = Math.max(qRight, qDown);
      expect(maxQ).toBeGreaterThan(0);
      
      // Check state near goal has high values
      const nearGoal: [number, number] = [2, 1];
      const qToGoal = agent.q.get(nearGoal, 'down');
      expect(qToGoal).toBeGreaterThan(5); // Should be close to goal reward
    });
  });

  describe('Different Learning Parameters', () => {
    it('should converge faster with higher learning rate in deterministic environment', () => {
      const env = new DeterministicGridWorld();
      
      // Agent with high learning rate
      const fastAgent = new QLeaningAgent(
        env,
        new EpsilonGreedy(new LinearEpsilon(0.5, 0.1, 0.01)),
        { alpha: 0.8, gamma: 0.9 }
      );
      
      // Agent with low learning rate
      const slowAgent = new QLeaningAgent(
        env,
        new EpsilonGreedy(new LinearEpsilon(0.5, 0.1, 0.01)),
        { alpha: 0.1, gamma: 0.9 }
      );

      const fastConvergence: number[] = [];
      const slowConvergence: number[] = [];

      fastAgent.train({
        episodes: 50,
        maxStepsPerEpisode: 50,
        onEpisodeEnd: (info) => fastConvergence.push(info.totalReward)
      });

      slowAgent.train({
        episodes: 50,
        maxStepsPerEpisode: 50,
        onEpisodeEnd: (info) => slowConvergence.push(info.totalReward)
      });

      // Fast agent should reach good performance earlier
      const fastFirst20 = fastConvergence.slice(10, 30).reduce((a, b) => a + b, 0) / 20;
      const slowFirst20 = slowConvergence.slice(10, 30).reduce((a, b) => a + b, 0) / 20;
      
      // Fast should converge at least as well or close to slow agent
      expect(fastFirst20).toBeGreaterThanOrEqual(slowFirst20 - 0.5);
    });

    it('should value future rewards with different discount factors', () => {
      const env = new DeterministicGridWorld();
      
      // Agent that values future rewards highly
      const futureAgent = new QLeaningAgent(
        env,
        new EpsilonGreedy(new LinearEpsilon(0.2, 0.01, 0.01)),
        { alpha: 0.5, gamma: 0.99 } // High discount factor
      );
      
      // Agent that values immediate rewards
      const immediateAgent = new QLeaningAgent(
        env,
        new EpsilonGreedy(new LinearEpsilon(0.2, 0.01, 0.01)),
        { alpha: 0.5, gamma: 0.5 } // Low discount factor
      );

      futureAgent.train({ episodes: 200, maxStepsPerEpisode: 50 });
      immediateAgent.train({ episodes: 200, maxStepsPerEpisode: 50 });

      // Future-oriented agent should have higher Q-values for early states
      const startState: [number, number] = [0, 0];
      const futureQ = futureAgent.q.maxOverActions(startState, ['right', 'down'])?.q || 0;
      const immediateQ = immediateAgent.q.maxOverActions(startState, ['right', 'down'])?.q || 0;
      
      expect(futureQ).toBeGreaterThan(immediateQ);
    });
  });
});