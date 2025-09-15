/**
 * Unit tests for gym-like environment contract
 */

import { GymEnv, ActionMask, StepResult, seedRandom } from '../../src/gym-env';

describe('Gym-like Environment Contract', () => {
  describe('ActionMask', () => {
    it('should create boolean array action mask', () => {
      const mask: ActionMask = {
        type: 'boolean',
        mask: [true, false, true, true],
      };

      expect(mask.mask).toHaveLength(4);
      expect(mask.mask[1]).toBe(false);
    });

    it('should create id array action mask', () => {
      const mask: ActionMask = {
        type: 'ids',
        validActionIds: [0, 2, 3],
      };

      expect(mask.validActionIds).toHaveLength(3);
      expect(mask.validActionIds).not.toContain(1);
    });
  });

  describe('Environment Interface', () => {
    // Simple test observation and info types
    interface TestObservation {
      state: string;
      value: number;
    }

    interface TestInfo {
      steps: number;
      done: boolean;
    }

    class TestEnv implements GymEnv<TestObservation, number, TestInfo> {
      private rng: () => number;

      constructor() {
        this.rng = seedRandom(0);
      }

      seed(s: number): void {
        // Initialize RNG with seed
        this.rng = seedRandom(s);
      }

      reset(): TestObservation {
        return {
          state: 'start',
          value: 0,
        };
      }

      step(_action: number): StepResult<TestObservation, TestInfo> {
        return {
          observation: {
            state: 'next',
            value: 1,
          },
          reward: -1,
          done: false,
          info: {
            steps: 1,
            done: false,
          },
        };
      }

      close(): void {
        // Cleanup
      }

      getActionMask(): ActionMask {
        return {
          type: 'boolean',
          mask: [true, true, false, true],
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

      expect(obs.state).toBe('start');
      expect(obs.value).toBe(0);
    });

    it('should return valid step response', () => {
      const env = new TestEnv();
      env.reset();
      const result = env.step(0);

      expect(result).toHaveProperty('observation');
      expect(result).toHaveProperty('reward');
      expect(result).toHaveProperty('done');
      expect(result).toHaveProperty('info');
      expect(result.observation.state).toBe('next');
      expect(result.info.steps).toBe(1);
    });
  });

  describe('Random Number Generator', () => {
    it('should produce deterministic results with same seed', () => {
      const rng1 = seedRandom(42);
      const rng2 = seedRandom(42);

      const values1 = Array.from({ length: 5 }, () => rng1());
      const values2 = Array.from({ length: 5 }, () => rng2());

      expect(values1).toEqual(values2);
    });

    it('should produce different results with different seeds', () => {
      const rng1 = seedRandom(42);
      const rng2 = seedRandom(43);

      const value1 = rng1();
      const value2 = rng2();

      expect(value1).not.toBe(value2);
    });
  });
});
