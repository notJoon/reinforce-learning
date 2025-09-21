import { Policy } from './types.js';

import { EpsilonSchedule } from './schedules.js';

export interface EpisodeAwarePolicy<S, A> extends Policy<S, A> {
  currentEpisode: number;
}

export class EpsilonGreedy<S, A> implements EpisodeAwarePolicy<S, A> {
  public currentEpisode = 0;

  constructor(
    private readonly schedule: EpsilonSchedule,
    private readonly rng: () => number = Math.random,
  ) {}

  select(state: S, legal: A[], q: (s: S, a: A) => number): A | undefined {
    if (legal.length === 0) return undefined;

    const eps = this.schedule.epsilon(this.currentEpisode);
    if (this.shouldExplore(eps)) {
      return this.selectRandom(legal);
    }

    return this.selectGreedy(state, legal, q);
  }

  getEpsilon(): number {
    return this.schedule.epsilon(this.currentEpisode);
  }

  private shouldExplore(epsilon: number): boolean {
    return this.rng() < epsilon;
  }

  private selectRandom(legal: A[]): A {
    return legal[Math.floor(this.rng() * legal.length)];
  }

  private selectGreedy(state: S, legal: A[], q: (s: S, a: A) => number): A {
    let best = legal[0];
    let bestQ = q(state, best);

    for (let i = 1; i < legal.length; i++) {
      const action = legal[i];
      const qValue = q(state, action);
      if (qValue > bestQ) {
        best = action;
        bestQ = qValue;
      }
    }

    return best;
  }
}
