/**
 * GridWorld Interactive Training Demo
 *
 * Features:
 * - Real-time parameter adjustment (α, γ, ε)
 * - Pause/Resume training
 * - Reset Q-table and start over
 * - Continuous or fixed episode modes
 * - Live performance monitoring
 */

import { QLearningAgent, EpsilonGreedy, ConstantEpsilon } from 'qlearn-lite';
import { createGridWorld, encodeGridPos, GridPos, GridAction } from './src/env.js';
import { InteractiveWrapper } from 'rl-dashboard';

// Grid world parameters
const GRID_SIZE = 5;
const MAX_STEPS_PER_EPISODE = 100;

// Initial Q-learning parameters
const INITIAL_ALPHA = 0.1;
const INITIAL_GAMMA = 0.95;
const INITIAL_EPSILON = 0.5;

console.log(`
╔════════════════════════════════════════════╗
║   GridWorld Interactive Training Demo       ║
║                                             ║
║   Grid Size: ${GRID_SIZE}x${GRID_SIZE}                         ║
║   Goal: Navigate from (0,0) to (4,4)       ║
║                                             ║
║   Use keyboard controls to:                ║
║   • Adjust learning parameters in real-time ║
║   • Pause/Resume training                  ║
║   • Switch between continuous/fixed mode   ║
║   • Reset and start over                   ║
╚════════════════════════════════════════════╝

Starting in 2 seconds...
`);

setTimeout(() => {
  // Create environment
  const env = createGridWorld({
    size: GRID_SIZE,
    rewardGoal: 100,
    stepCost: -1,
    wallPenalty: -5,
    enablePotentialShaping: true,
  });

  // Create a policy with adjustable epsilon
  class AdjustableEpsilonGreedy<S, A> extends EpsilonGreedy<S, A> {
    private currentEpsilon: number = INITIAL_EPSILON;

    setEpsilon(value: number) {
      this.currentEpsilon = value;
    }

    getEpsilon(): number {
      return this.currentEpsilon;
    }

    setDecay(value: number) {
      // For this demo, we'll just adjust epsilon directly
      // In a real implementation, you might want to implement decay
    }

    reset() {
      this.currentEpsilon = INITIAL_EPSILON;
    }

    selectAction(state: S, actions: A[], qValues: Map<A, number>): A {
      // Override to use current epsilon
      const rand = Math.random();
      if (rand < this.currentEpsilon) {
        // Explore: random action
        return actions[Math.floor(Math.random() * actions.length)];
      } else {
        // Exploit: best action
        let bestAction = actions[0];
        let bestValue = qValues.get(actions[0]) ?? 0;

        for (const action of actions) {
          const value = qValues.get(action) ?? 0;
          if (value > bestValue) {
            bestValue = value;
            bestAction = action;
          }
        }

        return bestAction;
      }
    }
  }

  const policy = new AdjustableEpsilonGreedy<GridPos, GridAction>(
    new ConstantEpsilon(INITIAL_EPSILON),
  );

  const agent = new QLearningAgent(
    env,
    policy,
    { alpha: INITIAL_ALPHA, gamma: INITIAL_GAMMA },
    encodeGridPos,
    (a: GridAction) => a,
  );

  // Add reset method to Q-table
  (agent as any).q.reset = function () {
    this.table.clear();
  };

  // Wrap agent with interactive dashboard
  const wrapper = new InteractiveWrapper({
    refreshRate: 100,
    historyLength: 200,
    movingAverageWindow: 20,
    enableControls: true,
  });

  const interactiveAgent = wrapper.wrapAgent(agent, env);

  // Start interactive training
  interactiveAgent
    .trainInteractive({
      maxStepsPerEpisode: MAX_STEPS_PER_EPISODE,
      onEpisodeEnd: ({ episode, totalReward, terminated }: any) => {
        // Optional: Add custom logic here
        if (episode % 50 === 0 && terminated) {
          // Could log successful episodes or adjust parameters
        }
      },
    })
    .then(() => {
      // Dashboard will remain open and show exit message
      // User can review final stats before quitting
    })
    .catch((err: any) => {
      console.error('Training error:', err);
      process.exit(1);
    });
}, 2000);
