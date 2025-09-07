import { Policy } from "./types";

/** ε schedule interface */
export interface EpsilonSchedule {
    epsilon(episode: number): number;
}

/** Linear decay ε schedule: ε = max(ε_end, ε_start - k*episode) */
export class LinearEpsilon implements EpsilonSchedule {
    constructor(
        private readonly epsStart: number,
        private readonly epsEnd: number,
        private readonly decayPerEpisode: number
    ) {}
    epsilon(episode: number): number {
        return Math.max(this.epsEnd, this.epsStart - episode * this.decayPerEpisode);
    }
}

/** Exponential decay schedule: ε = ε_end + (ε_start-ε_end)*exp(-rate*episode) */
export class ExpEpsilon implements EpsilonSchedule {
    constructor(
        private readonly epsStart: number,
        private readonly epsEnd: number,
        private readonly rate: number
    ) {}
    epsilon(episode: number): number {
        return this.epsEnd + (this.epsStart - this.epsEnd) * Math.exp(-this.rate * episode);
    }
}

export class EpsilonGreedy<S, A> implements Policy<S, A> {
    constructor(
        private readonly schedule: EpsilonSchedule,
        private readonly rng: () => number = Math.random
    ) {}

    /** Should be updated each episode by caller */
    public currentEpisode = 0;

    select(
        state: S,
        legal: A[],
        q: (s: S, a: A) => number
    ): A | undefined {
        if (legal.length === 0) return undefined; /* terminal state */
        const eps = this.schedule.epsilon(this.currentEpisode);
        if (this.rng() < eps) {
            return legal[Math.floor(this.rng() * legal.length)]; // explore
        }

        // greedy tie-break
        // prefer smaller encoded action order (stable)
        let best = legal[0];
        let bestQ = q(state, best);
        for (let i = 1; i < legal.length; i++) {
            const a = legal[i];
            const qa = q(state, a);
            if (qa > bestQ) {
                best = a;
                bestQ = qa;
            }
        }
        return best; // exploit
    }
}
