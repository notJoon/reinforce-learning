/**
 * Simple test for the dashboard
 */

import { QLearningAgent, EpsilonGreedy, LinearEpsilon } from 'qlearn-lite';
import { createGridWorld, encodeGridPos, GridPos, GridAction } from './src/env.js';
import { DashboardWrapper } from 'rl-dashboard';

// Small test parameters
const GRID_SIZE = 3;
const EPISODES = 50;
const MAX_STEPS_PER_EPISODE = 50;

// Create simple environment
const env = createGridWorld({
  size: GRID_SIZE,
  rewardGoal: 100,
  stepCost: -1,
  wallPenalty: -5,
  enablePotentialShaping: false,
});

const policy = new EpsilonGreedy<GridPos, GridAction>(new LinearEpsilon(1.0, 0.1, 0.9 / EPISODES));

const agent = new QLearningAgent(
  env,
  policy,
  { alpha: 0.1, gamma: 0.9 },
  encodeGridPos,
  (a: GridAction) => a,
);

// Wrap agent with dashboard
console.log('Starting dashboard test...');
const dashboardWrapper = new DashboardWrapper({
  refreshRate: 250,
  historyLength: 50,
  movingAverageWindow: 5,
});

const agentWithDashboard = dashboardWrapper.wrapAgent(agent);

// Train the agent
agentWithDashboard.train({
  episodes: EPISODES,
  maxStepsPerEpisode: MAX_STEPS_PER_EPISODE,
});

console.log('\n\nTest completed! Press Ctrl+C to exit.');
