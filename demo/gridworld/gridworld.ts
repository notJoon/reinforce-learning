/**
 * GridWorld Q-Learning Demo
 *
 * Train a Q-learning agent to navigate a grid world from start (0,0) to goal (N-1, N-1).
 */

import { QLearningAgent, EpsilonGreedy, LinearEpsilon } from 'qlearn-lite';
import { createGridWorld, encodeGridPos, GridPos, GridAction } from './src/env.js';
import * as fs from 'fs';
import * as path from 'path';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';

// Grid world parameters
const GRID_SIZE = 5;
const EPISODES = 100;
const MAX_STEPS_PER_EPISODE = 100;

// Q-learning parameters
const ALPHA = 0.1; // Learning rate
const GAMMA = 0.95; // Discount factor
const EPS_START = 1.0;
const EPS_END = 0.01;
const EPS_DECAY_PER_EPISODE = (EPS_START - EPS_END) / EPISODES;

console.log(`🎮 GridWorld Q-Learning Demo`);
console.log(`Grid Size: ${GRID_SIZE}x${GRID_SIZE}`);
console.log(`Start: (0, 0), Goal: (${GRID_SIZE - 1}, ${GRID_SIZE - 1})`);
console.log(`Episodes: ${EPISODES}`);
console.log(`Learning Rate: ${ALPHA}, Discount: ${GAMMA}`);
console.log(`Epsilon: ${EPS_START} → ${EPS_END}\n`);

// Create environment and agent
const env = createGridWorld({
  size: GRID_SIZE,
  rewardGoal: 100,
  stepCost: -1,
  wallPenalty: -5,
  enablePotentialShaping: true,
});

const policy = new EpsilonGreedy<GridPos, GridAction>(
  new LinearEpsilon(EPS_START, EPS_END, EPS_DECAY_PER_EPISODE),
);

const agent = new QLearningAgent(
  env,
  policy,
  { alpha: ALPHA, gamma: GAMMA },
  encodeGridPos,
  (a: GridAction) => a,
);

// Training statistics
const episodeRewards: number[] = [];
const episodeSteps: number[] = [];
let successCount = 0;

// Train the agent
console.log('🏃 Training...\n');

agent.train({
  episodes: EPISODES,
  maxStepsPerEpisode: MAX_STEPS_PER_EPISODE,
  onEpisodeEnd: ({ episode, steps, totalReward, terminated }) => {
    episodeRewards.push(totalReward);
    episodeSteps.push(steps);

    if (terminated) {
      successCount++;
    }

    // Progress updates every 10 episodes
    if ((episode + 1) % 10 === 0) {
      const recentRewards = episodeRewards.slice(-10);
      const avgReward = recentRewards.reduce((a, b) => a + b, 0) / recentRewards.length;
      const recentSuccess = recentRewards.filter((r) => r > 50).length; // Assuming success if reward > 50

      console.log(
        `Episode ${episode + 1}/${EPISODES} | ` +
          `Avg Reward: ${avgReward.toFixed(1)} | ` +
          `Success Rate: ${recentSuccess}/10 | ` +
          `ε: ${policy.getEpsilon().toFixed(3)}`,
      );
    }
  },
});

console.log('\n✅ Training Complete!');
console.log(
  `Total Success Rate: ${successCount}/${EPISODES} (${((successCount / EPISODES) * 100).toFixed(1)}%)`,
);

// Test the learned policy
console.log('\n🧪 Testing Learned Policy (Greedy)...\n');

const testRuns = 5;
for (let run = 0; run < testRuns; run++) {
  const result = agent.rollout(env.reset(), { maxSteps: 50 });

  console.log(`Test Run ${run + 1}:`);
  console.log(`  Path length: ${result.path.length}`);
  console.log(`  Total reward: ${result.totalReward.toFixed(1)}`);

  // Check if reached goal
  const finalState = result.path[result.path.length - 1];
  const success = finalState.x === GRID_SIZE - 1 && finalState.y === GRID_SIZE - 1;
  console.log(`  Success: ${success ? '✅' : '❌'}`);

  // Show the path
  const pathStr = result.path.map((pos: GridPos) => `(${pos.x},${pos.y})`).join(' → ');
  console.log(`  Path: ${pathStr}\n`);
}

