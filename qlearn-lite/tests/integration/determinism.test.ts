/**
 * Integration tests for deterministic behavior with fixed seeds
 */

import { QLearningAgent } from '../../src/agent';
import { Policy, DiscreteEnv } from '../../src/types';
import { ConstantEpsilon } from '../../src/schedules';
import { seedRandom } from '../../src/gym-env';
import { JSONLLogger, TrajectoryEntry, RunMetadata } from '../../../rl-logger/src';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

// Simple grid world for testing
interface GridPos {
  x: number;
  y: number;
}

type GridAction = 'up' | 'down' | 'left' | 'right';

function createTestGridWorld(size: number = 4): DiscreteEnv<GridPos, GridAction> {
  let current: GridPos = { x: 0, y: 0 };
  const goal: GridPos = { x: size - 1, y: size - 1 };

  return {
    reset(): GridPos {
      current = { x: 0, y: 0 };
      return current;
    },

    actions(_state: GridPos): GridAction[] {
      return ['up', 'down', 'left', 'right'];
    },

    step(
      state: GridPos,
      action: GridAction,
    ): { nextState: GridPos; reward: number; done: boolean } {
      let next: GridPos = { ...state };

      switch (action) {
        case 'up':
          next.y = Math.max(0, next.y - 1);
          break;
        case 'down':
          next.y = Math.min(size - 1, next.y + 1);
          break;
        case 'left':
          next.x = Math.max(0, next.x - 1);
          break;
        case 'right':
          next.x = Math.min(size - 1, next.x + 1);
          break;
      }

      const isGoal = next.x === goal.x && next.y === goal.y;
      const reward = isGoal ? 10 : -0.1;

      current = next;
      return {
        nextState: next,
        reward,
        done: isGoal,
      };
    },
  };
}

function encodeGridPos(pos: GridPos): string {
  return `${pos.x},${pos.y}`;
}

/**
 * Deterministic policy for testing
 */
class DeterministicEpsilonGreedy<S, A> implements Policy<S, A> {
  private rng: () => number;

  constructor(
    private epsilon: ConstantEpsilon,
    seed: number,
  ) {
    this.rng = seedRandom(seed);
  }

  select(state: S, legal: A[], qval: (s: S, a: A) => number): A | undefined {
    if (legal.length === 0) return undefined;

    const eps = this.epsilon.epsilon(0);

    if (this.rng() < eps) {
      // Exploration: deterministic random choice
      const idx = Math.floor(this.rng() * legal.length);
      return legal[idx];
    } else {
      // Exploitation: greedy (deterministic tie-breaking)
      const qvals = legal.map((a) => ({ action: a, q: qval(state, a) }));
      qvals.sort((a, b) => {
        if (a.q !== b.q) return b.q - a.q;
        // Deterministic tie-breaking by action string representation
        return String(a.action).localeCompare(String(b.action));
      });
      return qvals[0].action;
    }
  }
}

/**
 * Run a training session and log to JSONL
 */
