import { randomUUID } from 'node:crypto';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { pinoHttp } from 'pino-http';
import swaggerUi from 'swagger-ui-express';
import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { asyncHandler } from './lib/async-handler.js';
import { prisma } from './lib/prisma.js';
import { errorHandler, notFoundHandler } from './middleware/error-handler.js';
import { openApiDocument } from './openapi.js';
import { authRouter } from './routes/auth.js';
import { ordersRouter } from './routes/orders.js';
import { productsRouter } from './routes/products.js';
import { usersRouter } from './routes/users.js';

export function createApp() {
  const app = express();
  app.disable('x-powered-by');

  app.use((request, response, next) => {
    const incoming = request.get('x-request-id');
    const requestId = incoming && incoming.length <= 100 ? incoming : randomUUID();
    response.setHeader('x-request-id', requestId);
    next();
  });
  app.use(pinoHttp({ logger }));
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          baseUri: ["'self'"],
          connectSrc: ["'self'"],
          fontSrc: ["'self'", 'data:'],
          formAction: ["'self'"],
          frameAncestors: ["'none'"],
          imgSrc: ["'self'", 'data:'],
          objectSrc: ["'none'"],
          scriptSrc: ["'self'"],
          scriptSrcAttr: ["'none'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          upgradeInsecureRequests: env.NODE_ENV === 'production' ? [] : null,
        },
      },
    }),
  );
  app.use(cors({ origin: env.APP_ORIGIN, credentials: true }));
  app.use(express.json({ limit: '100kb' }));
  app.use(express.urlencoded({ extended: false, limit: '20kb' }));
  app.use(cookieParser());
  app.get('/openapi.json', (_request, response) => response.json(openApiDocument));
  app.use('/docs', swaggerUi.serve, swaggerUi.setup(openApiDocument));

  const api = express.Router();
  api.get('/health', (_request, response) => {
    response.json({ data: { status: 'ok', timestamp: new Date().toISOString() } });
  });
  api.get(
    '/readiness',
    asyncHandler(async (_request, response) => {
      try {
        await prisma.$queryRaw`SELECT 1`;
        response.json({ data: { status: 'ready', database: 'available' } });
      } catch {
        response.status(503).json({
          error: {
            code: 'NOT_READY',
            message: 'Banco de dados indisponível.',
            requestId: response.getHeader('x-request-id'),
          },
        });
      }
    }),
  );
  api.use('/auth', authRouter);
  api.use('/products', productsRouter);
  api.use('/users', usersRouter);
  api.use('/orders', ordersRouter);
  app.use('/api/v1', api);

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
