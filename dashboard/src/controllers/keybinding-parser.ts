import { KeyBinding } from './keyboard-handler.js';
import * as fs from 'fs';

export interface ParsedBinding {
  modifiers: string[];
  key: string;
  action: string;
  condition?: string;
  description?: string;
}

export class KeybindingParser {
  /**
   * Parse keybindings from a text file
   */
  static parseFile(filePath: string): KeyBinding[] {
    const content = fs.readFileSync(filePath, 'utf-8');
    return this.parseContent(content);
  }

  /**
   * Parse keybindings from text content
   */
  static parseContent(content: string): KeyBinding[] {
    const lines = content.split('\n');
    const bindings: KeyBinding[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // Skip empty lines and comments
      if (!line || line.startsWith('#')) {
        continue;
      }

      try {
        const binding = this.parseLine(line, i + 1);
        if (binding) {
          bindings.push(binding);
        }
      } catch (error) {
        throw new Error(`Error parsing line ${i + 1}: ${error}`);
      }
    }

    return bindings;
  }

  /**
   * Parse a single keybinding line
   * Format: [modifiers+]key -> action [condition] # description
   */
  static parseLine(line: string, lineNumber?: number): KeyBinding | null {
    // Remove inline comment
    const commentIndex = line.indexOf('#');
    const description = commentIndex !== -1 ? line.slice(commentIndex + 1).trim() : undefined;
    const mainPart = commentIndex !== -1 ? line.slice(0, commentIndex).trim() : line;

    // Split by arrow
    const parts = mainPart.split('->');
    if (parts.length !== 2) {
      throw new Error(`Invalid format: expected 'key -> action'`);
    }

    const keyPart = parts[0].trim();
    const actionPart = parts[1].trim();

    // Parse key and modifiers
    const { key, modifiers } = this.parseKeyPart(keyPart);

    // Parse action and condition
    const { action, condition } = this.parseActionPart(actionPart);

    const binding: KeyBinding = {
      key,
      action,
      description,
    };

    if (modifiers.length > 0) {
      binding.modifiers = modifiers;
    }

    if (condition) {
      binding.condition = this.createConditionFunction(condition);
    }

    return binding;
  }

  /**
   * Parse the key part of the binding
   */
  private static parseKeyPart(keyPart: string): { key: string; modifiers: string[] } {
    // Special case for single character keys like +, -, *, etc.
    if (keyPart.length === 1 || !keyPart.includes('+')) {
      return { key: keyPart, modifiers: [] };
    }

    // Check if it's just a plus key
    if (keyPart === '+') {
      return { key: '+', modifiers: [] };
    }

    // For combinations with modifiers
    const validModifiers = ['ctrl', 'alt', 'shift', 'meta', 'cmd'];
    const parts: string[] = [];
    let current = '';

    // Manual parsing to handle + key properly
    const tokens = keyPart.toLowerCase().split('+');

    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];

      if (validModifiers.includes(token)) {
        parts.push(token);
      } else if (i === tokens.length - 1) {
        // Last token is the key
        current = token || '+'; // If empty, it means the key is '+'
      } else if (token === '') {
        // Empty token means we had ++, so the key is +
        if (i === tokens.length - 2) {
          current = '+';
          break;
        }
      } else {
        // Not a valid modifier and not the last token
        throw new Error(`Invalid modifier: ${token}`);
      }
    }

    // If no key was found, the last part is the key
    if (!current && parts.length > 0) {
      current = parts.pop() || '';
    }

    return {
      key: current || keyPart,
      modifiers: parts.filter((m) => validModifiers.includes(m)),
    };
  }

  /**
   * Parse the action part of the binding
   */
  private static parseActionPart(actionPart: string): { action: string; condition?: string } {
    const parts = actionPart.split(/\s+/);

    if (parts.length === 1) {
      return { action: parts[0] };
    }

    // Second part is condition
    return {
      action: parts[0],
      condition: parts.slice(1).join(' '),
    };
  }

  /**
   * Create a condition function from a condition string
   */
  private static createConditionFunction(condition: string): () => boolean {
    // This is a simplified implementation
    // In a real scenario, you'd want a more robust condition evaluator

    // Handle negation
    const isNegated = condition.startsWith('!');
    const conditionName = isNegated ? condition.slice(1) : condition;

    return () => {
      // This would be connected to actual state
      // For testing, we'll return a placeholder
      const conditionStates: { [key: string]: boolean } = {
        paused: false,
        completed: false,
        commandMode: false,
        // Add more conditions as needed
      };

      const result = conditionStates[conditionName] ?? false;
      return isNegated ? !result : result;
    };
  }

  /**
   * Validate keybindings for conflicts
   */
  static validateBindings(bindings: KeyBinding[]): string[] {
    const errors: string[] = [];
    const seen = new Map<string, KeyBinding>();

    for (const binding of bindings) {
      const keys = Array.isArray(binding.key) ? binding.key : [binding.key];

      for (const key of keys) {
        const keyId = this.createKeyId(key, binding.modifiers);

        if (seen.has(keyId)) {
          const existing = seen.get(keyId)!;
          errors.push(
            `Conflict: Key '${keyId}' is bound to both '${existing.action}' and '${binding.action}'`,
          );
        } else {
          seen.set(keyId, binding);
        }
      }
    }

    return errors;
  }

  private static createKeyId(key: string, modifiers?: string[]): string {
    const mods = modifiers ? modifiers.sort().join('+') + '+' : '';
    return mods + key.toLowerCase();
  }

  /**
   * Export bindings to text format
   */
  static exportToText(bindings: KeyBinding[]): string {
    const lines: string[] = [
      '# Exported Keybindings',
      '# Generated at: ' + new Date().toISOString(),
      '',
    ];

    for (const binding of bindings) {
      const keys = Array.isArray(binding.key) ? binding.key : [binding.key];

      for (const key of keys) {
        let line = '';

        // Add modifiers
        if (binding.modifiers && binding.modifiers.length > 0) {
          line += binding.modifiers.join('+') + '+';
        }

        // Add key
        line += key;

        // Add arrow and action
        line += ' -> ' + binding.action;

        // Add description as comment
        if (binding.description) {
          line += ' # ' + binding.description;
        }

        lines.push(line);
      }
    }

    return lines.join('\n');
  }
}