// Visualize Q-table
console.log('📊 Q-Table Visualization:');
console.log('(Showing best action and Q-value for each state)\n');

// Create a grid to show the best action for each position
const grid: string[][] = Array(GRID_SIZE)
  .fill(null)
  .map(() => Array(GRID_SIZE).fill(''));

for (let y = 0; y < GRID_SIZE; y++) {
  for (let x = 0; x < GRID_SIZE; x++) {
    const pos: GridPos = { x, y };
    const actions = env.actions(pos);

    if (actions.length === 0) {
      grid[y][x] = ' G '; // Goal
      continue;
    }

    // Find best action
    let bestAction = '';
    let bestQ = -Infinity;

    for (const action of actions) {
      const q = agent.q.get(pos, action);
      if (q > bestQ) {
        bestQ = q;
        bestAction = action;
      }
    }

    // Convert action to arrow
    const arrows: Record<GridAction, string> = {
      up: ' ↑ ',
      down: ' ↓ ',
      left: ' ← ',
      right: ' → ',
    };

    grid[y][x] = arrows[bestAction as GridAction] || ' ? ';
  }
}

// Print the grid
console.log(
  '  ' +
    Array(GRID_SIZE)
      .fill(null)
      .map((_, i) => ` ${i} `)
      .join(''),
);
for (let y = 0; y < GRID_SIZE; y++) {
  console.log(`${y} [${grid[y].join('|')}]`);
}

// Save Q-table to file
const currentDir = path.dirname(fileURLToPath(import.meta.url));
const outputDir = path.join(path.dirname(currentDir), 'generated');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

const qtableData = {
  gridSize: GRID_SIZE,
  episodes: EPISODES,
  alpha: ALPHA,
  gamma: GAMMA,
  successRate: successCount / EPISODES,
  qtable: agent.q.toJSON(),
};

fs.writeFileSync(
  path.join(outputDir, 'gridworld_qtable.json'),
  JSON.stringify(qtableData, null, 2),
);

console.log(`\n💾 Q-table saved to: generated/gridworld_qtable.json`);

// Save training history
const historyData = {
  episodes: EPISODES,
  episodeRewards,
  episodeSteps,
  parameters: {
    gridSize: GRID_SIZE,
    alpha: ALPHA,
    gamma: GAMMA,
    epsStart: EPS_START,
    epsEnd: EPS_END,
  },
};

fs.writeFileSync(
  path.join(outputDir, 'gridworld_history.json'),
  JSON.stringify(historyData, null, 2),
);

console.log(`📈 Training history saved to: generated/gridworld_history.json`);

// Check if visualization flag is set
const shouldVisualize = process.argv.includes('--visualize') || process.argv.includes('-v');

if (shouldVisualize) {
  console.log('\n🎨 Generating visualizations...\n');

  // Get paths
  const historyPath = path.join(outputDir, 'gridworld_history.json');
  const qtablePath = path.join(outputDir, 'gridworld_qtable.json');
  const visualizationPrefix = path.join(outputDir, 'gridworld');

  // Run Python visualization script
  const pythonScript = path.join(currentDir, 'visualize.py');
  const viz = spawn('python3', [pythonScript, historyPath, qtablePath, visualizationPrefix]);

  viz.stdout.on('data', (data) => {
    console.log(`${data}`);
  });

  viz.stderr.on('data', (data) => {
    console.error(`Visualization error: ${data}`);
  });

  viz.on('close', (code) => {
    if (code === 0) {
      console.log('\n✨ Visualizations complete!');
      console.log('Generated files:');
      console.log('  - gridworld_training.png: Training progress curves');
      console.log('  - gridworld_qvalues.png: Q-value heatmap');
      console.log('  - gridworld_policy.png: Learned policy with arrows');
      console.log('  - gridworld_paths.png: Sample paths following the policy');
    } else {
      console.error(`\n❌ Visualization failed with code ${code}`);
      console.error('Make sure Python dependencies are installed:');
      console.error('  pip install matplotlib numpy seaborn');
    }
  });
}
