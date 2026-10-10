import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { type ApiConfig, loadConfig } from './config';

export function createApp(customConfig?: ApiConfig) {
  const config = customConfig ?? loadConfig();
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
