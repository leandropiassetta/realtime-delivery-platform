import { Router, type CookieOptions, type RequestHandler } from 'express';
import { rateLimit } from 'express-rate-limit';
import { Role } from '@prisma/client';
import { z } from 'zod';
import { revokeSession, rotateSession, type SessionResult } from '../auth/session-service.js';
import { env } from '../config/env.js';
import { asyncHandler } from '../lib/async-handler.js';
import { AppError, unauthorized } from '../lib/errors.js';
import { login, registerCustomer } from '../services/users.js';

const credentialsSchema = z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(8).max(128),
});

const registerSchema = credentialsSchema
  .extend({ name: z.string().trim().min(2).max(100) })
  .strict();

const cookieName = 'refresh_token';
const cookieOptions: CookieOptions = {
  httpOnly: true,
  secure: env.COOKIE_SECURE,
  sameSite: 'lax',
  path: '/api/v1/auth',
  maxAge: env.REFRESH_TOKEN_TTL_MS,
};

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1_000,
  limit: 10,
  skipSuccessfulRequests: true,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  handler: (_request, response) => {
    response.status(429).json({
      error: {
        code: 'RATE_LIMITED',
        message: 'Muitas tentativas. Tente novamente mais tarde.',
        requestId: response.getHeader('x-request-id'),
      },
    });
  },
});

const trustedOrigin: RequestHandler = (request, _response, next) => {
  const origin = request.get('origin');
  if (origin && origin !== env.APP_ORIGIN) {
    return next(new AppError(403, 'UNTRUSTED_ORIGIN', 'Origem da requisição não permitida.'));
  }
  return next();
};

function sessionPayload(session: SessionResult) {
  return {
    user: {
      id: session.user.id,
      name: session.user.name,
      email: session.user.email,
      role: session.user.role,
    },
    accessToken: session.accessToken,
  };
}

export const authRouter = Router();

authRouter.post(
  '/register',
  authLimiter,
  asyncHandler(async (request, response) => {
    const body = registerSchema.parse(request.body);
    const session = await registerCustomer(body);
    response.cookie(cookieName, session.refreshToken, cookieOptions);
    response.status(201).json({ data: sessionPayload(session) });
  }),
);

authRouter.post(
  '/login',
  authLimiter,
  asyncHandler(async (request, response) => {
    const body = credentialsSchema.parse(request.body);
    const session = await login(body.email, body.password);
    response.cookie(cookieName, session.refreshToken, cookieOptions);
    response.json({ data: sessionPayload(session) });
  }),
);

authRouter.post(
  '/refresh',
  trustedOrigin,
  asyncHandler(async (request, response) => {
    const rawToken = request.cookies?.[cookieName] as string | undefined;
    if (!rawToken) throw unauthorized();
    const session = await rotateSession(rawToken);
    response.cookie(cookieName, session.refreshToken, cookieOptions);
    response.json({ data: sessionPayload(session) });
  }),
);

authRouter.post(
  '/logout',
  trustedOrigin,
  asyncHandler(async (request, response) => {
    await revokeSession(request.cookies?.[cookieName] as string | undefined);
    response.clearCookie(cookieName, cookieOptions);
    response.status(204).end();
  }),
);

export const managedRoleSchema = z.enum([Role.customer, Role.seller]);
