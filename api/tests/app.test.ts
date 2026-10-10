import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app';
import { loadConfig } from '../src/config';

describe('API Config', () => {
  it('loads valid default configuration', () => {
    const config = loadConfig({});
    expect(config.port).toBe(3000);
    expect(config.nodeEnv).toBe('development');
    expect(config.sqlitePath).toBe('./data/tower.sqlite');
    expect(config.agentMonthlyBudgetUsd).toBe(50);
  });

  it('parses custom environment variables', () => {
    const config = loadConfig({
      PORT: '8080',
      NODE_ENV: 'test',
      SQLITE_PATH: ':memory:',
      AGENT_MONTHLY_BUDGET_USD: '100',
    });
    expect(config.port).toBe(8080);
    expect(config.nodeEnv).toBe('test');
    expect(config.sqlitePath).toBe(':memory:');
    expect(config.agentMonthlyBudgetUsd).toBe(100);
  });
});

describe('API App & Health', () => {
  const testConfig = loadConfig({ NODE_ENV: 'test', SQLITE_PATH: ':memory:' });
  const app = createApp(testConfig);

  it('returns 200 OK on /api/health with request-id header', async () => {
    const res = await app.request('/api/health');
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(data.version).toBe('1.0.0');
    expect(data.nodeEnv).toBe('test');
    expect(data.timestamp).toBeTruthy();

    const reqId = res.headers.get('x-request-id');
    expect(reqId).toBeTruthy();
  });

  it('preserves existing x-request-id header', async () => {
    const customId = 'test-req-12345';
    const res = await app.request('/api/health', {
      headers: { 'x-request-id': customId },
    });
    expect(res.headers.get('x-request-id')).toBe(customId);
  });

  it('returns 404 for unknown route', async () => {
    const res = await app.request('/api/unknown-endpoint');
    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data.code).toBe('NOT_FOUND');
  });

  it('handles errors gracefully', async () => {
    const errApp = createApp(testConfig);
    errApp.get('/api/test-error', () => {
      throw new Error('Explosion');
    });

    const res = await errApp.request('/api/test-error');
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.code).toBe('INTERNAL_ERROR');
    expect(data.error).toBe('Explosion');
  });
});
