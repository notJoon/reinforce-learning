import blessed from 'blessed';
import contrib from 'blessed-contrib';
import { TrainingMetrics, DashboardConfig, TrainingStats } from './types.js';

export class Dashboard {
  private screen: blessed.Widgets.Screen;
  private grid: any;
  private widgets: {
    episodePlot: any;
    rewardPlot: any;
    infoBox: any;
    statsTable: any;
    log: any;
  };
  
  private config: Required<DashboardConfig>;
  private stats: TrainingStats;
  private isRunning: boolean = false;
  
  constructor(config: DashboardConfig = {}) {
    this.config = {
      refreshRate: config.refreshRate ?? 100,
      historyLength: config.historyLength ?? 100,
      movingAverageWindow: config.movingAverageWindow ?? 10
    };
    
    this.stats = {
      episodes: 0,
      totalSteps: 0,
      avgReward: 0,
      maxReward: -Infinity,
      minReward: Infinity,
      successRate: 0,
      rewardHistory: [],
      epsilonHistory: [],
      stepsHistory: []
    };
    
    this.screen = blessed.screen({
      smartCSR: true,
      title: 'RL Training Dashboard'
    });
    
    this.grid = new contrib.grid({ rows: 12, cols: 12, screen: this.screen });
    
    this.widgets = this.createWidgets();
    this.setupEventHandlers();
  }
  
  private createWidgets() {
    // Episode reward plot (top left - larger)
    const rewardPlot = this.grid.set(0, 0, 5, 8, contrib.line, {
      style: {
        line: 'yellow',
        text: 'green',
        baseline: 'black'
      },
      xLabelPadding: 3,
      xPadding: 5,
      label: ' Episode Rewards ',
      showLegend: true
    });
    
    // Stats table (top right)
    const statsTable = this.grid.set(0, 8, 5, 4, contrib.table, {
      keys: false,
      fg: 'white',
      selectedFg: 'white',
      selectedBg: 'blue',
      interactive: false,
      label: ' Training Statistics ',
      width: '30%',
      height: '30%',
      border: { type: 'line', fg: 'cyan' },
      columnSpacing: 3,
      columnWidth: [15, 15]
    });
    
    // Episode progress plot (middle left)
    const episodePlot = this.grid.set(5, 0, 4, 8, contrib.line, {
      style: {
        line: 'cyan',
        text: 'green',
        baseline: 'black'
      },
      xLabelPadding: 3,
      xPadding: 5,
      label: ' Steps per Episode ',
      showLegend: false
    });
    
    // Info box (middle right)
    const infoBox = this.grid.set(5, 8, 4, 4, blessed.box, {
      label: ' Current Episode ',
      content: '',
      tags: true,
      border: { type: 'line', fg: 'cyan' }
    });
    
    // Log output (bottom)
    const log = this.grid.set(9, 0, 3, 12, contrib.log, {
      fg: 'green',
      selectedFg: 'green',
      label: ' Training Log '
    });
    
    return { episodePlot, rewardPlot, infoBox, statsTable, log };
  }
  
  private setupEventHandlers() {
    this.screen.key(['escape', 'q', 'C-c'], () => {
      this.stop();
      process.exit(0);
    });
  }
  
  start() {
    this.isRunning = true;
    this.screen.render();
  }
  
  stop() {
    this.isRunning = false;
  }
  
  update(metrics: TrainingMetrics) {
    if (!this.isRunning) return;
    
    // Update stats
    this.stats.totalSteps++;
    
    // Episode completed
    if (metrics.step === 0 || this.stats.episodes < metrics.episode) {
      if (metrics.episode > 0) {
        this.stats.episodes = metrics.episode;
        this.stats.rewardHistory.push(metrics.episodeReward);
        this.stats.stepsHistory.push(metrics.step);
        
        if (metrics.epsilon !== undefined) {
          this.stats.epsilonHistory.push(metrics.epsilon);
        }
        
        // Keep history limited
        if (this.stats.rewardHistory.length > this.config.historyLength) {
          this.stats.rewardHistory.shift();
          this.stats.stepsHistory.shift();
          if (this.stats.epsilonHistory.length > 0) {
            this.stats.epsilonHistory.shift();
          }
        }
        
        // Update statistics
        this.updateStatistics(metrics);
      }
    }
    
    // Update visualizations
    this.updatePlots();
    this.updateInfoBox(metrics);
    this.updateStatsTable();
    
    this.screen.render();
  }
  
