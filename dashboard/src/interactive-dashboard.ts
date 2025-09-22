import blessed from 'blessed';
import contrib from 'blessed-contrib';
import {
  TrainingMetrics,
  DashboardConfig,
  TrainingStats,
  ControlCommand,
  TrainingControl,
} from './types.js';

export class InteractiveDashboard {
  private screen: blessed.Widgets.Screen;
  private grid: any;
  private widgets: {
    episodePlot: any;
    rewardPlot: any;
    infoBox: any;
    statsTable: any;
    log: any;
    controlPanel: any;
    parameterForm: any;
    helpBox: any;
    commandInput?: any;
  };

  private config: Required<DashboardConfig>;
  private stats: TrainingStats;
  private control: TrainingControl;
  private isRunning: boolean = false;
  private isCompleted: boolean = false;
  private commandMode: boolean = false;
  private commandBuffer: string = '';

  // Callbacks
  private onParameterChange?: (param: string, value: number) => void;
  private onControlCommand?: (command: ControlCommand) => void;

  constructor(config: DashboardConfig = {}) {
    this.config = {
      refreshRate: config.refreshRate ?? 100,
      historyLength: config.historyLength ?? 100,
      movingAverageWindow: config.movingAverageWindow ?? 10,
      enableControls: config.enableControls ?? true,
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
      stepsHistory: [],
    };

    this.control = {
      isPaused: false,
      continuousMode: false,
      targetEpisodes: 100,
      maxStepsPerEpisode: 100,
      parameters: {
        alpha: 0.1,
        gamma: 0.95,
        epsilon: 1.0,
        epsilonDecay: 0.99,
      },
    };

    this.screen = blessed.screen({
      smartCSR: true,
      title: 'RL Training Dashboard - Interactive Mode',
      fullUnicode: true,
    });

    this.grid = new contrib.grid({ rows: 12, cols: 12, screen: this.screen });

    this.widgets = this.createWidgets();
    this.setupEventHandlers();
  }

  private createWidgets() {
    // Episode reward plot (top left - smaller to make room for controls)
    const rewardPlot = this.grid.set(0, 0, 4, 6, contrib.line, {
      style: {
        line: 'yellow',
        text: 'green',
        baseline: 'black',
      },
      xLabelPadding: 3,
      xPadding: 5,
      label: ' Episode Rewards ',
      showLegend: true,
    });

    // Control panel (top middle)
    const controlPanel = this.grid.set(0, 6, 4, 3, blessed.box, {
      label: ' Control Panel ',
      tags: true,
      border: { type: 'line', fg: 'cyan' },
      style: {
        focus: { border: { fg: 'yellow' } },
      },
      keys: true,
      vi: true,
      focusable: true,
      content: this.getControlPanelContent(),
    });

    // Stats table (top right)
    const statsTable = this.grid.set(0, 9, 4, 3, contrib.table, {
      keys: false,
      fg: 'white',
      selectedFg: 'white',
      selectedBg: 'blue',
      interactive: false,
      label: ' Training Statistics ',
      border: { type: 'line', fg: 'cyan' },
      columnSpacing: 3,
      columnWidth: [12, 10],
    });

    // Episode progress plot (middle left)
    const episodePlot = this.grid.set(4, 0, 3, 6, contrib.line, {
      style: {
        line: 'cyan',
        text: 'green',
        baseline: 'black',
      },
      xLabelPadding: 3,
      xPadding: 5,
      label: ' Steps per Episode ',
      showLegend: false,
    });

    // Parameter form (middle middle)
    const parameterForm = this.grid.set(4, 6, 3, 3, blessed.box, {
      label: ' Parameters ',
      tags: true,
      border: { type: 'line', fg: 'cyan' },
      style: {
        focus: { border: { fg: 'yellow' } },
      },
      focusable: true,
      content: this.getParameterContent(),
    });

    // Info box (middle right)
    const infoBox = this.grid.set(4, 9, 3, 3, blessed.box, {
      label: ' Current Episode ',
      content: '',
      tags: true,
      border: { type: 'line', fg: 'cyan' },
    });

    // Log output (bottom left)
    const log = this.grid.set(7, 0, 4, 9, contrib.log, {
      fg: 'green',
      selectedFg: 'green',
      label: ' Training Log ',
    });

    // Help box (bottom right)
    const helpBox = this.grid.set(7, 9, 5, 3, blessed.box, {
      label: ' Help ',
      tags: true,
      border: { type: 'line', fg: 'cyan' },
      content: this.getHelpContent(),
    });

    // Command input (hidden by default)
    const commandInput = blessed.textbox({
      parent: this.screen,
      top: '95%',
      left: 0,
      width: '50%',
      height: 1,
      style: {
        fg: 'white',
        bg: 'black',
      },
      hidden: true,
      inputOnFocus: true,
    });

    // Status bar (very bottom)
    const statusBar = this.grid.set(11, 0, 1, 9, blessed.box, {
      tags: true,
      style: {
        fg: 'white',
        bg: 'blue',
      },
      content:
        ' {bold}Status:{/bold} Ready | Press {yellow-fg}:{/} for commands | {yellow-fg}Tab{/} to navigate | {yellow-fg}:q{/} to quit ',
    });

    return {
      episodePlot,
      rewardPlot,
      infoBox,
      statsTable,
      log,
      controlPanel,
      parameterForm,
      helpBox,
      commandInput,
    };
  }

