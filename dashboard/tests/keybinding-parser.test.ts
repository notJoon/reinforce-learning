import { KeybindingParser } from '../src/controllers/keybinding-parser';
import { KeyBinding } from '../src/controllers/keyboard-handler';

describe('KeybindingParser', () => {
  describe('Line parsing', () => {
    it('should parse simple key binding', () => {
      const binding = KeybindingParser.parseLine('space -> togglePause # Pause/Resume');

      expect(binding).toEqual({
        key: 'space',
        action: 'togglePause',
        description: 'Pause/Resume',
        condition: undefined,
        modifiers: undefined,
      });
    });

    it('should parse binding with modifiers', () => {
      const binding = KeybindingParser.parseLine('ctrl+s -> saveState # Save state');

      expect(binding).toEqual({
        key: 's',
        modifiers: ['ctrl'],
        action: 'saveState',
        description: 'Save state',
      });
    });

    it('should parse binding with multiple modifiers', () => {
      const binding = KeybindingParser.parseLine('ctrl+shift+r -> hardReset # Hard reset');

      expect(binding).toEqual({
        key: 'r',
        modifiers: ['ctrl', 'shift'],
        action: 'hardReset',
        description: 'Hard reset',
        condition: undefined,
      });
    });

    it('should parse binding with condition', () => {
      const binding = KeybindingParser.parseLine('p -> pause !paused # Pause when not paused');

      expect(binding).toBeDefined();
      expect(binding?.action).toBe('pause');
      expect(binding?.condition).toBeDefined();
    });

    it('should skip comments and empty lines', () => {
      const content = `
# This is a comment
space -> togglePause

# Another comment
r -> reset
`;
      const bindings = KeybindingParser.parseContent(content);

      expect(bindings).toHaveLength(2);
      expect(bindings[0].action).toBe('togglePause');
      expect(bindings[1].action).toBe('reset');
    });

    it('should throw error for invalid format', () => {
      expect(() => {
        KeybindingParser.parseLine('invalid format');
      }).toThrow('Invalid format');
    });
  });

  describe('Content parsing', () => {
    it('should parse multiple bindings', () => {
      const content = `
space -> togglePause # Pause/Resume
r -> reset # Reset
1 -> decreaseAlpha # Decrease alpha
2 -> increaseAlpha # Increase alpha
`;
      const bindings = KeybindingParser.parseContent(content);

      expect(bindings).toHaveLength(4);
      expect(bindings.map((b) => b.action)).toEqual([
        'togglePause',
        'reset',
        'decreaseAlpha',
        'increaseAlpha',
      ]);
    });

    it('should handle various key formats', () => {
      const content = `
+ -> increase # Plus key
= -> increase # Equal as alternative
- -> decrease # Minus key
* -> multiply # Asterisk
: -> command # Colon
escape -> exit # Escape key
`;
      const bindings = KeybindingParser.parseContent(content);

      expect(bindings).toHaveLength(6);
      expect(bindings[0].key).toBe('+');
      expect(bindings[1].key).toBe('=');
      expect(bindings[5].key).toBe('escape');
    });
  });

  describe('Validation', () => {
    it('should detect key conflicts', () => {
      const bindings: KeyBinding[] = [
        { key: 'space', action: 'pause' },
        { key: 'space', action: 'resume' },
        { key: 'r', action: 'reset' },
      ];

      const errors = KeybindingParser.validateBindings(bindings);

      expect(errors).toHaveLength(1);
      expect(errors[0]).toContain('Conflict');
      expect(errors[0]).toContain('space');
    });

    it('should detect conflicts with modifiers', () => {
      const bindings: KeyBinding[] = [
        { key: 's', modifiers: ['ctrl'], action: 'save' },
        { key: 's', modifiers: ['ctrl'], action: 'saveAs' },
      ];

      const errors = KeybindingParser.validateBindings(bindings);

      expect(errors).toHaveLength(1);
      expect(errors[0]).toContain('ctrl+s');
    });

    it('should not report false conflicts', () => {
      const bindings: KeyBinding[] = [
        { key: 's', action: 'stop' },
        { key: 's', modifiers: ['ctrl'], action: 'save' },
        { key: 's', modifiers: ['shift'], action: 'saveAs' },
      ];

      const errors = KeybindingParser.validateBindings(bindings);

      expect(errors).toHaveLength(0);
    });
  });

  describe('Export functionality', () => {
    it('should export bindings to text format', () => {
      const bindings: KeyBinding[] = [
        {
          key: 'space',
          action: 'togglePause',
          description: 'Pause/Resume',
        },
        {
          key: 's',
          modifiers: ['ctrl'],
          action: 'save',
          description: 'Save file',
        },
        {
          key: ['=', '+'],
          action: 'increase',
          description: 'Increase value',
        },
      ];

      const exported = KeybindingParser.exportToText(bindings);

      expect(exported).toContain('space -> togglePause # Pause/Resume');
      expect(exported).toContain('ctrl+s -> save # Save file');
      expect(exported).toContain('= -> increase # Increase value');
      expect(exported).toContain('+ -> increase # Increase value');
    });
  });

  describe('Real configuration file', () => {
    it('should parse actual keybindings.txt format', () => {
      const configContent = `
# Control Commands
space -> togglePause !completed # Pause/Resume training
r -> reset # Reset training
c -> toggleContinuousMode # Toggle mode

# Parameter Adjustments
1 -> decreaseAlpha # Decrease α by 0.01
2 -> increaseAlpha # Increase α by 0.01

# Episode Control  
+ -> increaseEpisodes # Increase target
= -> increaseEpisodes # Alternative for +
- -> decreaseEpisodes # Decrease target

# Modifiers
shift+1 -> decreaseAlphaLarge # Decrease α by 0.1
ctrl+s -> saveState # Save state
ctrl+shift+r -> hardReset # Hard reset
`;

      const bindings = KeybindingParser.parseContent(configContent);

      // Count total bindings
      expect(bindings.length).toBeGreaterThan(10);

      // Check specific bindings
      const spaceBinding = bindings.find((b) => b.key === 'space');
      expect(spaceBinding?.action).toBe('togglePause');
      expect(spaceBinding?.condition).toBeDefined();

      const ctrlSBinding = bindings.find((b) => b.key === 's' && b.modifiers?.includes('ctrl'));
      expect(ctrlSBinding?.action).toBe('saveState');

      // Check alternative keys
      const plusBinding = bindings.find((b) => b.key === '+');
      const equalBinding = bindings.find((b) => b.key === '=');
      expect(plusBinding?.action).toBe('increaseEpisodes');
      expect(equalBinding?.action).toBe('increaseEpisodes');
    });
  });
});
