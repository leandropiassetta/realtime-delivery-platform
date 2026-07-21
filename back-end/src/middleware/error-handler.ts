import type { ErrorRequestHandler, RequestHandler } from 'express';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';
import { AppError } from '../lib/errors.js';

export const notFoundHandler: RequestHandler = (request, _response, next) => {
  next(
    new AppError(404, 'ROUTE_NOT_FOUND', `Rota ${request.method} ${request.path} não encontrada.`),
  );
};

export const errorHandler: ErrorRequestHandler = (error, request, response, _next) => {
  const requestId = response.getHeader('x-request-id');

  if (error instanceof ZodError) {
    response.status(422).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Os dados enviados são inválidos.',
        details: error.flatten(),
        requestId,
      },
    });
    return;
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
    response.status(409).json({
      error: { code: 'CONFLICT', message: 'O registro já existe.', requestId },
    });
    return;
  }

  if (error instanceof AppError) {
    response.status(error.status).json({
      error: {
        code: error.code,
        message: error.message,
        ...(error.details === undefined ? {} : { details: error.details }),
        requestId,
      },
    });
    return;
  }

  logger.error({ err: error, requestId, path: request.path }, 'Erro não tratado');
  response.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'Não foi possível concluir a operação.',
      requestId,
      ...(env.NODE_ENV === 'development' ? { details: 'Consulte os logs da API.' } : {}),
    },
  });
};