async function runTrainingSession(seed: number, logPath: string): Promise<string> {
  const env = createTestGridWorld(4);
  const policy = new DeterministicEpsilonGreedy<GridPos, GridAction>(
    new ConstantEpsilon(0.1),
    seed,
  );
  const agent = new QLearningAgent(
    env,
    policy,
    {
      alpha: 0.1,
      gamma: 0.9,
    },
    encodeGridPos,
    (a: GridAction) => a,
  );

  const logger = new JSONLLogger<GridAction>(logPath);

  // Write metadata with fixed timestamp
  const metadata: RunMetadata = {
    engine: 'qlearn-lite',
    dataset: 'grid-world-4x4',
    envVersion: '1.0.0',
    algoVersion: '1.0.0',
    seed,
    timestamp: 1234567890000, // Fixed timestamp for determinism
  };
  logger.writeMetadata(metadata);

  // Train for a fixed number of episodes
  let globalStepCount = 0;

  for (let episode = 0; episode < 5; episode++) {
    let state = env.reset();
    let episodeSteps = 0;
    const maxStepsPerEpisode = 20;

    while (episodeSteps < maxStepsPerEpisode) {
      const actions = env.actions(state);
      if (actions.length === 0) break;

      const action = policy.select(state, actions, (s, a) => agent.q.get(s, a));
      if (!action) break;

      const { nextState, reward, done } = env.step(state, action);

      // Q-learning update
      const oldQ = agent.q.get(state, action);
      const nextActions = env.actions(nextState);
      const maxNextQ =
        nextActions.length > 0
          ? Math.max(...nextActions.map((a: GridAction) => agent.q.get(nextState, a)))
          : 0;
      const newQ = oldQ + 0.1 * (reward + 0.9 * maxNextQ - oldQ);
      agent.q.set(state, action, newQ);

      // Log trajectory entry
      const entry: TrajectoryEntry<GridAction> = {
        timestamp: 1234567890000 + globalStepCount * 1000, // Deterministic timestamps
        episode,
        step: episodeSteps,
        state: {
          goalText: `Grid position: (${state.x}, ${state.y})`,
          meta: { goalDepth: 0, subgoalCount: 0 },
        },
        action,
        reward,
        nextState: {
          goalText: `Grid position: (${nextState.x}, ${nextState.y})`,
          meta: { goalDepth: 0, subgoalCount: 0 },
        },
        done,
        info: {
          episodeSteps: episodeSteps + 1,
          totalSteps: globalStepCount + 1,
          reason: done ? 'success' : undefined,
        },
      };
      logger.writeEntry(entry);

      state = nextState;
      episodeSteps++;
      globalStepCount++;

      if (done) break;
    }
  }

  await logger.close();

  // Calculate hash of the file
  const content = fs.readFileSync(logPath, 'utf-8');
  const hash = crypto.createHash('sha256').update(content).digest('hex');
  return hash;
}

describe('Deterministic JSONL Reproduction', () => {
  const testDir = path.join(__dirname, 'test-logs');

  beforeEach(() => {
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
  });

  afterEach(() => {
    // Clean up test files
    if (fs.existsSync(testDir)) {
      fs.readdirSync(testDir).forEach((file) => {
        fs.unlinkSync(path.join(testDir, file));
      });
      fs.rmdirSync(testDir);
    }
  });

  it('should produce identical JSONL files with same seed', async () => {
    const seed = 42;
    const log1Path = path.join(testDir, 'run1.jsonl');
    const log2Path = path.join(testDir, 'run2.jsonl');

    // Run two identical training sessions
    const hash1 = await runTrainingSession(seed, log1Path);
    const hash2 = await runTrainingSession(seed, log2Path);

    // Hashes should be identical
    expect(hash1).toBe(hash2);

    // Line counts should be identical
    const lines1 = fs.readFileSync(log1Path, 'utf-8').trim().split('\n');
    const lines2 = fs.readFileSync(log2Path, 'utf-8').trim().split('\n');
    expect(lines1.length).toBe(lines2.length);

    // Each line should be identical
    for (let i = 0; i < lines1.length; i++) {
      expect(lines1[i]).toBe(lines2[i]);
    }
  });

  it('should produce different JSONL files with different seeds', async () => {
    const log1Path = path.join(testDir, 'seed1.jsonl');
    const log2Path = path.join(testDir, 'seed2.jsonl');

    // Run with different seeds
    const hash1 = await runTrainingSession(42, log1Path);
    const hash2 = await runTrainingSession(123, log2Path);

    // Hashes should be different (due to different exploration)
    expect(hash1).not.toBe(hash2);
  });

  it('should maintain determinism across multiple runs', async () => {
    const seed = 999;
    const hashes: string[] = [];

    // Run the same seed multiple times
    for (let i = 0; i < 3; i++) {
      const logPath = path.join(testDir, `run${i}.jsonl`);
      const hash = await runTrainingSession(seed, logPath);
      hashes.push(hash);
    }

    // All hashes should be identical
    const firstHash = hashes[0];
    hashes.forEach((hash) => {
      expect(hash).toBe(firstHash);
    });
  });
});