  private getControlPanelContent(): string {
    const status = this.isCompleted
      ? '{blue-fg}COMPLETED{/}'
      : this.control.isPaused
        ? '{red-fg}PAUSED{/}'
        : '{green-fg}RUNNING{/}';
    const mode = this.control.continuousMode
      ? 'Continuous'
      : `Fixed (${this.control.targetEpisodes})`;

    return [
      `{bold}Status:{/bold} ${status}`,
      `{bold}Mode:{/bold} ${mode}`,
      `{bold}Episodes:{/bold} ${this.stats.episodes}`,
      '',
      '{yellow-fg}Commands:{/}',
      '[{cyan-fg}Space{/}] Pause/Resume',
      '[{cyan-fg}r{/}] Reset',
      '[{cyan-fg}c{/}] Toggle Mode',
      '[{cyan-fg}+/-{/}] Episodes ±10',
      '[{cyan-fg}s{/}] Stop',
      '[{cyan-fg}:{/}] Commands',
    ].join('\n');
  }

  private getParameterContent(): string {
    return [
      `{bold}Learning Rate (α):{/}`,
      `  ${this.control.parameters.alpha.toFixed(3)} [{cyan-fg}1/2{/}]`,
      '',
      `{bold}Discount (γ):{/}`,
      `  ${this.control.parameters.gamma.toFixed(3)} [{cyan-fg}3/4{/}]`,
      '',
      `{bold}Epsilon (ε):{/}`,
      `  ${this.control.parameters.epsilon.toFixed(3)} [{cyan-fg}5/6{/}]`,
      '',
      `{bold}ε Decay:{/}`,
      `  ${this.control.parameters.epsilonDecay?.toFixed(4) || 'N/A'} [{cyan-fg}7/8{/}]`,
    ].join('\n');
  }

  private getHelpContent(): string {
    return [
      '{yellow-fg}{bold}Navigation:{/}',
      '{cyan-fg}Tab{/} - Next widget',
      '{cyan-fg}S-Tab{/} - Prev widget',
      '',
      '{yellow-fg}{bold}Control:{/}',
      '{cyan-fg}Space{/} - Pause/Resume',
      '{cyan-fg}r{/} - Reset training',
      '{cyan-fg}c{/} - Continuous mode',
      '{cyan-fg}s{/} - Stop training',
      '',
      '{yellow-fg}{bold}Parameters:{/}',
      '{cyan-fg}1/2{/} - α ±0.01',
      '{cyan-fg}3/4{/} - γ ±0.01',
      '{cyan-fg}5/6{/} - ε ±0.05',
      '{cyan-fg}7/8{/} - decay ±0.001',
      '',
      '{yellow-fg}{bold}Episodes:{/}',
      '{cyan-fg}+/-{/} - Target ±10',
      '{cyan-fg}*{/} - Target ×2',
      '',
      '{yellow-fg}{bold}Commands:{/}',
      '{cyan-fg}:{/} - Enter command',
      '{cyan-fg}:q{/} - Quit',
      '{cyan-fg}Esc{/} - Cancel command',
    ].join('\n');
  }

