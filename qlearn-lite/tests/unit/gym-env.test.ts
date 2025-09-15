/**
 * Unit tests for gym-like environment contract
 */

import { GymEnv, Observation, ActionMask, Info, validateObservation, seedRandom } from '../../src/gym-env';

describe('Gym-like Environment Contract', () => {
  describe('Observation Schema', () => {
    it('should validate a valid observation', () => {
      const obs: Observation = {
        goalText: 'Prove that 2 + 2 = 4',
        meta: {
          goalDepth: 1,
          subgoalCount: 0
        }
      };
      
      expect(() => validateObservation(obs)).not.toThrow();
    });

    it('should validate observation with optional hints', () => {
      const obs: Observation = {
        goalText: 'Prove that 2 + 2 = 4',
        meta: {
          goalDepth: 1,
          subgoalCount: 0
        },
        hints: ['Use addition properties']
      };
      
      expect(() => validateObservation(obs)).not.toThrow();
    });

    it('should reject observation without goalText', () => {
      const obs = {
        meta: {
          goalDepth: 1,
          subgoalCount: 0
        }
      };
      
      expect(() => validateObservation(obs as any)).toThrow('goalText is required');
    });

    it('should reject observation without meta', () => {
      const obs = {
        goalText: 'Prove that 2 + 2 = 4'
      };
      
      expect(() => validateObservation(obs as any)).toThrow('meta is required');
    });
  });

  describe('ActionMask', () => {
    it('should create boolean array action mask', () => {
      const mask: ActionMask = {
        type: 'boolean',
        mask: [true, false, true, true]
      };
      
      expect(mask.mask).toHaveLength(4);
      expect(mask.mask[1]).toBe(false);
    });

    it('should create id array action mask', () => {
      const mask: ActionMask = {
        type: 'ids',
        validActionIds: [0, 2, 3]
      };
      
      expect(mask.validActionIds).toHaveLength(3);
      expect(mask.validActionIds).not.toContain(1);
    });
  });

  describe('Info Object', () => {
    it('should handle timeout info', () => {
      const info: Info = {
        reason: 'timeout',
        episodeSteps: 100,
        totalSteps: 1000
      };
      
      expect(info.reason).toBe('timeout');
    });

    it('should handle success info', () => {
      const info: Info = {
        reason: 'success',
        episodeSteps: 25,
        totalSteps: 250
      };
      
      expect(info.reason).toBe('success');
    });
  });

  describe('Environment Interface', () => {
    class TestEnv implements GymEnv<number> {
      private rng: () => number;
      
      constructor() {
        this.rng = seedRandom(0);
      }
      
      seed(s: number): void {
        // Initialize RNG with seed
        this.rng = seedRandom(s);
      }
      
      reset(): Observation {
        return {
          goalText: 'Test goal',
          meta: {
            goalDepth: 0,
            subgoalCount: 0
          }
        };
      }
      
      step(_action: number): {
        observation: Observation;
        reward: number;
        done: boolean;
        info: Info;
      } {
        return {
          observation: {
            goalText: 'Updated goal',
            meta: {
              goalDepth: 1,
              subgoalCount: 0
            }
          },
          reward: -1,
          done: false,
          info: {
            episodeSteps: 1,
            totalSteps: 1
          }
        };
      }
      
      close(): void {
        // Cleanup
      }
      
      getActionMask(): ActionMask {
        return {
          type: 'boolean',
          mask: [true, true, false, true]
        };
      }
    }

    it('should implement all required methods', () => {
      const env = new TestEnv();
      
      expect(typeof env.seed).toBe('function');
      expect(typeof env.reset).toBe('function');
      expect(typeof env.step).toBe('function');
      expect(typeof env.close).toBe('function');
      expect(typeof env.getActionMask).toBe('function');
    });

    it('should return valid observation on reset', () => {
      const env = new TestEnv();
      const obs = env.reset();
      
      expect(() => validateObservation(obs)).not.toThrow();
    });

    it('should return valid step response', () => {
      const env = new TestEnv();
      env.reset();
      const result = env.step(0);
      
      expect(result).toHaveProperty('observation');
      expect(result).toHaveProperty('reward');
      expect(result).toHaveProperty('done');
      expect(result).toHaveProperty('info');
      expect(() => validateObservation(result.observation)).not.toThrow();
    });
  });
});