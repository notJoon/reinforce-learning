import { TrainingController } from '../src/controllers/training-controller';
import { ControlCommand } from '../src/types';

describe('TrainingController', () => {
  let controller: TrainingController;
  let mockCallbacks: {
    onParameterChange: jest.Mock;
    onControlCommand: jest.Mock;
    onStatusChange: jest.Mock;
  };

  beforeEach(() => {
    controller = new TrainingController();
    mockCallbacks = {
      onParameterChange: jest.fn(),
      onControlCommand: jest.fn(),
      onStatusChange: jest.fn(),
    };
    controller.setCallbacks(mockCallbacks);
  });

  describe('Pause/Resume functionality', () => {
    it('should pause when not completed', () => {
      controller.pause();
      expect(controller.isPaused()).toBe(true);
      expect(mockCallbacks.onControlCommand).toHaveBeenCalledWith(ControlCommand.PAUSE);
      expect(mockCallbacks.onStatusChange).toHaveBeenCalledWith('PAUSED');
    });

    it('should resume when paused', () => {
      controller.pause();
      controller.resume();
      expect(controller.isPaused()).toBe(false);
      expect(mockCallbacks.onControlCommand).toHaveBeenCalledWith(ControlCommand.RESUME);
      expect(mockCallbacks.onStatusChange).toHaveBeenCalledWith('RUNNING');
    });

    it('should not pause when completed', () => {
      controller.setCompleted();
      controller.pause();
      expect(controller.isPaused()).toBe(false);
      expect(mockCallbacks.onControlCommand).not.toHaveBeenCalledWith(ControlCommand.PAUSE);
    });

    it('should toggle pause state', () => {
      controller.togglePause();
      expect(controller.isPaused()).toBe(true);
      controller.togglePause();
      expect(controller.isPaused()).toBe(false);
    });
  });

  describe('Reset functionality', () => {
    it('should reset from completed state', () => {
      controller.setCompleted();
      controller.pause();

      controller.reset();

      expect(controller.isCompleted()).toBe(false);
      expect(controller.isPaused()).toBe(false);
      expect(mockCallbacks.onControlCommand).toHaveBeenCalledWith(ControlCommand.RESET);
      expect(mockCallbacks.onStatusChange).toHaveBeenCalledWith('RUNNING');
    });

    it('should preserve parameters after reset', () => {
      controller.adjustAlpha(0.05);
      controller.adjustGamma(0.02);

      const beforeReset = controller.getControl();
      controller.reset();
      const afterReset = controller.getControl();

      expect(afterReset.parameters.alpha).toBe(beforeReset.parameters.alpha);
      expect(afterReset.parameters.gamma).toBe(beforeReset.parameters.gamma);
    });
  });

  describe('Parameter adjustments', () => {
    it('should adjust alpha within bounds', () => {
      controller.adjustAlpha(0.05);
      expect(controller.getParameter('alpha')).toBeCloseTo(0.15);
      expect(mockCallbacks.onParameterChange).toHaveBeenCalled();

      // Test upper bound
      controller.adjustAlpha(10);
      expect(controller.getParameter('alpha')).toBe(1.0);

      // Test lower bound
      controller.adjustAlpha(-10);
      expect(controller.getParameter('alpha')).toBe(0.001);
    });

    it('should adjust gamma within bounds', () => {
      controller.adjustGamma(-0.05);
      expect(controller.getParameter('gamma')).toBeCloseTo(0.9);
      expect(mockCallbacks.onParameterChange).toHaveBeenCalled();

      // Test bounds
      controller.adjustGamma(-10);
      expect(controller.getParameter('gamma')).toBe(0.0);

      controller.adjustGamma(10);
      expect(controller.getParameter('gamma')).toBe(1.0);
    });

    it('should adjust epsilon within bounds', () => {
      controller.adjustEpsilon(-0.5);
      expect(controller.getParameter('epsilon')).toBe(0.5);
      expect(mockCallbacks.onParameterChange).toHaveBeenCalledWith('epsilon', 0.5);
    });

    it('should adjust epsilon decay if present', () => {
      controller.adjustEpsilonDecay(0.01);
      expect(controller.getParameter('epsilonDecay')).toBe(1.0);

      controller.adjustEpsilonDecay(-0.05);
      expect(controller.getParameter('epsilonDecay')).toBe(0.95);
    });
  });

  describe('Episode management', () => {
    it('should adjust target episodes', () => {
      controller.adjustTargetEpisodes(10);
      expect(controller.getTargetEpisodes()).toBe(110);

      controller.adjustTargetEpisodes(-50);
      expect(controller.getTargetEpisodes()).toBe(60);

      // Should not go below 1
      controller.adjustTargetEpisodes(-100);
      expect(controller.getTargetEpisodes()).toBe(1);
    });

    it('should multiply target episodes', () => {
      controller.multiplyTargetEpisodes(2);
      expect(controller.getTargetEpisodes()).toBe(200);

      controller.multiplyTargetEpisodes(0.5);
      expect(controller.getTargetEpisodes()).toBe(100);
    });
  });

  describe('Continuous mode', () => {
    it('should toggle continuous mode', () => {
      expect(controller.isContinuousMode()).toBe(false);

      controller.toggleContinuousMode();
      expect(controller.isContinuousMode()).toBe(true);
      expect(mockCallbacks.onControlCommand).toHaveBeenCalledWith(ControlCommand.CONTINUOUS_MODE);

      controller.toggleContinuousMode();
      expect(controller.isContinuousMode()).toBe(false);
      expect(mockCallbacks.onControlCommand).toHaveBeenCalledWith(ControlCommand.FIXED_MODE);
    });
  });

  describe('Stop functionality', () => {
    it('should trigger stop command', () => {
      controller.stop();
      expect(mockCallbacks.onControlCommand).toHaveBeenCalledWith(ControlCommand.STOP);
      expect(mockCallbacks.onStatusChange).toHaveBeenCalledWith('STOPPED');
    });
  });
});
