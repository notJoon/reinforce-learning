import { KeyboardHandler } from '../src/controllers/keyboard-handler';

describe('KeyboardHandler', () => {
  let handler: KeyboardHandler;
  let mockActions: { [key: string]: jest.Mock };

  beforeEach(() => {
    handler = new KeyboardHandler();

    // Setup mock action handlers
    mockActions = {
      togglePause: jest.fn(),
      reset: jest.fn(),
      stop: jest.fn(),
      increaseAlpha: jest.fn(),
      decreaseAlpha: jest.fn(),
      increaseGamma: jest.fn(),
      decreaseGamma: jest.fn(),
      increaseEpisodes: jest.fn(),
      decreaseEpisodes: jest.fn(),
      doubleEpisodes: jest.fn(),
      enterCommandMode: jest.fn(),
      exitCommandMode: jest.fn(),
    };

    // Register all mock actions
    for (const [action, mockHandler] of Object.entries(mockActions)) {
      handler.registerAction(action, mockHandler);
    }
  });

  describe('Single key handling', () => {
    it('should handle space key for pause/resume', () => {
      const handled = handler.handleKeyPress('space');
      expect(handled).toBe(true);
      expect(mockActions.togglePause).toHaveBeenCalled();
    });

    it('should handle r key for reset', () => {
      const handled = handler.handleKeyPress('r');
      expect(handled).toBe(true);
      expect(mockActions.reset).toHaveBeenCalled();
    });

    it('should handle s key for stop', () => {
      const handled = handler.handleKeyPress('s');
      expect(handled).toBe(true);
      expect(mockActions.stop).toHaveBeenCalled();
    });

    it('should handle number keys for parameter adjustment', () => {
      handler.handleKeyPress('1');
      expect(mockActions.decreaseAlpha).toHaveBeenCalled();

      handler.handleKeyPress('2');
      expect(mockActions.increaseAlpha).toHaveBeenCalled();

      handler.handleKeyPress('3');
      expect(mockActions.decreaseGamma).toHaveBeenCalled();

      handler.handleKeyPress('4');
      expect(mockActions.increaseGamma).toHaveBeenCalled();
    });

    it('should handle episode control keys', () => {
      handler.handleKeyPress('+');
      expect(mockActions.increaseEpisodes).toHaveBeenCalledTimes(1);

      handler.handleKeyPress('='); // Alternative for +
      expect(mockActions.increaseEpisodes).toHaveBeenCalledTimes(2);

      handler.handleKeyPress('-');
      expect(mockActions.decreaseEpisodes).toHaveBeenCalledTimes(1);

      handler.handleKeyPress('*');
      expect(mockActions.doubleEpisodes).toHaveBeenCalled();
    });

    it('should handle command mode keys', () => {
      handler.handleKeyPress(':');
      expect(mockActions.enterCommandMode).toHaveBeenCalled();

      handler.handleKeyPress('escape');
      expect(mockActions.exitCommandMode).toHaveBeenCalled();
    });
  });

  describe('Key combinations with modifiers', () => {
    it('should handle modifier combinations', () => {
      // Add custom binding with modifiers
      handler.addBinding({
        key: 's',
        modifiers: ['ctrl'],
        action: 'saveState',
      });

      const saveAction = jest.fn();
      handler.registerAction('saveState', saveAction);

      // Should not trigger with just 's'
      handler.handleKeyPress('s');
      expect(saveAction).not.toHaveBeenCalled();
      expect(mockActions.stop).toHaveBeenCalled();

      // Should trigger with Ctrl+S
      handler.handleKeyPress('s', ['ctrl']);
      expect(saveAction).toHaveBeenCalled();
    });

    it('should handle multiple modifiers', () => {
      handler.addBinding({
        key: 'r',
        modifiers: ['ctrl', 'shift'],
        action: 'hardReset',
      });

      const hardResetAction = jest.fn();
      handler.registerAction('hardReset', hardResetAction);

      // Should not trigger with just Ctrl+R
      handler.handleKeyPress('r', ['ctrl']);
      expect(hardResetAction).not.toHaveBeenCalled();

      // Should trigger with Ctrl+Shift+R
      handler.handleKeyPress('r', ['ctrl', 'shift']);
      expect(hardResetAction).toHaveBeenCalled();
    });
  });

  describe('Conditional bindings', () => {
    it('should respect binding conditions', () => {
      let isPaused = false;

      // Remove default 'p' binding if exists
      handler.removeBinding('p');

      // Add conditional pause binding
      handler.addBinding({
        key: 'p',
        action: 'pause',
        condition: () => !isPaused,
      });

      const pauseAction = jest.fn();
      handler.registerAction('pause', pauseAction);

      // When not paused, should trigger pause
      handler.handleKeyPress('p');
      expect(pauseAction).toHaveBeenCalled();

      // Reset mock and change state
      pauseAction.mockClear();
      isPaused = true;

      // When paused, condition fails, should not trigger
      const handled = handler.handleKeyPress('p');
      expect(handled).toBe(false);
      expect(pauseAction).not.toHaveBeenCalled();

      // Now add resume binding for when paused
      handler.addBinding({
        key: 'p',
        action: 'resume',
        condition: () => isPaused,
      });

      const resumeAction = jest.fn();
      handler.registerAction('resume', resumeAction);

      // When paused, should trigger resume
      handler.handleKeyPress('p');
      expect(resumeAction).toHaveBeenCalled();
    });
  });

  describe('Enable/Disable functionality', () => {
    it('should not handle keys when disabled', () => {
      handler.setEnabled(false);

      const handled = handler.handleKeyPress('space');
      expect(handled).toBe(false);
      expect(mockActions.togglePause).not.toHaveBeenCalled();
    });

    it('should handle keys when re-enabled', () => {
      handler.setEnabled(false);
      handler.setEnabled(true);

      const handled = handler.handleKeyPress('space');
      expect(handled).toBe(true);
      expect(mockActions.togglePause).toHaveBeenCalled();
    });
  });

  describe('Unknown keys', () => {
    it('should return false for unbound keys', () => {
      const handled = handler.handleKeyPress('x');
      expect(handled).toBe(false);
    });

    it('should return false for unregistered actions', () => {
      handler.addBinding({
        key: 'z',
        action: 'unknownAction',
      });

      const handled = handler.handleKeyPress('z');
      expect(handled).toBe(false);
    });
  });

  describe('Help generation', () => {
    it('should generate help text', () => {
      const help = handler.getHelp();

      expect(help).toContain('space - Pause/Resume training');
      expect(help).toContain('r - Reset training');
      expect(help).toContain('1 - Decrease α by 0.01');
      expect(help).toContain(': - Enter command mode');
    });
  });

  describe('Binding management', () => {
    it('should add and remove bindings', () => {
      handler.addBinding({
        key: 'x',
        action: 'customAction',
        description: 'Custom action',
      });

      const binding = handler.getBindingForKey('x');
      expect(binding).toBeDefined();
      expect(binding?.action).toBe('customAction');

      handler.removeBinding('x');
      const removed = handler.getBindingForKey('x');
      expect(removed).toBeUndefined();
    });

    it('should handle array of keys for same action', () => {
      const increaseAction = handler.getBindingForKey('+');
      const equalAction = handler.getBindingForKey('=');

      expect(increaseAction?.action).toBe('increaseEpisodes');
      expect(equalAction?.action).toBe('increaseEpisodes');
    });
  });

  describe('Export and load bindings', () => {
    it('should export current bindings', () => {
      const exported = handler.exportBindings();

      expect(exported).toContainEqual(
        expect.objectContaining({
          key: 'space',
          action: 'togglePause',
        }),
      );
    });

    it('should load custom configuration', () => {
      const customConfig = [
        { key: 'q', action: 'quit' },
        { key: 'w', action: 'save' },
      ];

      handler.loadFromConfig(customConfig);

      const qBinding = handler.getBindingForKey('q');
      expect(qBinding?.action).toBe('quit');

      const wBinding = handler.getBindingForKey('w');
      expect(wBinding?.action).toBe('save');

      // Default bindings should still exist
      const spaceBinding = handler.getBindingForKey('space');
      expect(spaceBinding?.action).toBe('togglePause');
    });
  });
});
