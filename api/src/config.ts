import { z } from 'zod';

export const configSchema = z.object({
  port: z.coerce.number().int().positive().default(3000),
  nodeEnv: z.enum(['development', 'production', 'test']).default('development'),
  sqlitePath: z.string().default('./data/tower.sqlite'),
  telegramBotToken: z.string().optional(),
  telegramChatId: z.string().optional(),
  crmWebhookUrl: z.url().optional(),
  anthropicApiKey: z.string().optional(),
  agentModel: z.string().default('claude-opus-5-5'),
  agentMonthlyBudgetUsd: z.coerce.number().positive().default(50),
  allowedOrigins: z.array(z.string()).default(['http://localhost:4321', 'https://tower.dev']),
});

export type ApiConfig = z.infer<typeof configSchema>;

export function loadConfig(env: Record<string, string | undefined> = process.env): ApiConfig {
  return configSchema.parse({
    port: env.PORT,
    nodeEnv: env.NODE_ENV,
    sqlitePath: env.SQLITE_PATH,
    telegramBotToken: env.TELEGRAM_BOT_TOKEN,
    telegramChatId: env.TELEGRAM_CHAT_ID,
    crmWebhookUrl: env.CRM_WEBHOOK_URL,
    anthropicApiKey: env.ANTHROPIC_API_KEY,
    agentModel: env.AGENT_MODEL,
    agentMonthlyBudgetUsd: env.AGENT_MONTHLY_BUDGET_USD,
    allowedOrigins: env.ALLOWED_ORIGINS
      ? env.ALLOWED_ORIGINS.split(',').map((s) => s.trim())
      : undefined,
  });
}
