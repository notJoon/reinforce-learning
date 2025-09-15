/**
 * Unit tests for reward presets
 */

import {
  RewardConfig,
  RewardPreset,
  getRewardPreset,
  calculateReward,
  validateRewardConfig,
} from '../../src/reward';

describe('Reward Presets', () => {
  describe('Preset Configurations', () => {
    it('should have default preset', () => {
      const preset = getRewardPreset('default');

      expect(preset).toBeDefined();
      expect(preset.solve).toBeGreaterThan(0);
      expect(preset.invalid).toBeLessThanOrEqual(0);
      expect(preset.timeout).toBeLessThanOrEqual(0);
      expect(preset.stepCost).toBeLessThanOrEqual(0);
    });

    it('should have shaping-lite preset', () => {
      const preset = getRewardPreset('shaping-lite');

      expect(preset).toBeDefined();
      expect(preset.solve).toBeGreaterThan(0);
      expect(preset.invalid).toBeLessThan(0);
      expect(preset.timeout).toBeLessThan(0);
      expect(preset.stepCost).toBeLessThan(0);
      // Shaping should have smaller penalties than strict
      expect(Math.abs(preset.invalid)).toBeLessThan(10);
    });

    it('should have strict preset', () => {
      const preset = getRewardPreset('strict');

      expect(preset).toBeDefined();
      expect(preset.solve).toBeGreaterThan(0);
      expect(preset.invalid).toBeLessThan(0);
      expect(preset.timeout).toBeLessThan(0);
      expect(preset.stepCost).toBe(0); // No step cost in strict mode
    });

    it('should throw error for unknown preset', () => {
      expect(() => getRewardPreset('unknown' as RewardPreset)).toThrow('Unknown reward preset');
    });
  });

  describe('Reward Calculation', () => {
    const defaultPreset = getRewardPreset('default');
    const shapingPreset = getRewardPreset('shaping-lite');

    it('should calculate solve reward correctly', () => {
      const reward = calculateReward({
        config: defaultPreset,
        event: 'solve',
        shapingEnabled: true,
      });

      expect(reward).toBe(defaultPreset.solve);
    });

    it('should calculate invalid action penalty', () => {
      const reward = calculateReward({
        config: defaultPreset,
        event: 'invalid',
        shapingEnabled: true,
      });

      expect(reward).toBe(defaultPreset.invalid);
    });

    it('should calculate timeout penalty', () => {
      const reward = calculateReward({
        config: defaultPreset,
        event: 'timeout',
        shapingEnabled: true,
      });

      expect(reward).toBe(defaultPreset.timeout);
    });

    it('should calculate step cost when shaping is enabled', () => {
      const reward = calculateReward({
        config: shapingPreset,
        event: 'step',
        shapingEnabled: true,
      });

      expect(reward).toBe(shapingPreset.stepCost);
    });

    it('should not apply step cost when shaping is disabled', () => {
      const reward = calculateReward({
        config: shapingPreset,
        event: 'step',
        shapingEnabled: false,
      });

      expect(reward).toBe(0);
    });

    it('should handle multiple events in one step', () => {
      // Step with invalid action
      const reward = calculateReward({
        config: defaultPreset,
        event: 'step',
        additionalEvents: ['invalid'],
        shapingEnabled: true,
      });

      expect(reward).toBe(defaultPreset.stepCost + defaultPreset.invalid);
    });
  });

  describe('Reward Bounds and Monotonicity', () => {
    const presets: RewardPreset[] = ['default', 'shaping-lite', 'strict'];

    presets.forEach((presetName) => {
      it(`should have bounded rewards for ${presetName} preset`, () => {
        const config = getRewardPreset(presetName);

        // All rewards should be finite
        expect(isFinite(config.solve)).toBe(true);
        expect(isFinite(config.invalid)).toBe(true);
        expect(isFinite(config.timeout)).toBe(true);
        expect(isFinite(config.stepCost)).toBe(true);

        // Solve should always be positive
        expect(config.solve).toBeGreaterThan(0);

        // Penalties should be non-positive
        expect(config.invalid).toBeLessThanOrEqual(0);
        expect(config.timeout).toBeLessThanOrEqual(0);
        expect(config.stepCost).toBeLessThanOrEqual(0);
      });
    });

    it('should maintain reward ordering across presets', () => {
      const defaultConfig = getRewardPreset('default');
      const shapingConfig = getRewardPreset('shaping-lite');
      const strictConfig = getRewardPreset('strict');

      // Solve rewards should be consistent
      expect(defaultConfig.solve).toBe(shapingConfig.solve);
      expect(defaultConfig.solve).toBe(strictConfig.solve);

      // Strict should have harsher invalid penalties than shaping
      expect(Math.abs(strictConfig.invalid)).toBeGreaterThanOrEqual(
        Math.abs(shapingConfig.invalid),
      );
    });
  });

  describe('Custom Reward Configuration', () => {
    it('should allow custom reward configuration', () => {
      const customConfig: RewardConfig = {
        solve: 100,
        invalid: -50,
        timeout: -25,
        stepCost: -2,
      };

      const reward = calculateReward({
        config: customConfig,
        event: 'solve',
        shapingEnabled: true,
      });

      expect(reward).toBe(100);
    });

    it('should validate reward configuration', () => {
      const invalidConfig = {
        solve: -10, // Should be positive
        invalid: 5, // Should be non-positive
        timeout: 10, // Should be non-positive
        stepCost: 1, // Should be non-positive
      };

      expect(() => validateRewardConfig(invalidConfig)).toThrow();
    });
  });
});
