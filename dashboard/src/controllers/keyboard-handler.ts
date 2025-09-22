/**
 * Handles keyboard shortcuts and key combinations
 */
export interface KeyBinding {
  key: string | string[];
  modifiers?: string[];
  action: string;
  description?: string;
  condition?: () => boolean;
}

export class KeyboardHandler {
  private keyBindings: Map<string, KeyBinding> = new Map();
  private actionHandlers: Map<string, () => void> = new Map();
  private enabled: boolean = true;

  constructor() {
    this.setupDefaultBindings();
  }

  private setupDefaultBindings(): void {
    // Default key bindings - can be overridden
    this.addBinding({
      key: 'space',
      action: 'togglePause',
      description: 'Pause/Resume training',
    });

    this.addBinding({
      key: 'r',
      action: 'reset',
      description: 'Reset training',
    });

    this.addBinding({
      key: 'c',
      action: 'toggleContinuousMode',
      description: 'Toggle continuous mode',
    });

    this.addBinding({
      key: 's',
      action: 'stop',
      description: 'Stop training',
    });

    // Parameter adjustments
    this.addBinding({ key: '1', action: 'decreaseAlpha', description: 'Decrease α by 0.01' });
    this.addBinding({ key: '2', action: 'increaseAlpha', description: 'Increase α by 0.01' });
    this.addBinding({ key: '3', action: 'decreaseGamma', description: 'Decrease γ by 0.01' });
    this.addBinding({ key: '4', action: 'increaseGamma', description: 'Increase γ by 0.01' });
    this.addBinding({ key: '5', action: 'decreaseEpsilon', description: 'Decrease ε by 0.05' });
    this.addBinding({ key: '6', action: 'increaseEpsilon', description: 'Increase ε by 0.05' });
    this.addBinding({
      key: '7',
      action: 'decreaseEpsilonDecay',
      description: 'Decrease decay by 0.001',
    });
    this.addBinding({
      key: '8',
      action: 'increaseEpsilonDecay',
      description: 'Increase decay by 0.001',
    });

    // Episode control
    this.addBinding({
      key: ['+', '='],
      action: 'increaseEpisodes',
      description: 'Increase episodes by 10',
    });
    this.addBinding({
      key: ['-', '_'],
      action: 'decreaseEpisodes',
      description: 'Decrease episodes by 10',
    });
    this.addBinding({ key: '*', action: 'doubleEpisodes', description: 'Double target episodes' });

    // Command mode
    this.addBinding({ key: ':', action: 'enterCommandMode', description: 'Enter command mode' });
    this.addBinding({ key: 'escape', action: 'exitCommandMode', description: 'Exit command mode' });
  }

  addBinding(binding: KeyBinding): void {
    const keys = Array.isArray(binding.key) ? binding.key : [binding.key];

    for (const key of keys) {
      const keyId = this.createKeyId(key, binding.modifiers);
      this.keyBindings.set(keyId, binding);
    }
  }

  removeBinding(key: string, modifiers?: string[]): void {
    const keyId = this.createKeyId(key, modifiers);
    this.keyBindings.delete(keyId);
  }

  registerAction(action: string, handler: () => void): void {
    this.actionHandlers.set(action, handler);
  }

  unregisterAction(action: string): void {
    this.actionHandlers.delete(action);
  }

  handleKeyPress(key: string, modifiers?: string[]): boolean {
    if (!this.enabled) return false;

    const keyId = this.createKeyId(key, modifiers);
    const binding = this.keyBindings.get(keyId);

    if (!binding) return false;

    // Check condition if exists
    if (binding.condition && !binding.condition()) {
      return false;
    }

    const handler = this.actionHandlers.get(binding.action);
    if (handler) {
      handler();
      return true;
    }

    return false;
  }

  private createKeyId(key: string, modifiers?: string[]): string {
    const mods = modifiers ? modifiers.sort().join('+') + '+' : '';
    return mods + key.toLowerCase();
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  getBindings(): KeyBinding[] {
    return Array.from(new Set(this.keyBindings.values()));
  }

  getBindingForKey(key: string, modifiers?: string[]): KeyBinding | undefined {
    const keyId = this.createKeyId(key, modifiers);
    return this.keyBindings.get(keyId);
  }

  getHelp(): string[] {
    const bindings = this.getBindings();
    const help: string[] = [];
    const seen = new Set<string>();

    for (const binding of bindings) {
      if (binding.description && !seen.has(binding.action)) {
        const keys = Array.isArray(binding.key) ? binding.key.join('/') : binding.key;
        const modStr = binding.modifiers ? binding.modifiers.join('+') + '+' : '';
        help.push(`${modStr}${keys} - ${binding.description}`);
        seen.add(binding.action);
      }
    }

    return help;
  }

  // Load bindings from configuration
  loadFromConfig(config: KeyBinding[]): void {
    // Clear existing non-default bindings
    this.keyBindings.clear();
    this.setupDefaultBindings();

    // Add custom bindings
    for (const binding of config) {
      this.addBinding(binding);
    }
  }

  // Export current bindings
  exportBindings(): KeyBinding[] {
    return this.getBindings();
  }
}
