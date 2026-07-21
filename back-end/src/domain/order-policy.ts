import { OrderStatus, Prisma, Role } from '@prisma/client';
import { AppError } from '../lib/errors.js';

const transitions: Partial<Record<OrderStatus, { role: Role; next: OrderStatus }>> = {
  [OrderStatus.PENDING]: { role: Role.seller, next: OrderStatus.PREPARING },
  [OrderStatus.PREPARING]: { role: Role.seller, next: OrderStatus.IN_TRANSIT },
  [OrderStatus.IN_TRANSIT]: { role: Role.customer, next: OrderStatus.DELIVERED },
};

export function validateTransition(current: OrderStatus, next: OrderStatus, role: Role): void {
  const expected = transitions[current];
  if (!expected || expected.role !== role || expected.next !== next) {
    throw new AppError(
      409,
      'INVALID_STATUS_TRANSITION',
      'Esta transição de status não é permitida.',
    );
  }
}

export function calculateOrderTotal(
  items: Array<{ unitPrice: Prisma.Decimal | string | number; quantity: number }>,
): Prisma.Decimal {
  return items.reduce(
    (total, item) => total.add(new Prisma.Decimal(item.unitPrice).mul(item.quantity)),
    new Prisma.Decimal(0),
  );
}
