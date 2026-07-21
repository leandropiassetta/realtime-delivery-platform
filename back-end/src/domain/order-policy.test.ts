import { OrderStatus, Role } from '@prisma/client';
import { describe, expect, it } from 'vitest';
import { calculateOrderTotal, validateTransition } from './order-policy.js';

describe('order policy', () => {
  it.each([
    [OrderStatus.PENDING, OrderStatus.PREPARING, Role.seller],
    [OrderStatus.PREPARING, OrderStatus.IN_TRANSIT, Role.seller],
    [OrderStatus.IN_TRANSIT, OrderStatus.DELIVERED, Role.customer],
  ])('permite %s → %s para %s', (current, next, role) => {
    expect(() => validateTransition(current, next, role)).not.toThrow();
  });

  it.each([
    [OrderStatus.PENDING, OrderStatus.IN_TRANSIT, Role.seller],
    [OrderStatus.PREPARING, OrderStatus.PENDING, Role.seller],
    [OrderStatus.IN_TRANSIT, OrderStatus.DELIVERED, Role.seller],
    [OrderStatus.DELIVERED, OrderStatus.PENDING, Role.customer],
  ])('bloqueia transição inválida %s → %s para %s', (current, next, role) => {
    expect(() => validateTransition(current, next, role)).toThrowError(
      expect.objectContaining({ code: 'INVALID_STATUS_TRANSITION', status: 409 }),
    );
  });

  it('calcula o total sem ponto flutuante', () => {
    expect(
      calculateOrderTotal([
        { unitPrice: '2.20', quantity: 3 },
        { unitPrice: '7.50', quantity: 2 },
      ]).toFixed(2),
    ).toBe('21.60');
  });
});
