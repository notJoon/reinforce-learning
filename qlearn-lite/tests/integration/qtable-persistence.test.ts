/**
 * Integration tests for Q-table persistence and JSON export/import
 */

import { QTable } from '../../src/qtable';
import { QLeaningAgent } from '../../src/agent';
import { DiscreteEnv } from '../../src/types';
import { EpsilonGreedy, LinearEpsilon } from '../../src/policy';

/**
 * Minimal test environment
 */
class TestEnv implements DiscreteEnv<string, number> {
  reset() { return 'start'; }
  
  actions(state: string): number[] {
    return state === 'end' ? [] : [0, 1, 2];
  }
  
  step(state: string, action: number) {
    const nextState = action === 2 ? 'end' : `s${action}`;
    return {
      nextState,
      reward: action === 2 ? 10 : -1,
      done: nextState === 'end'
    };
  }
}

describe('Q-Table Persistence and JSON Export', () => {
  
  describe('Q-Table JSON Export/Import', () => {
    it('should export Q-table to JSON format', () => {
      const qtable = new QTable<string, number>(
        (s) => s,
        (a) => a.toString()
      );
      
      // Set some Q-values
      qtable.set('s1', 0, 5.0);
      qtable.set('s1', 1, 3.0);
      qtable.set('s2', 0, -2.0);
      qtable.set('s2', 1, 7.0);
      
      const json = qtable.toJSON();
      
      expect(json).toEqual({
        's1': { '0': 5.0, '1': 3.0 },
        's2': { '0': -2.0, '1': 7.0 }
      });
    });

    it('should handle empty Q-table export', () => {
      const qtable = new QTable<number, string>(
        (s) => s.toString(),
        (a) => a
      );
      
      const json = qtable.toJSON();
      expect(json).toEqual({});
    });

    it('should preserve Q-values after training and export', () => {
      const env = new TestEnv();
      const policy = new EpsilonGreedy(new LinearEpsilon(0.1, 0.01, 0.01));
      const agent = new QLeaningAgent(
        env,
        policy,
        { alpha: 0.5, gamma: 0.9 }
      );
      
      // Train the agent
      agent.train({
        episodes: 100,
        maxStepsPerEpisode: 10
      });
      
      // Export Q-table
      const json = agent.q.toJSON();
      
      // Should have learned Q-values
      expect(Object.keys(json).length).toBeGreaterThan(0);
      
      // Check that values are numbers
      Object.values(json).forEach(actions => {
        Object.values(actions as any).forEach(qValue => {
          expect(typeof qValue).toBe('number');
          expect(isNaN(qValue as number)).toBe(false);
        });
      });
      
      // Terminal action (2) from start should have high value
      if (json['start'] && json['start']['2']) {
        expect(json['start']['2']).toBeGreaterThan(5);
      }
    });

    it('should allow reconstruction of Q-table from JSON', () => {
      const originalTable = new QTable<string, string>(
        (s) => s,
        (a) => a
      );
      
      // Set values
      originalTable.set('state1', 'action1', 10);
      originalTable.set('state1', 'action2', 20);
      originalTable.set('state2', 'action1', -5);
      
      // Export
      const json = originalTable.toJSON();
      
      // Create new table and import
      const newTable = new QTable<string, string>(
        (s) => s,
        (a) => a
      );
      
      // Manually import (simulate loading from file)
      for (const [state, actions] of Object.entries(json)) {
        for (const [action, value] of Object.entries(actions)) {
          newTable.set(state, action, value);
        }
      }
      
      // Verify values match
      expect(newTable.get('state1', 'action1')).toBe(10);
      expect(newTable.get('state1', 'action2')).toBe(20);
      expect(newTable.get('state2', 'action1')).toBe(-5);
    });
  });

  describe('Q-Table State Management', () => {
    it('should track all visited states', () => {
      const qtable = new QTable<[number, number], string>(
        (s) => `(${s[0]},${s[1]})`,
        (a) => a
      );
      
      // Add values for different states
      qtable.set([0, 0], 'up', 1);
      qtable.set([0, 1], 'down', 2);
      qtable.set([1, 0], 'left', 3);
      qtable.set([1, 1], 'right', 4);
      
      const states = qtable.getStates();
      
      expect(states.size).toBe(4);
      expect(states.has('(0,0)')).toBe(true);
      expect(states.has('(0,1)')).toBe(true);
      expect(states.has('(1,0)')).toBe(true);
      expect(states.has('(1,1)')).toBe(true);
    });

    it('should get maximum Q-value for a state', () => {
      const qtable = new QTable<string, number>(
        (s) => s,
        (a) => a.toString()
      );
      
      qtable.set('state1', 0, 5);
      qtable.set('state1', 1, 10);
      qtable.set('state1', 2, 3);
      
      const maxQ = qtable.getStateMaxQ('state1');
      expect(maxQ).toBe(10);
      
      // Non-existent state should return 0
      const noStateMaxQ = qtable.getStateMaxQ('nonexistent');
      expect(noStateMaxQ).toBe(0);
    });

    it('should handle complex state encodings', () => {
      // Custom encoder for complex state
      type ComplexState = { x: number; y: number; hasKey: boolean };
      const stateEncoder = (s: ComplexState) => `${s.x},${s.y},${s.hasKey}`;
      
      const qtable = new QTable<ComplexState, string>(
        stateEncoder,
        (a) => a
      );
      
      const state1: ComplexState = { x: 1, y: 2, hasKey: false };
      const state2: ComplexState = { x: 1, y: 2, hasKey: true };
      
      qtable.set(state1, 'move', 5);
      qtable.set(state2, 'move', 10);
      
      // Same position but different key status should be different states
      expect(qtable.get(state1, 'move')).toBe(5);
      expect(qtable.get(state2, 'move')).toBe(10);
      
      const json = qtable.toJSON();
      expect(json['1,2,false']).toEqual({ 'move': 5 });
      expect(json['1,2,true']).toEqual({ 'move': 10 });
    });
  });

  describe('Q-Table Integration with Agent', () => {
    it('should maintain Q-table consistency during training', () => {
      const env = new TestEnv();
      const policy = new EpsilonGreedy(new LinearEpsilon(0.5, 0.1, 0.01));
      const agent = new QLeaningAgent(
        env,
        policy,
        { alpha: 0.3, gamma: 0.95 }
      );
      
      const qValueHistory: number[] = [];
      
      agent.train({
        episodes: 50,
        maxStepsPerEpisode: 20,
        onUpdate: (info) => {
          // Track Q-value changes
          qValueHistory.push(info.newQ);
        }
      });
      
      // Should have updates
      expect(qValueHistory.length).toBeGreaterThan(0);
      
      // Export and check structure
      const json = agent.q.toJSON();
      
      // Should have the start state
      expect(json['start']).toBeDefined();
      
      // All Q-values should be finite numbers
      let allFinite = true;
      for (const actions of Object.values(json)) {
        for (const q of Object.values(actions as any)) {
          if (!isFinite(q as number)) {
            allFinite = false;
          }
        }
      }
      expect(allFinite).toBe(true);
    });

    it('should support saving and loading trained models', () => {
      const env = new TestEnv();
      
      // Train first agent
      const agent1 = new QLeaningAgent(
        env,
        new EpsilonGreedy(new LinearEpsilon(0.3, 0.01, 0.01)),
        { alpha: 0.5, gamma: 0.9 }
      );
      
      agent1.train({
        episodes: 200,
        maxStepsPerEpisode: 10
      });
      
      // Export trained Q-table
      const trainedQTable = agent1.q.toJSON();
      
      // Create new agent and load Q-table
      const agent2 = new QLeaningAgent(
        env,
        new EpsilonGreedy(new LinearEpsilon(0.0, 0.0, 0.0)), // No exploration
        { alpha: 0.5, gamma: 0.9 }
      );
      
      // Load Q-values
      for (const [state, actions] of Object.entries(trainedQTable)) {
        for (const [action, value] of Object.entries(actions)) {
          agent2.q.set(state, parseInt(action), value);
        }
      }
      
      // Both agents should perform similarly on rollout
      const rollout1 = agent1.rollOut();
      const rollout2 = agent2.rollOut();
      
      // Should achieve similar rewards
      expect(Math.abs(rollout1.totalReward - rollout2.totalReward)).toBeLessThan(2);
    });
  });
});