  private updateStatistics(metrics: TrainingMetrics) {
    const recentRewards = this.stats.rewardHistory.slice(-this.config.movingAverageWindow);
    this.stats.avgReward = recentRewards.reduce((a, b) => a + b, 0) / recentRewards.length;
    this.stats.maxReward = Math.max(this.stats.maxReward, metrics.episodeReward);
    this.stats.minReward = Math.min(this.stats.minReward, metrics.episodeReward);
    
    if (metrics.terminated) {
      const successWindow = Math.min(100, this.stats.episodes);
      const recentSuccesses = this.stats.rewardHistory.slice(-successWindow)
        .filter(r => r > 0).length;
      this.stats.successRate = recentSuccesses / successWindow;
    }
  }
  
  private updatePlots() {
    // Reward plot
    const x = Array.from({ length: this.stats.rewardHistory.length }, (_, i) => 
      String(this.stats.episodes - this.stats.rewardHistory.length + i + 1));
    
    const rewardData = {
      title: 'Reward',
      x: x,
      y: this.stats.rewardHistory,
      style: { line: 'yellow' }
    };
    
    // Moving average
    const movingAvg = this.calculateMovingAverage(this.stats.rewardHistory);
    const avgData = {
      title: 'Moving Avg',
      x: x,
      y: movingAvg,
      style: { line: 'green' }
    };
    
    this.widgets.rewardPlot.setData([rewardData, avgData]);
    
    // Steps plot
    const stepsData = {
      title: 'Steps',
      x: x,
      y: this.stats.stepsHistory,
      style: { line: 'cyan' }
    };
    
    this.widgets.episodePlot.setData([stepsData]);
  }
  
  private calculateMovingAverage(data: number[]): number[] {
    const result: number[] = [];
    for (let i = 0; i < data.length; i++) {
      const start = Math.max(0, i - this.config.movingAverageWindow + 1);
      const window = data.slice(start, i + 1);
      result.push(window.reduce((a, b) => a + b, 0) / window.length);
    }
    return result;
  }
  
  private updateInfoBox(metrics: TrainingMetrics) {
    const content = [
      `{bold}Episode:{/bold} ${metrics.episode}`,
      `{bold}Step:{/bold} ${metrics.step}`,
      `{bold}Episode Reward:{/bold} ${metrics.episodeReward.toFixed(2)}`,
      `{bold}Total Reward:{/bold} ${metrics.totalReward.toFixed(2)}`,
      metrics.epsilon !== undefined ? `{bold}Epsilon:{/bold} ${metrics.epsilon.toFixed(4)}` : '',
      metrics.alpha !== undefined ? `{bold}Learning Rate:{/bold} ${metrics.alpha.toFixed(4)}` : '',
      `{bold}Status:{/bold} ${metrics.terminated ? '{green-fg}Success{/}' : metrics.truncated ? '{yellow-fg}Truncated{/}' : '{cyan-fg}Running{/}'}`
    ].filter(Boolean).join('\n');
    
    this.widgets.infoBox.setContent(content);
  }
  
  private updateStatsTable() {
    const data = [
      ['Metric', 'Value'],
      ['Episodes', String(this.stats.episodes)],
      ['Total Steps', String(this.stats.totalSteps)],
      ['Avg Reward', this.stats.avgReward.toFixed(2)],
      ['Max Reward', this.stats.maxReward === -Infinity ? 'N/A' : this.stats.maxReward.toFixed(2)],
      ['Min Reward', this.stats.minReward === Infinity ? 'N/A' : this.stats.minReward.toFixed(2)],
      ['Success Rate', `${(this.stats.successRate * 100).toFixed(1)}%`]
    ];
    
    this.widgets.statsTable.setData({ headers: ['Metric', 'Value'], data: data.slice(1) });
  }
  
  log(message: string) {
    if (this.isRunning) {
      this.widgets.log.log(message);
    }
  }
}