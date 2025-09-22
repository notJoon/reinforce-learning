/**
 * GridWorld Q-Learning Demo with Dashboard
 *
 * Train a Q-learning agent with real-time monitoring dashboard
 */

import { QLearningAgent, EpsilonGreedy, LinearEpsilon } from 'qlearn-lite';
import { createGridWorld, encodeGridPos, GridPos, GridAction } from './src/env.js';
import { DashboardWrapper } from 'rl-dashboard';

// Grid world parameters
const GRID_SIZE = 5;
const EPISODES = 500; // More episodes to see the dashboard in action
const MAX_STEPS_PER_EPISODE = 100;

// Q-learning parameters
const ALPHA = 0.1;
const GAMMA = 0.95;
const EPS_START = 1.0;
const EPS_END = 0.01;
const EPS_DECAY_PER_EPISODE = (EPS_START - EPS_END) / EPISODES;

// Create environment
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

// Wrap agent with dashboard
const dashboardWrapper = new DashboardWrapper({
  refreshRate: 100,
  historyLength: 200,
  movingAverageWindow: 20,
});

const agentWithDashboard = dashboardWrapper.wrapAgent(agent);

// Train the agent with dashboard
agentWithDashboard.train({
  episodes: EPISODES,
  maxStepsPerEpisode: MAX_STEPS_PER_EPISODE,
});

// Dashboard will stay open until user quits
// The dashboard will show "Press q or Ctrl+C to exit" message
