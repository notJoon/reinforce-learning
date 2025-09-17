/**
 * Unit tests for JSONL trajectory logger
 */

import {
  JSONLLogger,
  TrajectoryEntry,
  RunMetadata,
  validateTrajectoryEntry,
  validateRunMetadata,
} from '../src';
import * as fs from 'fs';
import * as path from 'path';

describe('JSONL Logger', () => {
  const testLogPath = path.join(__dirname, 'test-trajectory.jsonl');

  afterEach(() => {
    // Clean up test files
    if (fs.existsSync(testLogPath)) {
      fs.unlinkSync(testLogPath);
    }
  });

  describe('Schema Validation', () => {
    describe('TrajectoryEntry', () => {
      it('should validate a valid trajectory entry', () => {
        const entry: TrajectoryEntry<string> = {
          timestamp: Date.now(),
          episode: 1,
          step: 0,
          state: {
            goalText: 'Prove theorem',
            meta: { goalDepth: 0, subgoalCount: 0 },
          },
          action: 'intro x',
          reward: -0.1,
          nextState: {
            goalText: 'Updated goal',
            meta: { goalDepth: 1, subgoalCount: 0 },
          },
          done: false,
          info: {
            episodeSteps: 1,
            totalSteps: 1,
          },
        };

        expect(() => validateTrajectoryEntry(entry)).not.toThrow();
      });

      it('should reject entry without required fields', () => {
        const invalidEntry = {
          timestamp: Date.now(),
          episode: 1,
          // Missing required fields
        };

        expect(() => validateTrajectoryEntry(invalidEntry as any)).toThrow();
      });

      it('should reject entry with invalid observation', () => {
        const entry = {
          timestamp: Date.now(),
          episode: 1,
          step: 0,
          state: { invalid: 'state' }, // Invalid observation
          action: 'intro x',
          reward: -0.1,
          nextState: {
            goalText: 'Updated goal',
            meta: { goalDepth: 1, subgoalCount: 0 },
          },
          done: false,
          info: { episodeSteps: 1, totalSteps: 1 },
        };

        expect(() => validateTrajectoryEntry(entry as any)).toThrow();
      });
    });

    describe('RunMetadata', () => {
      it('should validate valid run metadata', () => {
        const metadata: RunMetadata = {
          engine: 'qlearn-lite',
          dataset: 'test-dataset',
          envVersion: '1.0.0',
          algoVersion: '1.0.0',
          seed: 42,
          timestamp: Date.now(),
        };

        expect(() => validateRunMetadata(metadata)).not.toThrow();
      });

      it('should reject metadata without required fields', () => {
        const invalidMetadata = {
          engine: 'qlearn-lite',
          // Missing required fields
        };

        expect(() => validateRunMetadata(invalidMetadata as any)).toThrow();
      });
    });
  });

  describe('Logger Operations', () => {
    it('should create logger and write metadata', async () => {
      const logger = new JSONLLogger<string>(testLogPath);
      const metadata: RunMetadata = {
        engine: 'qlearn-lite',
        dataset: 'test-dataset',
        envVersion: '1.0.0',
        algoVersion: '1.0.0',
        seed: 42,
        timestamp: Date.now(),
      };

      logger.writeMetadata(metadata);
      await logger.close();

      const content = fs.readFileSync(testLogPath, 'utf-8');
      const lines = content.trim().split('\n');

      expect(lines.length).toBe(1);

      const parsed = JSON.parse(lines[0]);
      expect(parsed.type).toBe('metadata');
      expect(parsed.data.engine).toBe('qlearn-lite');
    });

    it('should write trajectory entries', async () => {
      const logger = new JSONLLogger<string>(testLogPath);

      const entry: TrajectoryEntry<string> = {
        timestamp: Date.now(),
        episode: 1,
        step: 0,
        state: {
          goalText: 'Prove theorem',
          meta: { goalDepth: 0, subgoalCount: 0 },
        },
        action: 'intro x',
        reward: -0.1,
        nextState: {
          goalText: 'Updated goal',
          meta: { goalDepth: 1, subgoalCount: 0 },
        },
        done: false,
        info: {
          episodeSteps: 1,
          totalSteps: 1,
        },
      };

      logger.writeEntry(entry);
      await logger.close();

      const content = fs.readFileSync(testLogPath, 'utf-8');
      const lines = content.trim().split('\n');

      expect(lines.length).toBe(1);

      const parsed = JSON.parse(lines[0]);
      expect(parsed.type).toBe('trajectory');
      expect(parsed.data.action).toBe('intro x');
    });

    it('should write multiple entries in order', async () => {
      const logger = new JSONLLogger<string>(testLogPath);

      for (let i = 0; i < 3; i++) {
        const entry: TrajectoryEntry<string> = {
          timestamp: Date.now(),
          episode: 1,
          step: i,
          state: {
            goalText: `State ${i}`,
            meta: { goalDepth: i, subgoalCount: 0 },
          },
          action: `action${i}`,
          reward: -0.1,
          nextState: {
            goalText: `State ${i + 1}`,
            meta: { goalDepth: i + 1, subgoalCount: 0 },
          },
          done: i === 2,
          info: {
            episodeSteps: i + 1,
            totalSteps: i + 1,
          },
        };

        logger.writeEntry(entry);
      }

      await logger.close();

      const content = fs.readFileSync(testLogPath, 'utf-8');
      const lines = content.trim().split('\n');

      expect(lines.length).toBe(3);

      // Verify order
      for (let i = 0; i < 3; i++) {
        const parsed = JSON.parse(lines[i]);
        expect(parsed.data.step).toBe(i);
        expect(parsed.data.action).toBe(`action${i}`);
      }
    });

    it('should handle concurrent writes safely', async () => {
      const logger = new JSONLLogger<string>(testLogPath);
      const promises: Promise<void>[] = [];

      // Simulate concurrent writes
      for (let i = 0; i < 10; i++) {
        const promise = new Promise<void>((resolve) => {
          const entry: TrajectoryEntry<string> = {
            timestamp: Date.now(),
            episode: 1,
            step: i,
            state: {
              goalText: `State ${i}`,
              meta: { goalDepth: 0, subgoalCount: 0 },
            },
            action: `action${i}`,
            reward: -0.1,
            nextState: {
              goalText: `State ${i + 1}`,
              meta: { goalDepth: 0, subgoalCount: 0 },
            },
            done: false,
            info: {
              episodeSteps: i + 1,
              totalSteps: i + 1,
            },
          };

          logger.writeEntry(entry);
          resolve();
        });

        promises.push(promise);
      }

      await Promise.all(promises);
      await logger.close();

      const content = fs.readFileSync(testLogPath, 'utf-8');
      const lines = content.trim().split('\n');

      expect(lines.length).toBe(10);
    });
  });

  describe('Error Handling', () => {
    it('should throw error when writing to closed logger', async () => {
      const logger = new JSONLLogger<string>(testLogPath);
      await logger.close();

      const entry: TrajectoryEntry<string> = {
        timestamp: Date.now(),
        episode: 1,
        step: 0,
        state: {
          goalText: 'Test',
          meta: { goalDepth: 0, subgoalCount: 0 },
        },
        action: 'test',
        reward: 0,
        nextState: {
          goalText: 'Test',
          meta: { goalDepth: 0, subgoalCount: 0 },
        },
        done: false,
        info: {
          episodeSteps: 1,
          totalSteps: 1,
        },
      };

      expect(() => logger.writeEntry(entry)).toThrow('Logger is closed');
    });

    it('should validate entries before writing', async () => {
      const logger = new JSONLLogger<string>(testLogPath);

      const invalidEntry = {
        // Missing required fields
        action: 'test',
      };

      expect(() => logger.writeEntry(invalidEntry as any)).toThrow();

      await logger.close();
    });
  });

  describe('File Format', () => {
    it('should produce valid JSONL format', async () => {
      const logger = new JSONLLogger<string>(testLogPath);

      // Write metadata
      const metadata: RunMetadata = {
        engine: 'qlearn-lite',
        dataset: 'test',
        envVersion: '1.0.0',
        algoVersion: '1.0.0',
        seed: 42,
        timestamp: Date.now(),
      };
      logger.writeMetadata(metadata);

      // Write entries
      for (let i = 0; i < 2; i++) {
        const entry: TrajectoryEntry<string> = {
          timestamp: Date.now(),
          episode: 1,
          step: i,
          state: {
            goalText: 'Test',
            meta: { goalDepth: 0, subgoalCount: 0 },
          },
          action: 'test',
          reward: 0,
          nextState: {
            goalText: 'Test',
            meta: { goalDepth: 0, subgoalCount: 0 },
          },
          done: false,
          info: {
            episodeSteps: 1,
            totalSteps: 1,
          },
        };
        logger.writeEntry(entry);
      }

      await logger.close();

      // Verify each line is valid JSON
      const content = fs.readFileSync(testLogPath, 'utf-8');
      const lines = content.trim().split('\n');

      expect(lines.length).toBe(3); // 1 metadata + 2 entries

      lines.forEach((line) => {
        expect(() => JSON.parse(line)).not.toThrow();
      });
    });
  });
});
