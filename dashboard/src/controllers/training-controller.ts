import { TrainingControl, ControlCommand } from '../types.js';

/**
 * Manages training state and control flow
 */
export class TrainingController {
  private control: TrainingControl;
  private completed: boolean = false;
  private callbacks: {
    onParameterChange?: (param: string, value: number) => void;
    onControlCommand?: (command: ControlCommand) => void;
    onStatusChange?: (status: string) => void;
  } = {};

  constructor(initialControl?: Partial<TrainingControl>) {
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
      ...initialControl,
    };
  }

  // Getters
  isPaused(): boolean {
    return this.control.isPaused;
  }

  isContinuousMode(): boolean {
    return this.control.continuousMode;
  }

  isCompleted(): boolean {
    return this.completed;
  }

  getTargetEpisodes(): number {
    return this.control.targetEpisodes;
  }

  getControl(): TrainingControl {
    return { ...this.control };
  }

  getParameter(name: keyof TrainingControl['parameters']): number | undefined {
    return this.control.parameters[name];
  }

  // Control commands
  pause(): void {
    if (!this.completed) {
      this.control.isPaused = true;
      this.triggerCommand(ControlCommand.PAUSE);
      this.triggerStatusChange('PAUSED');
    }
  }

  resume(): void {
    if (!this.completed) {
      this.control.isPaused = false;
      this.triggerCommand(ControlCommand.RESUME);
      this.triggerStatusChange('RUNNING');
    }
  }

  togglePause(): void {
    if (this.control.isPaused) {
      this.resume();
    } else {
      this.pause();
    }
  }

  reset(): void {
    this.completed = false;
    this.control.isPaused = false;
    this.triggerCommand(ControlCommand.RESET);
    this.triggerStatusChange('RUNNING');
  }

  stop(): void {
    this.triggerCommand(ControlCommand.STOP);
    this.triggerStatusChange('STOPPED');
  }

  setCompleted(): void {
    this.completed = true;
    this.triggerStatusChange('COMPLETED');
  }

  toggleContinuousMode(): void {
    this.control.continuousMode = !this.control.continuousMode;
    const command = this.control.continuousMode
      ? ControlCommand.CONTINUOUS_MODE
      : ControlCommand.FIXED_MODE;
    this.triggerCommand(command);
  }

  // Episode management
  adjustTargetEpisodes(delta: number): void {
    this.control.targetEpisodes = Math.max(1, this.control.targetEpisodes + delta);
  }

  multiplyTargetEpisodes(factor: number): void {
    this.control.targetEpisodes = Math.max(1, Math.round(this.control.targetEpisodes * factor));
  }

  // Parameter adjustments with bounds checking
  adjustAlpha(delta: number): void {
    const newValue = Math.max(0.001, Math.min(1.0, this.control.parameters.alpha + delta));
    if (newValue !== this.control.parameters.alpha) {
      this.control.parameters.alpha = newValue;
      this.triggerParameterChange('alpha', newValue);
    }
  }

  adjustGamma(delta: number): void {
    const newValue = Math.max(0.0, Math.min(1.0, this.control.parameters.gamma + delta));
    if (newValue !== this.control.parameters.gamma) {
      this.control.parameters.gamma = newValue;
      this.triggerParameterChange('gamma', newValue);
    }
  }

  adjustEpsilon(delta: number): void {
    const newValue = Math.max(0.0, Math.min(1.0, this.control.parameters.epsilon + delta));
    if (newValue !== this.control.parameters.epsilon) {
      this.control.parameters.epsilon = newValue;
      this.triggerParameterChange('epsilon', newValue);
    }
  }

  adjustEpsilonDecay(delta: number): void {
    if (this.control.parameters.epsilonDecay !== undefined) {
      const newValue = Math.max(0.9, Math.min(1.0, this.control.parameters.epsilonDecay + delta));
      if (newValue !== this.control.parameters.epsilonDecay) {
        this.control.parameters.epsilonDecay = newValue;
        this.triggerParameterChange('epsilonDecay', newValue);
      }
    }
  }

  setParameter(name: keyof TrainingControl['parameters'], value: number): void {
    const oldValue = this.control.parameters[name];
    if (oldValue !== value) {
      this.control.parameters[name] = value;
      this.triggerParameterChange(name, value);
    }
  }

  // Callbacks
  setCallbacks(callbacks: {
    onParameterChange?: (param: string, value: number) => void;
    onControlCommand?: (command: ControlCommand) => void;
    onStatusChange?: (status: string) => void;
  }): void {
    this.callbacks = callbacks;
  }

  private triggerParameterChange(param: string, value: number): void {
    if (this.callbacks.onParameterChange) {
      this.callbacks.onParameterChange(param, value);
    }
  }

  private triggerCommand(command: ControlCommand): void {
    if (this.callbacks.onControlCommand) {
      this.callbacks.onControlCommand(command);
    }
  }

  private triggerStatusChange(status: string): void {
    if (this.callbacks.onStatusChange) {
      this.callbacks.onStatusChange(status);
    }
  }
}
