/**
 * Result type for command processing
 */
export interface CommandResult {
  readonly success: boolean;
  readonly message?: string;
}

/**
 * Processes command-line style commands
 */
export class CommandProcessor {
  private commandHandlers: Map<string, () => void> = new Map();
  private commandAliases: Map<string, string> = new Map();

  constructor() {
    this.setupDefaultAliases();
  }

  private setupDefaultAliases(): void {
    this.commandAliases.set(':quit', ':q');
    this.commandAliases.set(':save', ':w');
    this.commandAliases.set(':help', ':h');
  }

  registerCommand(command: string, handler: () => void): void {
    this.commandHandlers.set(command, handler);
  }

  registerAlias(alias: string, command: string): void {
    this.commandAliases.set(alias, command);
  }

  processCommand(input: string): CommandResult {
    const trimmed = input.trim();

    // Empty command
    if (trimmed === ':' || trimmed === '') {
      return { success: true };
    }

    // Resolve aliases
    const command = this.commandAliases.get(trimmed) || trimmed;

    // Execute handler
    const handler = this.commandHandlers.get(command);
    if (handler) {
      try {
        handler();
        return { success: true };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return {
          success: false,
          message: `Command failed: ${errorMessage}`,
        };
      }
    }

    return {
      success: false,
      message: `Unknown command: ${trimmed}`,
    };
  }

  getAvailableCommands(): string[] {
    return Array.from(this.commandHandlers.keys());
  }

  getCommandHelp(): string {
    const commands = [
      ':q - Quit the application',
      ':w - Save current state (not implemented)',
      ':h - Show this help',
      ':r - Reset training',
      'Esc - Cancel command mode',
    ];
    return commands.join('\n');
  }

  hasCommand(command: string): boolean {
    const resolved = this.commandAliases.get(command) || command;
    return this.commandHandlers.has(resolved);
  }
}
