/**
 * Integration tests for timeout policy with Q-learning
 */

import { QLearningAgent } from '../../src/agent';
import { DiscreteEnv } from '../../src/types';
import { EpsilonGreedy, ConstantEpsilon } from '../../src/policy';
import { TimeoutManager } from '../../src/timeout';

/**
 * Slow environment that would take many steps to solve
 */
class SlowEnv implements DiscreteEnv<number, string> {
  reset() {
    return 0;
  }

  actions(state: number): string[] {
    return state >= 100 ? [] : ['forward', 'backward'];
  }

  step(state: number, action: string) {
    const nextState = action === 'forward' ? state + 1 : Math.max(0, state - 1);
    const reward = nextState === 100 ? 100 : -1;
    return {
      nextState,
      reward,
      done: nextState === 100,
    };
  }
}

describe('Timeout Integration with Q-Learning', () => {
  it('should stop episode when timeout is reached', () => {
    const env = new SlowEnv();
    const policy = new EpsilonGreedy<number, string>(new ConstantEpsilon(0.1));
    const agent = new QLearningAgent(env, policy, { alpha: 0.1, gamma: 0.9 });

    const timeoutManager = new TimeoutManager({
      maxStepsPerEpisode: 50,
    });

    let episodeStats: any[] = [];

    // Custom training loop with timeout
    for (let ep = 0; ep < 5; ep++) {
      timeoutManager.resetEpisode();
      let s = env.reset();
      let totalReward = 0;
      let steps = 0;

      while (true) {
        if (timeoutManager.isEpisodeTimeout()) {
          break;
        }

        const legal = env.actions(s);
        if (legal.length === 0) break;

        const a = policy.select(s, legal, (state, action) => agent.q.get(state, action));
        if (a === undefined) break;

        const { nextState, reward, done } = env.step(s, a);

        // Q-learning update
        const oldQ = agent.q.get(s, a);
        const maxNext = agent.q.maxOverActions(nextState, env.actions(nextState))?.q ?? 0;
        const target = reward + 0.9 * maxNext;
        const newQ = oldQ + 0.1 * (target - oldQ);
        agent.q.set(s, a, newQ);

        totalReward += reward;
        s = nextState;
        steps++;
        timeoutManager.step();

        if (done) break;
      }

      const info = timeoutManager.getTimeoutInfo();
      episodeStats.push({
        episode: ep,
        steps,
        totalReward,
        timedOut: info.isEpisodeTimeout,
      });
    }

    // Check that episodes were limited by timeout
    episodeStats.forEach((stat) => {
      expect(stat.steps).toBeLessThanOrEqual(50);
      if (stat.steps === 50) {
        expect(stat.timedOut).toBe(true);
      }
    });
  });

  it('should track total steps across episodes', () => {
    const env = new SlowEnv();
    const policy = new EpsilonGreedy<number, string>(new ConstantEpsilon(0.1));
    const agent = new QLearningAgent(env, policy, { alpha: 0.1, gamma: 0.9 });

    const timeoutManager = new TimeoutManager({
      maxStepsPerEpisode: 20,
      maxTotalSteps: 50,
    });

    let totalStepsReached = 0;
    let episodesCompleted = 0;

    try {
      for (let ep = 0; ep < 10; ep++) {
        timeoutManager.resetEpisode();
        let s = env.reset();

        while (!timeoutManager.isEpisodeTimeout()) {
          if (timeoutManager.isTotalTimeout()) {
            throw new Error('Total timeout reached');
          }

          const legal = env.actions(s);
          if (legal.length === 0) break;

          const a = policy.select(s, legal, (state, action) => agent.q.get(state, action));
          if (a === undefined) break;

          const { nextState, done } = env.step(s, a);
          s = nextState;
          timeoutManager.step();

          if (done) break;
        }

        episodesCompleted++;
      }
    } catch (e: any) {
      expect(e.message).toBe('Total timeout reached');
      totalStepsReached = timeoutManager.getTotalSteps();
    }

    expect(totalStepsReached).toBe(50);
    expect(episodesCompleted).toBeLessThan(10); // Should not complete all episodes
  });

  it('should integrate with train method using maxStepsPerEpisode', () => {
    const env = new SlowEnv();
    const policy = new EpsilonGreedy<number, string>(new ConstantEpsilon(0.1));
    const agent = new QLearningAgent(env, policy, { alpha: 0.1, gamma: 0.9 });

    const episodeInfo: any[] = [];

    agent.train({
      episodes: 3,
      maxStepsPerEpisode: 30,
      onEpisodeEnd: (info) => {
        episodeInfo.push(info);
      },
    });

    // All episodes should respect the step limit
    episodeInfo.forEach((info) => {
      expect(info.steps).toBeLessThanOrEqual(30);
      if (info.steps === 30) {
        expect(info.terminated).toBe(false); // Timeout, not natural termination
      }
    });
  });

  it('should handle rollout with timeout', () => {
    const env = new SlowEnv();
    const policy = new EpsilonGreedy<number, string>(new ConstantEpsilon(0.0)); // Greedy
    const agent = new QLearningAgent(env, policy, { alpha: 0.1, gamma: 0.9 });

    // Pre-train to have some Q-values
    agent.train({
      episodes: 10,
      maxStepsPerEpisode: 20,
    });

    // Rollout with step limit
    const result = agent.rollout(0, { maxSteps: 15 });

    expect(result.path.length).toBeLessThanOrEqual(16); // Initial state + 15 steps
    expect(result.totalReward).toBeLessThan(100); // Won't reach goal
  });
});
