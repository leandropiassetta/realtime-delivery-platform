import { createHash } from 'node:crypto';
import { OrderStatus, Prisma, Role } from '@prisma/client';
import { z } from 'zod';
import { calculateOrderTotal, validateTransition } from '../domain/order-policy.js';
import { domainEvents } from '../events.js';
import { AppError, forbidden, notFound } from '../lib/errors.js';
import { prisma } from '../lib/prisma.js';

export const createOrderSchema = z
  .object({
    sellerId: z.number().int().positive(),
    deliveryAddress: z.string().trim().min(3).max(150),
    deliveryNumber: z.string().trim().min(1).max(30),
    items: z
      .array(
        z
          .object({
            productId: z.number().int().positive(),
            quantity: z.number().int().min(1).max(99),
          })
          .strict(),
      )
      .min(1)
      .max(50)
      .superRefine((items, context) => {
        const ids = items.map((item) => item.productId);
        if (new Set(ids).size !== ids.length) {
          context.addIssue({ code: 'custom', message: 'Produtos duplicados não são permitidos.' });
        }
      }),
  })
  .strict();

export const updateStatusSchema = z.object({ status: z.nativeEnum(OrderStatus) });

export type CreateOrderInput = z.infer<typeof createOrderSchema>;

const orderInclude = {
  customer: { select: { id: true, name: true } },
  seller: { select: { id: true, name: true } },
  items: { include: { product: { select: { name: true, imagePath: true } } } },
} satisfies Prisma.OrderInclude;

type OrderWithRelations = Prisma.OrderGetPayload<{ include: typeof orderInclude }>;

export type OrderDto = {
  id: number;
  customer: { id: number; name: string };
  seller: { id: number; name: string };
  totalPrice: string;
  deliveryAddress: string;
  deliveryNumber: string;
  status: OrderStatus;
  createdAt: string;
  updatedAt: string;
  items: Array<{
    productId: number;
    name: string;
    imagePath: string;
    quantity: number;
    unitPrice: string;
    subtotal: string;
  }>;
};

export function toOrderDto(order: OrderWithRelations): OrderDto {
  return {
    id: order.id,
    customer: order.customer,
    seller: order.seller,
    totalPrice: order.totalPrice.toFixed(2),
    deliveryAddress: order.deliveryAddress,
    deliveryNumber: order.deliveryNumber,
    status: order.status,
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
    items: order.items.map((item) => ({
      productId: item.productId,
      name: item.product.name,
      imagePath: item.product.imagePath,
      quantity: item.quantity,
      unitPrice: item.unitPrice.toFixed(2),
      subtotal: item.unitPrice.mul(item.quantity).toFixed(2),
    })),
  };
}

const canonicalHash = (input: CreateOrderInput): string => {
  const canonical = {
    ...input,
    items: [...input.items].sort((left, right) => left.productId - right.productId),
  };
  return createHash('sha256').update(JSON.stringify(canonical)).digest('hex');
};

async function replayOrder(userId: number, key: string, requestHash: string) {
  const stored = await prisma.idempotencyKey.findUnique({
    where: { userId_key: { userId, key } },
    include: { order: { include: orderInclude } },
  });
  if (!stored) return null;
  if (stored.requestHash !== requestHash) {
    throw new AppError(
      409,
      'IDEMPOTENCY_KEY_REUSED',
      'A chave de idempotência já foi usada com dados diferentes.',
    );
  }
  return toOrderDto(stored.order);
}

export async function createOrder(
  customerId: number,
  input: CreateOrderInput,
  idempotencyKey: string,
): Promise<{ order: OrderDto; replayed: boolean }> {
  const requestHash = canonicalHash(input);
  const replayed = await replayOrder(customerId, idempotencyKey, requestHash);
  if (replayed) return { order: replayed, replayed: true };

  try {
    const created = await prisma.$transaction(async (transaction) => {
      const seller = await transaction.user.findFirst({
        where: { id: input.sellerId, role: Role.seller, active: true },
      });
      if (!seller) throw new AppError(422, 'INVALID_SELLER', 'O vendedor selecionado é inválido.');

      const ids = input.items.map((item) => item.productId);
      const products = await transaction.product.findMany({
        where: { id: { in: ids }, active: true },
      });
      if (products.length !== ids.length) {
        throw new AppError(422, 'INVALID_PRODUCT', 'Um ou mais produtos são inválidos.');
      }

      const productById = new Map(products.map((product) => [product.id, product]));
      const pricedItems = input.items.map((item) => {
        const product = productById.get(item.productId);
        if (!product) throw new AppError(422, 'INVALID_PRODUCT', 'Produto inválido.');
        return { unitPrice: product.price, quantity: item.quantity };
      });
      const total = calculateOrderTotal(pricedItems);

      const order = await transaction.order.create({
        data: {
          customerId,
          sellerId: input.sellerId,
          totalPrice: total,
          deliveryAddress: input.deliveryAddress,
          deliveryNumber: input.deliveryNumber,
          items: {
            create: input.items.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
              unitPrice: productById.get(item.productId)?.price ?? 0,
            })),
          },
        },
        include: orderInclude,
      });

      await transaction.idempotencyKey.create({
        data: { userId: customerId, key: idempotencyKey, requestHash, orderId: order.id },
      });
      return order;
    });

    const dto = toOrderDto(created);
    domainEvents.emit('order.created', dto);
    return { order: dto, replayed: false };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      const existing = await replayOrder(customerId, idempotencyKey, requestHash);
      if (existing) return { order: existing, replayed: true };
    }
    throw error;
  }
}

export async function listOrders(user: { id: number; role: Role }): Promise<OrderDto[]> {
  const where =
    user.role === Role.customer
      ? { customerId: user.id }
      : user.role === Role.seller
        ? { sellerId: user.id }
        : null;
  if (!where) throw forbidden();

  const orders = await prisma.order.findMany({
    where,
    include: orderInclude,
    orderBy: { createdAt: 'desc' },
  });
  return orders.map(toOrderDto);
}

export async function getOrder(id: number, user: { id: number; role: Role }): Promise<OrderDto> {
  const order = await prisma.order.findUnique({ where: { id }, include: orderInclude });
  if (!order) throw notFound('Pedido');
  const owns =
    (user.role === Role.customer && order.customerId === user.id) ||
    (user.role === Role.seller && order.sellerId === user.id);
  if (!owns) throw notFound('Pedido');
  return toOrderDto(order);
}

export async function updateOrderStatus(
  id: number,
  nextStatus: OrderStatus,
  user: { id: number; role: Role },
): Promise<OrderDto> {
  const order = await prisma.order.findUnique({ where: { id } });
  if (!order) throw notFound('Pedido');

  const owns =
    (user.role === Role.customer && order.customerId === user.id) ||
    (user.role === Role.seller && order.sellerId === user.id);
  if (!owns) throw notFound('Pedido');

  validateTransition(order.status, nextStatus, user.role);

  const result = await prisma.order.updateMany({
    where: { id, status: order.status },
    data: { status: nextStatus },
  });
  if (result.count !== 1) {
    throw new AppError(409, 'ORDER_CHANGED', 'O pedido foi atualizado por outra operação.');
  }

  const updated = await prisma.order.findUniqueOrThrow({ where: { id }, include: orderInclude });
  const dto = toOrderDto(updated);
  domainEvents.emit('order.updated', dto);
  return dto;
}