  private setupEventHandlers() {
    // Command mode trigger
    this.screen.key([':'], () => {
      this.enterCommandMode();
    });

    // Escape key - cancel command mode or nothing
    this.screen.key(['escape'], () => {
      if (this.commandMode) {
        this.exitCommandMode();
      }
    });

    // Ctrl+C still works as emergency exit
    this.screen.key(['C-c'], () => {
      if (this.onControlCommand) {
        this.onControlCommand(ControlCommand.STOP);
      }
      this.stop();
      process.exit(0);
    });

    // Tab navigation
    this.screen.key(['tab'], () => {
      this.screen.focusNext();
    });

    this.screen.key(['S-tab'], () => {
      this.screen.focusPrevious();
    });

    // Control commands
    this.screen.key(['space'], () => {
      // Don't allow pause/resume if completed
      if (!this.isCompleted) {
        this.control.isPaused = !this.control.isPaused;
        const command = this.control.isPaused ? ControlCommand.PAUSE : ControlCommand.RESUME;
        if (this.onControlCommand) {
          this.onControlCommand(command);
        }
        this.updateControlPanel();
        this.log(`Training ${this.control.isPaused ? 'paused' : 'resumed'}`);
      }
    });

    this.screen.key(['r'], () => {
      // Allow reset even when completed
      this.isCompleted = false;
      this.control.isPaused = false;
      if (this.onControlCommand) {
        this.onControlCommand(ControlCommand.RESET);
      }
      this.resetStats();
      this.log('Training reset - ready to start again');
      this.updateControlPanel();
    });

    this.screen.key(['c'], () => {
      this.control.continuousMode = !this.control.continuousMode;
      const command = this.control.continuousMode
        ? ControlCommand.CONTINUOUS_MODE
        : ControlCommand.FIXED_MODE;
      if (this.onControlCommand) {
        this.onControlCommand(command);
      }
      this.updateControlPanel();
      this.log(`Mode: ${this.control.continuousMode ? 'Continuous' : 'Fixed'}`);
    });

    this.screen.key(['s'], () => {
      if (this.onControlCommand) {
        this.onControlCommand(ControlCommand.STOP);
      }
      this.log('Training stopped');
    });

    // Episode control
    this.screen.key(['+', '='], () => {
      this.control.targetEpisodes += 10;
      this.updateControlPanel();
      this.log(`Target episodes: ${this.control.targetEpisodes}`);
    });

    this.screen.key(['-', '_'], () => {
      this.control.targetEpisodes = Math.max(10, this.control.targetEpisodes - 10);
      this.updateControlPanel();
      this.log(`Target episodes: ${this.control.targetEpisodes}`);
    });

    this.screen.key(['*'], () => {
      this.control.targetEpisodes *= 2;
      this.updateControlPanel();
      this.log(`Target episodes: ${this.control.targetEpisodes}`);
    });

    // Parameter adjustments
    this.screen.key(['1'], () => {
      this.control.parameters.alpha = Math.max(0.001, this.control.parameters.alpha - 0.01);
      if (this.onParameterChange) {
        this.onParameterChange('alpha', this.control.parameters.alpha);
      }
      this.updateParameterPanel();
      this.log(`Alpha: ${this.control.parameters.alpha.toFixed(3)}`);
    });

    this.screen.key(['2'], () => {
      this.control.parameters.alpha = Math.min(1.0, this.control.parameters.alpha + 0.01);
      if (this.onParameterChange) {
        this.onParameterChange('alpha', this.control.parameters.alpha);
      }
      this.updateParameterPanel();
      this.log(`Alpha: ${this.control.parameters.alpha.toFixed(3)}`);
    });

    this.screen.key(['3'], () => {
      this.control.parameters.gamma = Math.max(0.0, this.control.parameters.gamma - 0.01);
      if (this.onParameterChange) {
        this.onParameterChange('gamma', this.control.parameters.gamma);
      }
      this.updateParameterPanel();
      this.log(`Gamma: ${this.control.parameters.gamma.toFixed(3)}`);
    });

    this.screen.key(['4'], () => {
      this.control.parameters.gamma = Math.min(1.0, this.control.parameters.gamma + 0.01);
      if (this.onParameterChange) {
        this.onParameterChange('gamma', this.control.parameters.gamma);
      }
      this.updateParameterPanel();
      this.log(`Gamma: ${this.control.parameters.gamma.toFixed(3)}`);
    });

    this.screen.key(['5'], () => {
      this.control.parameters.epsilon = Math.max(0.0, this.control.parameters.epsilon - 0.05);
      if (this.onParameterChange) {
        this.onParameterChange('epsilon', this.control.parameters.epsilon);
      }
      this.updateParameterPanel();
      this.log(`Epsilon: ${this.control.parameters.epsilon.toFixed(3)}`);
    });

    this.screen.key(['6'], () => {
      this.control.parameters.epsilon = Math.min(1.0, this.control.parameters.epsilon + 0.05);
      if (this.onParameterChange) {
        this.onParameterChange('epsilon', this.control.parameters.epsilon);
      }
      this.updateParameterPanel();
      this.log(`Epsilon: ${this.control.parameters.epsilon.toFixed(3)}`);
    });

    this.screen.key(['7'], () => {
      if (this.control.parameters.epsilonDecay) {
        this.control.parameters.epsilonDecay = Math.max(
          0.9,
          this.control.parameters.epsilonDecay - 0.001,
        );
        if (this.onParameterChange) {
          this.onParameterChange('epsilonDecay', this.control.parameters.epsilonDecay);
        }
        this.updateParameterPanel();
        this.log(`Epsilon decay: ${this.control.parameters.epsilonDecay.toFixed(4)}`);
      }
    });

    this.screen.key(['8'], () => {
      if (this.control.parameters.epsilonDecay) {
        this.control.parameters.epsilonDecay = Math.min(
          1.0,
          this.control.parameters.epsilonDecay + 0.001,
        );
        if (this.onParameterChange) {
          this.onParameterChange('epsilonDecay', this.control.parameters.epsilonDecay);
        }
        this.updateParameterPanel();
        this.log(`Epsilon decay: ${this.control.parameters.epsilonDecay.toFixed(4)}`);
      }
    });
  }

