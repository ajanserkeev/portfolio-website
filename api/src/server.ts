import { serve } from '@hono/node-server';
import { createApp } from './app';
import { loadConfig } from './config';

const config = loadConfig();
const app = createApp(config);

serve(
  {
    fetch: app.fetch,
    port: config.port,
  },
  (info) => {
    console.log(`[API Server] Running at http://localhost:${info.port} (${config.nodeEnv})`);
  },
);
