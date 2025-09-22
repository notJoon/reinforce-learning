import { Dashboard } from './dashboard.js';
import { TrainingMetrics } from './types.js';

export interface AgentWithDashboard<S, A> {
  train(config: {
    episodes: number;
    maxStepsPerEpisode: number;
    onEpisodeEnd?: (info: any) => void;
    onUpdate?: (state: S, action: A, reward: number, nextState: S) => void;
  }): void;
}

export class DashboardWrapper {
  private dashboard: Dashboard;
  private currentEpisode: number = 0;
  private currentStep: number = 0;
  private episodeReward: number = 0;
  private totalReward: number = 0;
  private episodeStarted: boolean = false;
  
  constructor(dashboardConfig?: any) {
    this.dashboard = new Dashboard(dashboardConfig);
  }
  
  /**
   * Wraps the agent's train method to inject dashboard updates
   */
  wrapAgent<S, A>(agent: any): AgentWithDashboard<S, A> {
    const wrapper = this;
    const originalTrain = agent.train.bind(agent);
    
    agent.train = function(config: any) {
      // Start dashboard
      wrapper.dashboard.start();
      wrapper.dashboard.log('Training started');
      
      // Wrap callbacks
      const originalOnEpisodeEnd = config.onEpisodeEnd;
      const originalOnUpdate = config.onUpdate;
      
      config.onEpisodeEnd = function(info: any) {
        wrapper.currentEpisode = info.episode;
        wrapper.currentStep = 0;
        wrapper.episodeReward = 0;
        wrapper.episodeStarted = false;
        wrapper.totalReward += info.totalReward;
        
        const metrics: TrainingMetrics = {
          episode: info.episode,
          step: info.steps,
          totalReward: wrapper.totalReward,
          episodeReward: info.totalReward,
          epsilon: agent.policy?.getEpsilon ? agent.policy.getEpsilon() : undefined,
          alpha: agent.alpha,
          terminated: info.terminated,
          truncated: info.truncated || false,
          timestamp: Date.now()
        };
        
        wrapper.dashboard.update(metrics);
        
        // Log milestones
        if ((info.episode + 1) % 100 === 0) {
          wrapper.dashboard.log(`Episode ${info.episode + 1} completed - Reward: ${info.totalReward.toFixed(2)}`);
        }
        
        if (originalOnEpisodeEnd) {
          originalOnEpisodeEnd(info);
        }
      };
      
      config.onUpdate = function(state: S, action: A, reward: number, nextState: S) {
        // Check if this is the start of a new episode
        if (!wrapper.episodeStarted) {
          wrapper.episodeStarted = true;
          wrapper.currentStep = 0;
          wrapper.episodeReward = 0;
        }
        
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
          timestamp: Date.now()
        };
        
        wrapper.dashboard.update(metrics);
        
        if (originalOnUpdate) {
          originalOnUpdate(state, action, reward, nextState);
        }
      };
      
      // Run original training
      try {
        originalTrain(config);
        wrapper.dashboard.log('Training completed successfully');
      } catch (error) {
        wrapper.dashboard.log(`Training error: ${error}`);
        throw error;
      }
    };
    
    return agent as AgentWithDashboard<S, A>;
  }
  
  stop() {
    this.dashboard.stop();
  }
}