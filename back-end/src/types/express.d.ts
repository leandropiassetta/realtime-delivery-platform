import type { Role } from '@prisma/client';

declare global {
  namespace Express {
    interface Request {
      auth?: {
        id: number;
        name: string;
        email: string;
        role: Role;
      };
    }
  }
}

export {};
