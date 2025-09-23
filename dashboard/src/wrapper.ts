import { InteractiveDashboard } from './dashboard.js';
import {
  TrainingMetrics,
  ControlCommand,
  DashboardConfig,
  RLAgent,
  DiscreteEnvironment,
  InteractiveAgent,
  InteractiveTrainingConfig,
  EpisodeInfo,
} from './types.js';

// Configuration constants
const DEFAULT_VALUES = {
  SLEEP_DELAY_MS: 100,
  MILESTONE_INTERVAL: 100,
  MIN_SLEEP_MS: 1,
  DEFAULT_TARGET_EPISODES: 100,
  DEFAULT_MAX_STEPS: 100,
  DEFAULT_ALPHA: 0.1,
  DEFAULT_GAMMA: 0.95,
  DEFAULT_EPSILON: 1.0,
  DEFAULT_EPSILON_DECAY: 0.99,
} as const;

export class InteractiveWrapper {
  private dashboard: InteractiveDashboard;
  private currentEpisode: number = 0;
  private currentStep: number = 0;
  private episodeReward: number = 0;
  private totalReward: number = 0;

  // Control state
  private isPaused: boolean = false;
  private shouldStop: boolean = false;
  private shouldReset: boolean = false;
  private continuousMode: boolean = false;
  // Reference to agent for parameter updates
  private agent: RLAgent<unknown, unknown> | null = null;

  constructor(dashboardConfig?: DashboardConfig) {
    this.dashboard = new InteractiveDashboard(dashboardConfig);

    // Set up callbacks
    this.dashboard.setCallbacks({
      onParameterChange: (param, value) => this.handleParameterChange(param, value),
      onControlCommand: (command) => this.handleControlCommand(command),
    });
  }

  private handleParameterChange(param: string, value: number) {
    if (!this.agent) return;

    switch (param) {
      case 'alpha':
        if (this.agent.alpha !== undefined) {
          this.agent.alpha = value;
          this.dashboard.log(`Learning rate (alpha) updated: ${value.toFixed(3)}`);
        }
        break;
      case 'gamma':
        if (this.agent.gamma !== undefined) {
          this.agent.gamma = value;
          this.dashboard.log(`Discount factor (gamma) updated: ${value.toFixed(3)}`);
        }
        break;
      case 'epsilon':
        if (this.agent.policy && this.agent.policy.setEpsilon) {
          this.agent.policy.setEpsilon(value);
          this.dashboard.log(`Exploration rate (epsilon) updated: ${value.toFixed(3)}`);
        }
        break;
      case 'epsilonDecay':
        if (this.agent.policy && this.agent.policy.setDecay) {
          this.agent.policy.setDecay(value);
          this.dashboard.log(`Epsilon decay updated: ${value.toFixed(4)}`);
        }
        break;
    }
  }

  private handleControlCommand(command: ControlCommand) {
    switch (command) {
      case ControlCommand.PAUSE:
        this.isPaused = true;
        break;
      case ControlCommand.RESUME:
        this.isPaused = false;
        break;
      case ControlCommand.RESET:
        this.shouldReset = true;
        break;
      case ControlCommand.STOP:
        this.shouldStop = true;
        break;
      case ControlCommand.CONTINUOUS_MODE:
        this.continuousMode = true;
        break;
      case ControlCommand.FIXED_MODE:
        this.continuousMode = false;
        break;
    }
  }

