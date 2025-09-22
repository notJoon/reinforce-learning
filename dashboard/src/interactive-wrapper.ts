import { InteractiveDashboard } from './interactive-dashboard.js';
import { TrainingMetrics, ControlCommand, TrainingControl } from './types.js';

export class InteractiveWrapper {
  private dashboard: InteractiveDashboard;
  private currentEpisode: number = 0;
  private currentStep: number = 0;
  private episodeReward: number = 0;
  private totalReward: number = 0;
  private episodeStarted: boolean = false;

  // Control state
  private isPaused: boolean = false;
  private shouldStop: boolean = false;
  private shouldReset: boolean = false;
  private continuousMode: boolean = false;
  private targetEpisodes: number = 100;

  // Reference to agent for parameter updates
  private agent: any;
  private env: any;

  constructor(dashboardConfig?: any) {
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
        }
        break;
      case 'gamma':
        if (this.agent.gamma !== undefined) {
          this.agent.gamma = value;
        }
        break;
      case 'epsilon':
        if (this.agent.policy && this.agent.policy.setEpsilon) {
          this.agent.policy.setEpsilon(value);
        }
        break;
      case 'epsilonDecay':
        if (this.agent.policy && this.agent.policy.setDecay) {
          this.agent.policy.setDecay(value);
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
  wrapAgent<S, A>(agent: any, env?: any): any {
    const wrapper = this;
    this.agent = agent;
    this.env = env;

    const originalTrain = agent.train.bind(agent);

    agent.trainInteractive = async function (config: any) {
      // Start dashboard
      wrapper.dashboard.start();
      wrapper.dashboard.log('Interactive training started');

      // Set initial parameters
      const control = wrapper.dashboard.getControl();
      wrapper.targetEpisodes = control.targetEpisodes;
      wrapper.continuousMode = control.continuousMode;

      // Initialize dashboard parameters
      wrapper.dashboard.setParameters({
        alpha: agent.alpha || 0.1,
        gamma: agent.gamma || 0.95,
        epsilon: agent.policy?.getEpsilon ? agent.policy.getEpsilon() : 1.0,
        epsilonDecay: agent.policy?.getDecay ? agent.policy.getDecay() : 0.99,
      });

      // Training loop with interactive control
      let episodesCompleted = 0;
      let trainingCompleted = false;

      while (!wrapper.shouldStop) {
        // Check for pause
        while (wrapper.isPaused && !wrapper.shouldStop && !wrapper.shouldReset) {
          await wrapper.sleep(100);
        }

        // Check for reset (can happen even after completion)
        if (wrapper.shouldReset) {
          wrapper.shouldReset = false;
          trainingCompleted = false;
          episodesCompleted = 0;
          wrapper.currentEpisode = 0;
          wrapper.totalReward = 0;

          // Store current parameter values before reset
          const currentAlpha = agent.alpha;
          const currentGamma = agent.gamma;
          const currentEpsilon = agent.policy?.getEpsilon ? agent.policy.getEpsilon() : undefined;

          // Reset Q-table if available
          if (agent.q && agent.q.reset) {
            agent.q.reset();
          }

          // Reset policy but keep epsilon value
          if (agent.policy && agent.policy.reset) {
            agent.policy.reset();
            // Restore epsilon after reset if it was modified
            if (currentEpsilon !== undefined && agent.policy.setEpsilon) {
              agent.policy.setEpsilon(currentEpsilon);
            }
          }

          // Restore learning parameters
          agent.alpha = currentAlpha;
          agent.gamma = currentGamma;

          wrapper.dashboard.log('Training reset - Q-table cleared, parameters retained');
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
          await wrapper.sleep(100);
          continue;
        }

        // Run one episode
        const episodeConfig = {
          episodes: 1,
          maxStepsPerEpisode: config.maxStepsPerEpisode || 100,
          onEpisodeEnd: (info: any) => {
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
            if (episodesCompleted % 100 === 0) {
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
        wrapper.episodeStarted = false;

        // Run single episode
        originalTrain(episodeConfig);

        // Update target episodes from dashboard
        wrapper.targetEpisodes = wrapper.dashboard.getTargetEpisodes();

        // Small delay to prevent UI blocking
        await wrapper.sleep(1);
      }

      // No need for separate completion message here since it's handled in the loop
      // Just keep waiting for stop command
    };

    // Also keep the original train method
    agent.trainOriginal = originalTrain;

    return agent;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  stop() {
    this.shouldStop = true;
    this.dashboard.stop();
  }
}
