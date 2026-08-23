import { describe, it, expect } from 'vitest';
import { RateEngineService } from '../services/rate-engine.service';

describe('RateEngineService Unit Tests', () => {
  it('should round numbers half-up to 2 decimal places accurately', () => {
    expect(RateEngineService.round2(10.556)).toBe(10.56);
    expect(RateEngineService.round2(10.554)).toBe(10.55);
    expect(RateEngineService.round2(10.5)).toBe(10.5);
  });

  it('should correctly compute volumetric weight formula L*B*H/5000', () => {
    // 50 x 40 x 30 = 60,000 / 5000 = 12.0 kg
    const volWeight = RateEngineService.calculateVolumetricWeight(50, 40, 30);
    expect(volWeight).toBe(12.0);
  });

  it('should throw an error for non-positive dimensions', () => {
    expect(() => RateEngineService.calculateVolumetricWeight(0, 40, 30)).toThrow('INVALID_DIMENSIONS');
    expect(() => RateEngineService.calculateVolumetricWeight(50, -5, 30)).toThrow('INVALID_DIMENSIONS');
  });
});
