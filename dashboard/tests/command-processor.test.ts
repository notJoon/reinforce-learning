import { CommandProcessor } from '../src/controllers/command-processor';

describe('CommandProcessor', () => {
  let processor: CommandProcessor;
  let mockQuitHandler: jest.Mock;
  let mockSaveHandler: jest.Mock;
  let mockHelpHandler: jest.Mock;

  beforeEach(() => {
    processor = new CommandProcessor();
    mockQuitHandler = jest.fn();
    mockSaveHandler = jest.fn();
    mockHelpHandler = jest.fn();

    processor.registerCommand(':q', mockQuitHandler);
    processor.registerCommand(':w', mockSaveHandler);
    processor.registerCommand(':h', mockHelpHandler);
  });

  describe('Command processing', () => {
    it('should process :q command', () => {
      const result = processor.processCommand(':q');
      expect(result.success).toBe(true);
      expect(mockQuitHandler).toHaveBeenCalled();
    });

    it('should process :quit alias as :q', () => {
      const result = processor.processCommand(':quit');
      expect(result.success).toBe(true);
      expect(mockQuitHandler).toHaveBeenCalled();
    });

    it('should handle empty command', () => {
      const result = processor.processCommand(':');
      expect(result.success).toBe(true);
      expect(mockQuitHandler).not.toHaveBeenCalled();
    });

    it('should handle unknown command', () => {
      const result = processor.processCommand(':unknown');
      expect(result.success).toBe(false);
      expect(result.message).toContain('Unknown command');
    });

    it('should trim whitespace', () => {
      const result = processor.processCommand('  :q  ');
      expect(result.success).toBe(true);
      expect(mockQuitHandler).toHaveBeenCalled();
    });

    it('should handle command errors', () => {
      const errorHandler = jest.fn(() => {
        throw new Error('Test error');
      });
      processor.registerCommand(':error', errorHandler);

      const result = processor.processCommand(':error');
      expect(result.success).toBe(false);
      expect(result.message).toContain('Command failed');
    });
  });

  describe('Aliases', () => {
    it('should register and use custom alias', () => {
      processor.registerAlias(':exit', ':q');
      const result = processor.processCommand(':exit');
      expect(result.success).toBe(true);
      expect(mockQuitHandler).toHaveBeenCalled();
    });

    it('should handle :save as :w', () => {
      const result = processor.processCommand(':save');
      expect(result.success).toBe(true);
      expect(mockSaveHandler).toHaveBeenCalled();
    });

    it('should handle :help as :h', () => {
      const result = processor.processCommand(':help');
      expect(result.success).toBe(true);
      expect(mockHelpHandler).toHaveBeenCalled();
    });
  });

  describe('Help and listing', () => {
    it('should list available commands', () => {
      const commands = processor.getAvailableCommands();
      expect(commands).toContain(':q');
      expect(commands).toContain(':w');
      expect(commands).toContain(':h');
    });

    it('should provide command help', () => {
      const help = processor.getCommandHelp();
      expect(help).toContain(':q');
      expect(help).toContain('Quit');
      expect(help).toContain(':w');
      expect(help).toContain('Save');
    });
  });
});
