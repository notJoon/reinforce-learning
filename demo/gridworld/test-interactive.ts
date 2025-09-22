/**
 * Simple test for interactive dashboard
 */

import { QLearningAgent, EpsilonGreedy, ConstantEpsilon } from 'qlearn-lite';
import { createGridWorld, encodeGridPos, GridPos, GridAction } from './src/env.js';
import { InteractiveWrapper } from 'rl-dashboard';

// Small test parameters
const GRID_SIZE = 3;
const MAX_STEPS_PER_EPISODE = 50;

console.log('Starting interactive dashboard test...\n');
console.log('Controls:');
console.log('  Space - Pause/Resume');
console.log('  r - Reset training');
console.log('  c - Toggle continuous mode');
console.log('  +/- - Adjust episode target');
console.log('  1/2 - Adjust learning rate (α)');
console.log('  3/4 - Adjust discount (γ)');
console.log('  5/6 - Adjust epsilon (ε)');
console.log('  q - Quit\n');

// Create simple environment
const env = createGridWorld({
  size: GRID_SIZE,
  rewardGoal: 100,
  stepCost: -1,
  wallPenalty: -5,
  enablePotentialShaping: false,
});

// Create adjustable policy
class AdjustablePolicy<S, A> extends EpsilonGreedy<S, A> {
  private epsilon: number = 0.5;

  getEpsilon(): number {
    return this.epsilon;
  }

  setEpsilon(value: number) {
    this.epsilon = value;
  }

  reset() {
    // Keep current epsilon value on reset
    // Only reset other state if needed
  }

  selectAction(state: S, actions: A[], qValues: Map<A, number>): A {
    const rand = Math.random();
    if (rand < this.epsilon) {
      return actions[Math.floor(Math.random() * actions.length)];
    } else {
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

const policy = new AdjustablePolicy<GridPos, GridAction>(new ConstantEpsilon(0.5));

const agent = new QLearningAgent(
  env,
  policy,
  { alpha: 0.1, gamma: 0.9 },
  encodeGridPos,
  (a: GridAction) => a,
);

// Add reset method to Q-table
(agent as any).q.reset = function () {
  this.table.clear();
};

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
  .catch((err: any) => {
    console.error('Error:', err);
    process.exit(1);
  });