  setCallbacks(callbacks: {
    onParameterChange?: (param: string, value: number) => void;
    onControlCommand?: (command: ControlCommand) => void;
  }) {
    this.onParameterChange = callbacks.onParameterChange;
    this.onControlCommand = callbacks.onControlCommand;
  }

  start() {
    this.isRunning = true;
    this.screen.render();
  }

  stop() {
    this.isRunning = false;
  }

  isPaused(): boolean {
    return this.control.isPaused;
  }

  isContinuousMode(): boolean {
    return this.control.continuousMode;
  }

  getTargetEpisodes(): number {
    return this.control.targetEpisodes;
  }

  getControl(): TrainingControl {
    return { ...this.control };
  }

  setParameters(params: Partial<TrainingControl['parameters']>) {
    Object.assign(this.control.parameters, params);
    this.updateParameterPanel();
  }

  private updateControlPanel() {
    this.widgets.controlPanel.setContent(this.getControlPanelContent());
    this.screen.render();
  }

  private updateParameterPanel() {
    this.widgets.parameterForm.setContent(this.getParameterContent());
    this.screen.render();
  }

  private resetStats() {
    this.stats = {
      episodes: 0,
      totalSteps: 0,
      avgReward: 0,
      maxReward: -Infinity,
      minReward: Infinity,
      successRate: 0,
      rewardHistory: [],
      epsilonHistory: [],
      stepsHistory: [],
    };
    this.updatePlots();
    this.updateStatsTable();
  }

  update(metrics: TrainingMetrics) {
    if (!this.isRunning) return;

    // Update current parameters if provided
    if (metrics.epsilon !== undefined) {
      this.control.parameters.epsilon = metrics.epsilon;
    }
    if (metrics.alpha !== undefined) {
      this.control.parameters.alpha = metrics.alpha;
    }

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
    this.updateControlPanel();
    this.updateParameterPanel();

    this.screen.render();
  }

