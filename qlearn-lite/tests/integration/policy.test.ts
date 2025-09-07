/**
 * Integration tests for policy exploration/exploitation behavior
 */

import { EpsilonGreedy, LinearEpsilon, ExpEpsilon } from '../../src/policy';
import { Policy } from '../../src/types';

describe('Policy Exploration/Exploitation Tests', () => {
  
  describe('Epsilon-Greedy Policy', () => {
    it('should explore more in early episodes', () => {
      const schedule = new LinearEpsilon(1.0, 0.1, 0.01);
      const policy = new EpsilonGreedy<number, string>(schedule, () => Math.random());
      
      const mockQ = (s: number, a: string) => {
        // Action 'best' always has highest Q-value
        return a === 'best' ? 10 : 0;
      };
      
      // Early episodes - high exploration
      policy.currentEpisode = 0;
      const earlyChoices: string[] = [];
      for (let i = 0; i < 1000; i++) {
        const action = policy.select(0, ['best', 'bad1', 'bad2'], mockQ);
        if (action) earlyChoices.push(action);
      }
      
      const earlyBestRatio = earlyChoices.filter(a => a === 'best').length / earlyChoices.length;
      
      // Later episodes - mostly exploitation
      policy.currentEpisode = 100;
      const lateChoices: string[] = [];
      for (let i = 0; i < 1000; i++) {
        const action = policy.select(0, ['best', 'bad1', 'bad2'], mockQ);
        if (action) lateChoices.push(action);
      }
      
      const lateBestRatio = lateChoices.filter(a => a === 'best').length / lateChoices.length;
      
      // Should exploit more in later episodes
      expect(lateBestRatio).toBeGreaterThan(earlyBestRatio);
      expect(lateBestRatio).toBeGreaterThan(0.8); // Should mostly choose best action
      expect(earlyBestRatio).toBeLessThan(0.5); // Should explore significantly
    });

    it('should handle terminal states correctly', () => {
      const policy = new EpsilonGreedy<number, string>(new LinearEpsilon(0.5, 0.1, 0.01));
      
      // Empty action list (terminal state)
      const action = policy.select(0, [], (s, a) => 0);
      expect(action).toBeUndefined();
    });

    it('should respect different epsilon schedules', () => {
      const linearSchedule = new LinearEpsilon(1.0, 0.0, 0.01);
      const expSchedule = new ExpEpsilon(1.0, 0.0, 0.1);
      
      // Compare epsilon decay
      const episodes = [0, 10, 20, 50, 100];
      const linearEpsilons = episodes.map(e => linearSchedule.epsilon(e));
      const expEpsilons = episodes.map(e => expSchedule.epsilon(e));
      
      // Both should decay
      expect(linearEpsilons[0]).toBeGreaterThan(linearEpsilons[4]);
      expect(expEpsilons[0]).toBeGreaterThan(expEpsilons[4]);
      
      // Exponential should decay faster initially
      expect(expEpsilons[1]).toBeLessThan(linearEpsilons[1]);
    });

    it('should break ties consistently when exploiting', () => {
      const policy = new EpsilonGreedy<number, string>(
        new LinearEpsilon(0.0, 0.0, 0.0), // No exploration
        () => 0.5 // Fixed random for testing
      );
      
      const mockQ = (s: number, a: string) => {
        // All actions have same Q-value
        return 5;
      };
      
      // Should consistently pick first action when all Q-values are equal
      const actions = ['a', 'b', 'c'];
      const choices: string[] = [];
      
      for (let i = 0; i < 10; i++) {
        const action = policy.select(0, actions, mockQ);
        if (action) choices.push(action);
      }
      
      // Should always pick the same (first) action due to stable tie-breaking
      expect(choices.every(a => a === choices[0])).toBe(true);
    });
  });

  describe('Exploration vs Exploitation Balance', () => {
    it('should balance exploration and exploitation appropriately', () => {
      // Create a mock scenario where exploration matters
      const schedule = new LinearEpsilon(0.3, 0.05, 0.005);
      const policy = new EpsilonGreedy<number, string>(schedule);
      
      let bestActionCount = 0;
      let otherActionCount = 0;
      
      const mockQ = (s: number, a: string) => {
        return a === 'optimal' ? 100 : a === 'good' ? 50 : 0;
      };
      
      // Run many selections at different episodes
      for (let episode = 0; episode < 50; episode++) {
        policy.currentEpisode = episode;
        
        for (let i = 0; i < 20; i++) {
          const action = policy.select(
            0, 
            ['optimal', 'good', 'bad1', 'bad2'], 
            mockQ
          );
          
          if (action === 'optimal') {
            bestActionCount++;
          } else if (action) {
            otherActionCount++;
          }
        }
      }
      
      // Should have both exploration and exploitation
      expect(bestActionCount).toBeGreaterThan(0);
      expect(otherActionCount).toBeGreaterThan(0);
      
      // But should favor the best action overall
      expect(bestActionCount).toBeGreaterThan(otherActionCount);
    });

    it('should explore uniformly when epsilon is 1', () => {
      const policy = new EpsilonGreedy<number, string>(
        new LinearEpsilon(1.0, 1.0, 0.0) // Always explore
      );
      
      const actionCounts: { [key: string]: number } = {
        'a': 0, 'b': 0, 'c': 0, 'd': 0
      };
      
      const mockQ = (s: number, a: string) => 0; // Q-values don't matter
      
      // Many samples to check uniform distribution
      for (let i = 0; i < 4000; i++) {
        const action = policy.select(0, ['a', 'b', 'c', 'd'], mockQ);
        if (action) actionCounts[action]++;
      }
      
      // Each action should be selected roughly 25% of the time
      Object.values(actionCounts).forEach(count => {
        expect(count).toBeGreaterThan(800);  // At least 20%
        expect(count).toBeLessThan(1200);    // At most 30%
      });
    });
  });
});