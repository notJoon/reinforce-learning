/**
 * Simple test for interactive dashboard
 */

import { QLearningAgent, Policy } from 'qlearn-lite';
import { createGridWorld, encodeGridPos, GridPos, GridAction } from './src/env.js';
import {
  InteractiveWrapper,
  RLAgent,
  RLPolicy,
  QTableInterface,
  TrainingConfig,
  EpisodeInfo,
} from 'rl-dashboard';

// Small test parameters
const GRID_SIZE = 3;
const MAX_STEPS_PER_EPISODE = 50;

console.log('Starting interactive dashboard test...\n');

// Create simple environment
const env = createGridWorld({
  size: GRID_SIZE,
  rewardGoal: 100,
  stepCost: -1,
  wallPenalty: -5,
  enablePotentialShaping: false,
});

// Custom policy that maintains epsilon across resets
class PersistentEpsilonGreedy implements Policy<GridPos, GridAction> {
  private epsilon: number = 0.5;

  select(
    state: GridPos,
    legal: GridAction[],
    qval: (s: GridPos, a: GridAction) => number,
  ): GridAction | undefined {
    if (legal.length === 0) return undefined;

    if (Math.random() < this.epsilon) {
      // Explore: random action
      return legal[Math.floor(Math.random() * legal.length)];
    } else {
      // Exploit: best action
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
    }
  }

  getEpsilon(): number {
    return this.epsilon;
  }

  setEpsilon(value: number): void {
    this.epsilon = value;
  }
}

// Create wrapper for QLearningAgent that implements RLAgent interface
class DashboardCompatibleAgent implements RLAgent<GridPos, GridAction> {
  alpha: number;
  gamma: number;
  policy: RLPolicy<GridPos, GridAction>;
  q: QTableInterface<GridPos, GridAction>;

  private qlearningAgent: QLearningAgent<GridPos, GridAction>;
  private internalPolicy: PersistentEpsilonGreedy;
  private qTable: Map<string, number> = new Map();
  private epsilonDecay: number = 0.99;

  constructor(alpha: number, gamma: number) {
    this.alpha = alpha;
    this.gamma = gamma;

    // Create persistent policy
    this.internalPolicy = new PersistentEpsilonGreedy();

    // Create policy wrapper for dashboard
    this.policy = {
      select: (
        state: GridPos,
        legal: GridAction[],
        qval: (s: GridPos, a: GridAction) => number,
      ): GridAction | undefined => {
        return this.internalPolicy.select(state, legal, qval);
      },
      getEpsilon: () => this.internalPolicy.getEpsilon(),
      setEpsilon: (value: number) => this.internalPolicy.setEpsilon(value),
      getDecay: () => this.epsilonDecay,
      setDecay: (value: number) => {
        this.epsilonDecay = value;
      },
      reset: () => {
        /* keep epsilon on reset */
      },
    };

    // Create Q-table wrapper
    this.q = {
      get: (state: GridPos, action: GridAction): number => {
        const key = `${encodeGridPos(state)}_${action}`;
        return this.qTable.get(key) ?? 0;
      },
      set: (state: GridPos, action: GridAction, value: number): void => {
        const key = `${encodeGridPos(state)}_${action}`;
        this.qTable.set(key, value);
      },
      reset: () => {
        this.qTable.clear();
      },
    };

    // Create the QLearningAgent once with our persistent policy
    this.qlearningAgent = new QLearningAgent(
      env,
      this.internalPolicy,
      { alpha: this.alpha, gamma: this.gamma },
      encodeGridPos,
      (a: GridAction) => a,
    );
  }

  train(config: TrainingConfig<GridPos, GridAction>): void {
    // Convert TrainingConfig to TrainOptions
    const trainOptions = {
      episodes: config.episodes,
      maxStepsPerEpisode: config.maxStepsPerEpisode,
      onEpisodeEnd: config.onEpisodeEnd
        ? (info: { episode: number; steps: number; totalReward: number; terminated: boolean }) => {
            const episodeInfo: EpisodeInfo = {
              episode: info.episode,
              steps: info.steps,
              totalReward: info.totalReward,
              terminated: info.terminated,
              truncated: info.steps >= (config.maxStepsPerEpisode || Infinity),
            };
            config.onEpisodeEnd!(episodeInfo);
          }
        : undefined,
      onUpdate: config.onUpdate
        ? (info: {
            state: GridPos;
            action: GridAction;
            reward: number;
            nextState: GridPos;
            done: boolean;
            oldQ: number;
            newQ: number;
          }) => {
            // Store Q-value in our persistent table
            const key = `${encodeGridPos(info.state)}_${info.action}`;
            this.qTable.set(key, info.newQ);

            // Also update the exposed Q interface
            this.q.set(info.state, info.action, info.newQ);

            // Call the dashboard callback
            config.onUpdate!(info.state, info.action, info.reward, info.nextState);
          }
        : undefined,
    };

    // Train with the same agent instance (Q-values persist)
    this.qlearningAgent.train(trainOptions);
  }
}

// Create the agent
const agent = new DashboardCompatibleAgent(0.1, 0.9);

// Create interactive wrapper
const wrapper = new InteractiveWrapper({
  refreshRate: 250,
  historyLength: 100,
  movingAverageWindow: 10,
});

const interactiveAgent = wrapper.wrapAgent(agent, env);

// Start interactive training
console.log('Launching interactive dashboard...\n');

interactiveAgent
  .trainInteractive({
    maxStepsPerEpisode: MAX_STEPS_PER_EPISODE,
  })
  .then(() => {
    // Dashboard will handle the exit message and wait for user input
    // No need to exit automatically
  })
  .catch((err: Error) => {
    console.error('Error:', err);
    process.exit(1);
  });
