/**
 * Tests for log schema evolvability and backward compatibility
 */

import { TrajectoryEntry, RunMetadata, validateTrajectoryEntry, validateRunMetadata } from '../src';
import * as path from 'path';
import * as fs from 'fs';

describe('Log Schema Evolution', () => {
  describe('Backward Compatibility', () => {
    it('should read v1.0.0 schema with current validator', () => {
      // Simulate a v1.0.0 log entry (minimal required fields)
      const oldEntry = {
        timestamp: 1234567890,
        episode: 1,
        step: 0,
        state: {
          goalText: 'Test goal',
          meta: { goalDepth: 0, subgoalCount: 0 },
        },
        action: 'test_action',
        reward: -0.1,
        nextState: {
          goalText: 'Next goal',
          meta: { goalDepth: 1, subgoalCount: 0 },
        },
        done: false,
        info: {
          episodeSteps: 1,
          totalSteps: 1,
        },
      };

      // Should validate without errors
      expect(() => validateTrajectoryEntry(oldEntry)).not.toThrow();
    });

    it('should handle entries with additional fields gracefully', () => {
      // Entry with extra fields (simulating future schema additions)
      const futureEntry = {
        timestamp: 1234567890,
        episode: 1,
        step: 0,
        state: {
          goalText: 'Test goal',
          meta: { goalDepth: 0, subgoalCount: 0 },
          // Future field
          embedding: [0.1, 0.2, 0.3],
        },
        action: 'test_action',
        reward: -0.1,
        nextState: {
          goalText: 'Next goal',
          meta: { goalDepth: 1, subgoalCount: 0 },
        },
        done: false,
        info: {
          episodeSteps: 1,
          totalSteps: 1,
          // Future fields
          confidence: 0.95,
          searchDepth: 5,
        },
        // Future top-level field
        modelVersion: '2.0.0',
      };

      // Should validate core fields without errors
      expect(() => validateTrajectoryEntry(futureEntry as any)).not.toThrow();
    });

    it('should handle metadata with additional fields', () => {
      const extendedMetadata = {
        engine: 'qlearn-lite',
        dataset: 'test',
        envVersion: '1.0.0',
        algoVersion: '1.0.0',
        seed: 42,
        timestamp: 1234567890,
        // Additional fields
        gitCommit: 'abc123',
        hyperparameters: {
          alpha: 0.1,
          gamma: 0.9,
          epsilon: 0.1,
        },
      };

      expect(() => validateRunMetadata(extendedMetadata as any)).not.toThrow();
    });
  });

  describe('Schema Version Compatibility', () => {
    it('should parse JSONL with mixed schema versions', () => {
      const mixedLog = [
        // v1.0.0 metadata
        JSON.stringify({
          type: 'metadata',
          data: {
            engine: 'qlearn-lite',
            dataset: 'test',
            envVersion: '1.0.0',
            algoVersion: '1.0.0',
            seed: 42,
            timestamp: 1234567890,
          },
        }),
        // v1.0.0 trajectory entry
        JSON.stringify({
          type: 'trajectory',
          data: {
            timestamp: 1234567891,
            episode: 0,
            step: 0,
            state: { goalText: 'Start', meta: { goalDepth: 0, subgoalCount: 0 } },
            action: 'move',
            reward: -0.1,
            nextState: { goalText: 'Next', meta: { goalDepth: 0, subgoalCount: 0 } },
            done: false,
            info: { episodeSteps: 1, totalSteps: 1 },
          },
        }),
        // Hypothetical v1.1.0 entry with optional hints
        JSON.stringify({
          type: 'trajectory',
          data: {
            timestamp: 1234567892,
            episode: 0,
            step: 1,
            state: {
              goalText: 'Next',
              meta: { goalDepth: 0, subgoalCount: 0 },
              hints: ['Try using the axiom'],
            },
            action: 'apply_axiom',
            reward: 1.0,
            nextState: { goalText: 'Goal', meta: { goalDepth: 0, subgoalCount: 0 } },
            done: true,
            info: { episodeSteps: 2, totalSteps: 2, reason: 'success' },
          },
        }),
      ];

      // Parse and validate each line
      mixedLog.forEach((line, idx) => {
        const entry = JSON.parse(line);

        if (entry.type === 'metadata') {
          expect(() => validateRunMetadata(entry.data)).not.toThrow();
        } else if (entry.type === 'trajectory') {
          expect(() => validateTrajectoryEntry(entry.data)).not.toThrow();
        }
      });
    });
  });

  describe('Schema Migration', () => {
    it('should provide migration path for deprecated fields', () => {
      // Example: if we deprecated 'done' in favor of 'terminated'
      const migrateEntry = (entry: any): TrajectoryEntry<any> => {
        // Handle old 'terminated' field (hypothetical deprecation)
        if ('terminated' in entry && !('done' in entry)) {
          entry.done = entry.terminated;
          delete entry.terminated;
        }

        // Handle old reason format (hypothetical change)
        if (entry.info && typeof entry.info.reason === 'number') {
          const reasonMap: Record<number, string> = {
            0: 'success',
            1: 'timeout',
            2: 'invalid',
            3: 'stuck',
          };
          entry.info.reason = reasonMap[entry.info.reason] || undefined;
        }

        return entry;
      };

      // Test migration
      const oldEntry = {
        timestamp: 1234567890,
        episode: 1,
        step: 0,
        state: { goalText: 'Test', meta: { goalDepth: 0, subgoalCount: 0 } },
        action: 'test',
        reward: 10,
        nextState: { goalText: 'Done', meta: { goalDepth: 0, subgoalCount: 0 } },
        terminated: true, // Old field name
        info: {
          episodeSteps: 1,
          totalSteps: 1,
          reason: 0, // Old numeric format
        },
      };

      const migrated = migrateEntry({ ...oldEntry });

      expect(migrated.done).toBe(true);
      expect((migrated as any).terminated).toBeUndefined();
      expect(migrated.info.reason).toBe('success');
      expect(() => validateTrajectoryEntry(migrated)).not.toThrow();
    });
  });

  describe('Schema Documentation', () => {
    it('should maintain schema version in logs', () => {
      const schemaVersion = '1.0.0';

      // Ensure metadata includes schema version info
      const metadata: RunMetadata = {
        engine: 'qlearn-lite',
        dataset: 'test',
        envVersion: '1.0.0',
        algoVersion: '1.0.0',
        seed: 42,
        timestamp: Date.now(),
        schemaVersion, // Track schema version
      };

      expect(() => validateRunMetadata(metadata)).not.toThrow();
      expect(metadata.schemaVersion).toBe(schemaVersion);
    });

    it('should handle logs without explicit schema version', () => {
      // Logs without schemaVersion should still be valid
      const metadata: RunMetadata = {
        engine: 'qlearn-lite',
        dataset: 'test',
        envVersion: '1.0.0',
        algoVersion: '1.0.0',
        seed: 42,
        timestamp: Date.now(),
      };

      expect(() => validateRunMetadata(metadata)).not.toThrow();
    });
  });
});