  /**
   * Wraps the agent's train method with interactive controls
   */
  wrapAgent<S, A>(agent: RLAgent<S, A>, _env?: DiscreteEnvironment<S, A>): InteractiveAgent<S, A> {
    const wrapper = this;
    // Safe type conversion with proper handling
    this.agent = agent as RLAgent<unknown, unknown>;

    const originalTrain = agent.train.bind(agent);

    (agent as InteractiveAgent<S, A>).trainInteractive = async function (
      config: InteractiveTrainingConfig,
    ) {
      // Start dashboard
      wrapper.dashboard.start();
      wrapper.dashboard.log('Interactive training started');

      // Set initial parameters
      const control = wrapper.dashboard.getControl();
      wrapper.continuousMode = control.continuousMode;

      // Initialize dashboard parameters
      wrapper.dashboard.setParameters({
        alpha: agent.alpha || DEFAULT_VALUES.DEFAULT_ALPHA,
        gamma: agent.gamma || DEFAULT_VALUES.DEFAULT_GAMMA,
        epsilon: agent.policy?.getEpsilon ? agent.policy.getEpsilon() : DEFAULT_VALUES.DEFAULT_EPSILON,
        epsilonDecay: agent.policy?.getDecay ? agent.policy.getDecay() : DEFAULT_VALUES.DEFAULT_EPSILON_DECAY,
      });

      // Training loop with interactive control
      let episodesCompleted = 0;
      let trainingCompleted = false;

      while (!wrapper.shouldStop) {
        // Check for pause
        while (wrapper.isPaused && !wrapper.shouldStop && !wrapper.shouldReset) {
          await wrapper.sleep(DEFAULT_VALUES.SLEEP_DELAY_MS);
        }

        // Check for reset (can happen even after completion)
        if (wrapper.shouldReset) {
          wrapper.shouldReset = false;
          trainingCompleted = false;
          episodesCompleted = 0;
          wrapper.currentEpisode = 0;
          wrapper.totalReward = 0;
          wrapper.episodeReward = 0;
          wrapper.currentStep = 0;

          // Get current parameter values from dashboard (which may have been modified)
          const dashboardParams = wrapper.dashboard.getControl().parameters;

          // Apply dashboard parameters to agent
          agent.alpha = dashboardParams.alpha;
          agent.gamma = dashboardParams.gamma;

          // Reset Q-table if available
          if (agent.q && agent.q.reset) {
            agent.q.reset();
            wrapper.dashboard.log('Q-table reset');
          }

          // Reset policy but apply current epsilon value from dashboard
          if (agent.policy) {
            if (agent.policy.reset) {
              agent.policy.reset();
            }
            if (agent.policy.setEpsilon) {
              agent.policy.setEpsilon(dashboardParams.epsilon);
            }
            if (agent.policy.setDecay && dashboardParams.epsilonDecay) {
              agent.policy.setDecay(dashboardParams.epsilonDecay);
            }
          }

          wrapper.dashboard.log('Training reset with parameters:');
          wrapper.dashboard.log(
            `  Alpha: ${agent.alpha.toFixed(3)}, Gamma: ${agent.gamma.toFixed(3)}`,
          );
          wrapper.dashboard.log(
            `  Epsilon: ${dashboardParams.epsilon.toFixed(3)}, Decay: ${dashboardParams.epsilonDecay?.toFixed(4) || 'N/A'}`,
          );
          wrapper.dashboard.log('Ready to train with new parameters!');
          continue;
        }

        // Check if we should continue training
        const shouldContinue =
          wrapper.continuousMode || episodesCompleted < wrapper.dashboard.getTargetEpisodes();

        if (!shouldContinue && !trainingCompleted) {
          trainingCompleted = true;
          wrapper.dashboard.log('Target episodes reached');
          wrapper.dashboard.log('Press r to reset and train again, or :q to exit');
          wrapper.dashboard.setCompleted();
        }

        // If training is completed, just wait for commands
        if (trainingCompleted) {
          await wrapper.sleep(DEFAULT_VALUES.SLEEP_DELAY_MS);
          continue;
        }

        // Run one episode
        const episodeConfig = {
          episodes: 1,
          maxStepsPerEpisode: config.maxStepsPerEpisode || DEFAULT_VALUES.DEFAULT_MAX_STEPS,
          onEpisodeEnd: (info: EpisodeInfo) => {
            episodesCompleted++;
            wrapper.currentEpisode = episodesCompleted;
            wrapper.totalReward += info.totalReward;

            const metrics: TrainingMetrics = {
              episode: episodesCompleted,
              step: info.steps,
              totalReward: wrapper.totalReward,
              episodeReward: info.totalReward,
              epsilon: agent.policy?.getEpsilon ? agent.policy.getEpsilon() : undefined,
              alpha: agent.alpha,
              terminated: info.terminated,
              truncated: info.truncated || false,
              timestamp: Date.now(),
            };

            wrapper.dashboard.update(metrics);

            // Log milestones
            if (episodesCompleted % DEFAULT_VALUES.MILESTONE_INTERVAL === 0) {
              wrapper.dashboard.log(
                `Episode ${episodesCompleted} - Reward: ${info.totalReward.toFixed(2)}`,
              );
            }

            // Call original callback if provided
            if (config.onEpisodeEnd) {
              config.onEpisodeEnd(info);
            }
          },
          onUpdate: (state: S, action: A, reward: number, nextState: S) => {
            wrapper.currentStep++;
            wrapper.episodeReward += reward;

            // Update dashboard during episode
            const metrics: TrainingMetrics = {
              episode: wrapper.currentEpisode,
              step: wrapper.currentStep,
              totalReward: wrapper.totalReward + wrapper.episodeReward,
              episodeReward: wrapper.episodeReward,
              epsilon: agent.policy?.getEpsilon ? agent.policy.getEpsilon() : undefined,
              alpha: agent.alpha,
              terminated: false,
              truncated: false,
              timestamp: Date.now(),
            };

            wrapper.dashboard.update(metrics);

            // Call original callback if provided
            if (config.onUpdate) {
              config.onUpdate(state, action, reward, nextState);
            }
          },
        };

        // Reset episode tracking
        wrapper.currentStep = 0;
        wrapper.episodeReward = 0;

        // Run single episode
        originalTrain(episodeConfig);

        // Update continues based on dashboard settings

        // Small delay to prevent UI blocking
        await wrapper.sleep(DEFAULT_VALUES.MIN_SLEEP_MS);
      }

      // No need for separate completion message here since it's handled in the loop
      // Just keep waiting for stop command
    };

    // Also keep the original train method
    (agent as InteractiveAgent<S, A>).trainOriginal = originalTrain;

    return agent as InteractiveAgent<S, A>;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  stop() {
    this.shouldStop = true;
    this.dashboard.stop();
  }
}
