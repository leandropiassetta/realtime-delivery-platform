import { createServer } from 'node:http';
import { createApp } from './app.js';
import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { prisma } from './lib/prisma.js';
import { attachRealtime } from './realtime.js';

const server = createServer(createApp());
const io = attachRealtime(server);

server.listen(env.API_PORT, () => {
  logger.info({ port: env.API_PORT }, 'API iniciada');
});

const shutdown = async (signal: string) => {
  logger.info({ signal }, 'Encerrando aplicação');
  await io.close();
  server.close();
  await prisma.$disconnect();
  process.exit(0);
};

process.once('SIGTERM', () => void shutdown('SIGTERM'));
process.once('SIGINT', () => void shutdown('SIGINT'));
