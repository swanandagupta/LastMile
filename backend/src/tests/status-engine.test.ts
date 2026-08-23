import { describe, it, expect } from 'vitest';
import { StatusEngineService } from '../services/status-engine.service';
import { OrderStatus } from '../types';

describe('StatusEngineService Unit Tests', () => {
  it('should enforce strictly valid forward transitions for delivery agents', () => {
    expect(StatusEngineService.isValidAgentTransition(OrderStatus.BOOKED, OrderStatus.PICKED_UP)).toBe(true);
    expect(StatusEngineService.isValidAgentTransition(OrderStatus.PICKED_UP, OrderStatus.IN_TRANSIT)).toBe(true);
    expect(StatusEngineService.isValidAgentTransition(OrderStatus.IN_TRANSIT, OrderStatus.OUT_FOR_DELIVERY)).toBe(true);
    expect(StatusEngineService.isValidAgentTransition(OrderStatus.OUT_FOR_DELIVERY, OrderStatus.DELIVERED)).toBe(true);
    expect(StatusEngineService.isValidAgentTransition(OrderStatus.OUT_FOR_DELIVERY, OrderStatus.FAILED)).toBe(true);
  });

  it('should reject invalid or skipped forward transitions for delivery agents', () => {
    // Skipping step
    expect(StatusEngineService.isValidAgentTransition(OrderStatus.BOOKED, OrderStatus.OUT_FOR_DELIVERY)).toBe(false);
    // Backward transition
    expect(StatusEngineService.isValidAgentTransition(OrderStatus.IN_TRANSIT, OrderStatus.BOOKED)).toBe(false);
    // Transition from terminal state
    expect(StatusEngineService.isValidAgentTransition(OrderStatus.DELIVERED, OrderStatus.OUT_FOR_DELIVERY)).toBe(false);
  });
});