  private updateStatistics(metrics: TrainingMetrics) {
    const recentRewards = this.stats.rewardHistory.slice(-this.config.movingAverageWindow);
    this.stats.avgReward = recentRewards.reduce((a, b) => a + b, 0) / recentRewards.length;
    this.stats.maxReward = Math.max(this.stats.maxReward, metrics.episodeReward);
    this.stats.minReward = Math.min(this.stats.minReward, metrics.episodeReward);

    if (metrics.terminated) {
      const successWindow = Math.min(100, this.stats.episodes);
      const recentSuccesses = this.stats.rewardHistory
        .slice(-successWindow)
        .filter((r) => r > 0).length;
      this.stats.successRate = recentSuccesses / successWindow;
    }
  }

  private updatePlots() {
    // Reward plot
    const x = Array.from({ length: this.stats.rewardHistory.length }, (_, i) =>
      String(this.stats.episodes - this.stats.rewardHistory.length + i + 1),
    );

    const rewardData = {
      title: 'Reward',
      x: x,
      y: this.stats.rewardHistory,
      style: { line: 'yellow' },
    };

    // Moving average
    const movingAvg = this.calculateMovingAverage(this.stats.rewardHistory);
    const avgData = {
      title: 'Moving Avg',
      x: x,
      y: movingAvg,
      style: { line: 'green' },
    };

    this.widgets.rewardPlot.setData([rewardData, avgData]);

    // Steps plot
    const stepsData = {
      title: 'Steps',
      x: x,
      y: this.stats.stepsHistory,
      style: { line: 'cyan' },
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
      `{bold}Status:{/bold} ${metrics.terminated ? '{green-fg}Success{/}' : metrics.truncated ? '{yellow-fg}Truncated{/}' : '{cyan-fg}Running{/}'}`,
    ]
      .filter(Boolean)
      .join('\n');

    this.widgets.infoBox.setContent(content);
  }

  private updateStatsTable() {
    const data = [
      ['Episodes', String(this.stats.episodes)],
      ['Total Steps', String(this.stats.totalSteps)],
      ['Avg Reward', this.stats.avgReward.toFixed(2)],
      ['Max Reward', this.stats.maxReward === -Infinity ? 'N/A' : this.stats.maxReward.toFixed(2)],
      ['Min Reward', this.stats.minReward === Infinity ? 'N/A' : this.stats.minReward.toFixed(2)],
      ['Success Rate', `${(this.stats.successRate * 100).toFixed(1)}%`],
    ];

    this.widgets.statsTable.setData({ headers: ['Metric', 'Value'], data: data });
  }

  log(message: string) {
    if (this.isRunning) {
      this.widgets.log.log(message);
    }
  }

  setCompleted() {
    this.isCompleted = true;
    this.updateControlPanel();
  }

  private enterCommandMode() {
    this.commandMode = true;
    this.commandBuffer = ':';

    if (this.widgets.commandInput) {
      this.widgets.commandInput.show();
      this.widgets.commandInput.setValue(':');
      this.widgets.commandInput.focus();

      // Handle command input
      this.widgets.commandInput.on('submit', (value: string) => {
        this.processCommand(value);
        this.exitCommandMode();
      });

      // Handle cancel
      this.widgets.commandInput.on('cancel', () => {
        this.exitCommandMode();
      });
    }

    this.screen.render();
  }

  private exitCommandMode() {
    this.commandMode = false;
    this.commandBuffer = '';

    if (this.widgets.commandInput) {
      this.widgets.commandInput.hide();
      this.widgets.commandInput.setValue('');
      this.widgets.commandInput.removeAllListeners('submit');
      this.widgets.commandInput.removeAllListeners('cancel');
    }

    this.screen.render();
  }

  private processCommand(command: string) {
    const cmd = command.trim();

    if (cmd === ':q' || cmd === ':quit') {
      this.log('Exiting...');
      if (this.onControlCommand) {
        this.onControlCommand(ControlCommand.STOP);
      }
      this.stop();
      setTimeout(() => process.exit(0), 100);
    } else if (cmd === ':w' || cmd === ':save') {
      this.log('Save feature not implemented yet');
    } else if (cmd === ':h' || cmd === ':help') {
      this.log('Commands: :q (quit), :w (save), :h (help)');
    } else if (cmd !== ':') {
      this.log(`Unknown command: ${cmd}`);
    }
  }
}
