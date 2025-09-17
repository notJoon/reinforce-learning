/**
 * Validators for RL logger types
 */

import { TrajectoryEntry, RunMetadata, Observation } from './types';

/**
 * Validate an observation object
 */
export function validateObservation(obs: any): void {
  if (!obs || typeof obs !== 'object') {
    throw new Error('Observation must be an object');
  }

  if (!obs.goalText || typeof obs.goalText !== 'string') {
    throw new Error('goalText is required and must be a string');
  }

  if (!obs.meta || typeof obs.meta !== 'object') {
    throw new Error('meta is required and must be an object');
  }

  if (typeof obs.meta.goalDepth !== 'number') {
    throw new Error('meta.goalDepth must be a number');
  }

  if (typeof obs.meta.subgoalCount !== 'number') {
    throw new Error('meta.subgoalCount must be a number');
  }

  if (obs.hints !== undefined) {
    if (!Array.isArray(obs.hints)) {
      throw new Error('hints must be an array of strings');
    }
    for (const hint of obs.hints) {
      if (typeof hint !== 'string') {
        throw new Error('Each hint must be a string');
      }
    }
  }
}

/**
 * Validate a trajectory entry
 */
export function validateTrajectoryEntry(entry: TrajectoryEntry<any>): void {
  if (typeof entry.timestamp !== 'number') {
    throw new Error('timestamp must be a number');
  }

  if (typeof entry.episode !== 'number') {
    throw new Error('episode must be a number');
  }

  if (typeof entry.step !== 'number') {
    throw new Error('step must be a number');
  }

  if (entry.action === undefined || entry.action === null) {
    throw new Error('action is required');
  }

  if (typeof entry.reward !== 'number') {
    throw new Error('reward must be a number');
  }

  if (typeof entry.done !== 'boolean') {
    throw new Error('done must be a boolean');
  }

  // Validate observations
  validateObservation(entry.state);
  validateObservation(entry.nextState);

  // Validate info
  if (!entry.info || typeof entry.info !== 'object') {
    throw new Error('info must be an object');
  }

  if (typeof entry.info.episodeSteps !== 'number') {
    throw new Error('info.episodeSteps must be a number');
  }

  if (typeof entry.info.totalSteps !== 'number') {
    throw new Error('info.totalSteps must be a number');
  }
}

/**
 * Validate run metadata
 */
export function validateRunMetadata(metadata: RunMetadata): void {
  const requiredFields = ['engine', 'dataset', 'envVersion', 'algoVersion', 'seed', 'timestamp'];

  for (const field of requiredFields) {
    if (!(field in metadata)) {
      throw new Error(`${field} is required in metadata`);
    }
  }

  if (typeof metadata.seed !== 'number') {
    throw new Error('seed must be a number');
  }

  if (typeof metadata.timestamp !== 'number') {
    throw new Error('timestamp must be a number');
  }
}
