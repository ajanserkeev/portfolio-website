import type { DatabaseSync } from 'node:sqlite';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { type ApiConfig, loadConfig } from './config';
import { initDatabase } from './db';
import { type CrmSync, RealCrmSync } from './integrations/crm';
import { RealTelegramNotifier, type TelegramNotifier } from './integrations/telegram';
import { createRateLimiter } from './limits';
import { createBookRoute } from './routes/book';
import { createChatRoute } from './routes/chat';
import { createLeadRoute } from './routes/lead';
import { createLogRoute } from './routes/log';
import { createSlotsRoute } from './routes/slots';

export interface AppDependencies {
  config?: ApiConfig;
  db?: DatabaseSync;
  telegramNotifier?: TelegramNotifier;
  crmSync?: CrmSync;
  /** Clock for slot generation and booking checks; tests pin it. */
  now?: () => Date;
}

export function createApp(options?: AppDependencies | ApiConfig) {
  const isConfig = options && 'port' in options;
  const config = isConfig
    ? (options as ApiConfig)
    : ((options as AppDependencies)?.config ?? loadConfig());
  const db = isConfig
    ? initDatabase(config.sqlitePath)
    : ((options as AppDependencies)?.db ?? initDatabase(config.sqlitePath));
  const telegramNotifier = isConfig
    ? new RealTelegramNotifier(config.telegramBotToken, config.telegramChatId)
    : ((options as AppDependencies)?.telegramNotifier ??
      new RealTelegramNotifier(config.telegramBotToken, config.telegramChatId));
  const crmSync = isConfig
    ? new RealCrmSync(config.crmWebhookUrl)
    : ((options as AppDependencies)?.crmSync ?? new RealCrmSync(config.crmWebhookUrl));
  const now = (!isConfig && (options as AppDependencies)?.now) || (() => new Date());

  const app = new Hono();

  // Middleware: Request ID
  app.use('*', async (c, next) => {
    const reqId = c.req.header('x-request-id') ?? crypto.randomUUID();
    c.header('x-request-id', reqId);
    await next();
  });

  // Middleware: CORS
  app.use('*', async (c, next) => {
    const corsMiddleware = cors({
      origin: (origin) => {
        if (!origin || config.allowedOrigins.includes(origin)) {
          return origin ?? '*';
        }
        if (config.nodeEnv === 'development') {
          return origin;
        }
        return config.allowedOrigins[0];
      },
      allowMethods: ['GET', 'POST', 'OPTIONS'],
      allowHeaders: ['Content-Type', 'Authorization', 'X-Request-Id'],
      exposeHeaders: ['X-Request-Id'],
      maxAge: 86400,
    });
    return corsMiddleware(c, next);
  });

  // Healthcheck endpoint
  app.get('/api/health', (c) => {
    return c.json({
      ok: true,
      version: '1.0.0',
      nodeEnv: config.nodeEnv,
      timestamp: new Date().toISOString(),
    });
  });

  // Rate-limited routes
  app.use(
    '/api/lead',
    createRateLimiter({
      db,
      windowMs: 60_000,
      max: 20,
    }),
  );
  app.use(
    '/api/book',
    createRateLimiter({
      db,
      windowMs: 60_000,
      max: 20,
    }),
  );
  app.use(
    '/api/slots',
    createRateLimiter({
      db,
      windowMs: 60_000,
      max: 60,
    }),
  );
  app.use(
    '/api/chat',
    createRateLimiter({
      db,
      windowMs: 60_000,
      max: 30,
    }),
  );
  app.use(
    '/api/log',
    createRateLimiter({
      db,
      windowMs: 60_000,
      max: 10,
    }),
  );

  // Mount routes
  app.route(
    '/api/lead',
    createLeadRoute({
      db,
      telegramNotifier,
      crmSync,
    }),
  );
  app.route(
    '/api/slots',
    createSlotsRoute({
      db,
      now,
    }),
  );
  app.route(
    '/api/book',
    createBookRoute({
      db,
      telegramNotifier,
      crmSync,
      now,
    }),
  );
  app.route(
    '/api/chat',
    createChatRoute({
      db,
      config,
    }),
  );
  app.route(
    '/api/log',
    createLogRoute({
      db,
      telegramNotifier,
    }),
  );

  // Global not found handler
  app.notFound((c) => {
    return c.json({ error: 'Route not found', code: 'NOT_FOUND' }, 404);
  });

  // Global error handler
  app.onError((err, c) => {
    console.error(`[API Error] [${c.req.header('x-request-id')}]`, err);
    return c.json(
      {
        error: config.nodeEnv === 'production' ? 'Internal server error' : err.message,
        code: 'INTERNAL_ERROR',
      },
      500,
    );
  });

  return app;
}
