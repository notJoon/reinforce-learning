/** ε schedule interface */
export interface EpsilonSchedule {
  epsilon(episode: number): number;
}

/** Linear decay ε schedule: ε = max(ε_end, ε_start - k*episode) */
export class LinearEpsilon implements EpsilonSchedule {
  constructor(
    private readonly epsStart: number,
    private readonly epsEnd: number,
    private readonly decayPerEpisode: number,
  ) {}

  epsilon(episode: number): number {
    return Math.max(this.epsEnd, this.epsStart - episode * this.decayPerEpisode);
  }
}

/** Exponential decay schedule: ε = ε_end + (ε_start-ε_end)*exp(-rate*episode) */
export class ExponentialEpsilon implements EpsilonSchedule {
  constructor(
    private readonly epsStart: number,
    private readonly epsEnd: number,
    private readonly rate: number,
  ) {}

  epsilon(episode: number): number {
    return this.epsEnd + (this.epsStart - this.epsEnd) * Math.exp(-this.rate * episode);
  }
}

/** Constant epsilon schedule */
export class ConstantEpsilon implements EpsilonSchedule {
  constructor(private readonly eps: number) {}

  epsilon(_episode: number): number {
    return this.eps;
  }
}

/** @deprecated Use ExponentialEpsilon instead */
export const ExpEpsilon = ExponentialEpsilon;
