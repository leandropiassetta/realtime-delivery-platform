import type { Server as HttpServer } from 'node:http';
import { Role } from '@prisma/client';
import { Server as SocketServer } from 'socket.io';
import { z } from 'zod';
import { verifyAccessToken } from './auth/tokens.js';
import { env } from './config/env.js';
import { domainEvents } from './events.js';
import { prisma } from './lib/prisma.js';
import type { OrderDto } from './services/orders.js';

const subscriptionSchema = z.object({ orderId: z.number().int().positive() });

type Acknowledgement = (result: { ok: boolean; error?: string }) => void;

interface ClientToServerEvents {
  'order:subscribe': (payload: unknown, acknowledge?: Acknowledgement) => void;
  'order:unsubscribe': (payload: unknown) => void;
}

interface ServerToClientEvents {
  'order:created': (order: OrderDto) => void;
  'order:updated': (order: OrderDto) => void;
}

interface SocketData {
  user: { id: number; role: Role };
  expiresAt: number;
}

type DeliverySocketServer = SocketServer<
  ClientToServerEvents,
  ServerToClientEvents,
  Record<string, never>,
  SocketData
>;

export function attachRealtime(server: HttpServer): DeliverySocketServer {
  const io = new SocketServer<
    ClientToServerEvents,
    ServerToClientEvents,
    Record<string, never>,
    SocketData
  >(server, {
    cors: { origin: env.APP_ORIGIN, methods: ['GET', 'POST'], credentials: true },
    maxHttpBufferSize: 100_000,
  });

  io.use(async (socket, next) => {
    try {
      const rawToken = socket.handshake.auth.accessToken as unknown;
      if (typeof rawToken !== 'string') return next(new Error('UNAUTHORIZED'));
      const claims = verifyAccessToken(rawToken);
      const user = await prisma.user.findFirst({
        where: { id: Number(claims.sub), active: true, role: claims.role },
        select: { id: true, role: true },
      });
      if (!user) return next(new Error('UNAUTHORIZED'));
      socket.data.user = user;
      socket.data.expiresAt = claims.exp;
      return next();
    } catch {
      return next(new Error('UNAUTHORIZED'));
    }
  });

  io.on('connection', (socket) => {
    const user = socket.data.user;
    void socket.join(`user:${user.id}`);

    const expiresAt = Number(socket.data.expiresAt) * 1_000;
    const expirationTimer = setTimeout(
      () => socket.disconnect(true),
      Math.max(0, expiresAt - Date.now()),
    );
    socket.once('disconnect', () => clearTimeout(expirationTimer));

    socket.on('order:subscribe', async (payload, acknowledge) => {
      try {
        const { orderId } = subscriptionSchema.parse(payload);
        const order = await prisma.order.findUnique({ where: { id: orderId } });
        const authorized =
          order &&
          ((user.role === Role.customer && order.customerId === user.id) ||
            (user.role === Role.seller && order.sellerId === user.id));
        if (!authorized) return acknowledge?.({ ok: false, error: 'FORBIDDEN' });
        await socket.join(`order:${orderId}`);
        return acknowledge?.({ ok: true });
      } catch {
        return acknowledge?.({ ok: false, error: 'INVALID_PAYLOAD' });
      }
    });

    socket.on('order:unsubscribe', (payload) => {
      const parsed = subscriptionSchema.safeParse(payload);
      if (parsed.success) void socket.leave(`order:${parsed.data.orderId}`);
    });
  });

  const emitCreated = (order: OrderDto) => {
    io.to(`user:${order.customer.id}`).to(`user:${order.seller.id}`).emit('order:created', order);
  };
  const emitUpdated = (order: OrderDto) => {
    io.to(`user:${order.customer.id}`)
      .to(`user:${order.seller.id}`)
      .to(`order:${order.id}`)
      .emit('order:updated', order);
  };
  const disconnectUser = (userId: number) => io.in(`user:${userId}`).disconnectSockets(true);

  domainEvents.on('order.created', emitCreated);
  domainEvents.on('order.updated', emitUpdated);
  domainEvents.on('user.deactivated', disconnectUser);
  io.engine.once('close', () => {
    domainEvents.off('order.created', emitCreated);
    domainEvents.off('order.updated', emitUpdated);
    domainEvents.off('user.deactivated', disconnectUser);
  });

  return io;
}
