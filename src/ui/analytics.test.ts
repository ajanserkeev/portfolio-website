import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TowerBus } from '../engine/events';
import { initAnalytics, mapEventToGoal, trackGoal } from './analytics';

describe('Analytics mapper', () => {
  it('maps key conversion events to analytics goals', () => {
    expect(mapEventToGoal({ type: 'lead:submitted', source: 'form' })).toEqual({
      name: 'lead_submitted',
      params: { source: 'form' },
    });

    expect(mapEventToGoal({ type: 'booking:confirmed', slotIso: '2026-10-12T10:00:00Z' })).toEqual({
      name: 'booking_confirmed',
      params: { slot: '2026-10-12T10:00:00Z' },
    });

    expect(mapEventToGoal({ type: 'capsule:selected', pain: 'need-site' })).toEqual({
      name: 'capsule_selected',
      params: { pain: 'need-site' },
    });

    expect(mapEventToGoal({ type: 'level:reached', level: 'crm' })).toEqual({
      name: 'level_reached',
      params: { level: 'crm' },
    });

    expect(mapEventToGoal({ type: 'deal:run' })).toEqual({
      name: 'deal_run',
    });

    expect(mapEventToGoal({ type: 'chat:user-message' })).toEqual({
      name: 'chat_user_message',
    });
  });

  it('ignores high-frequency low-value events like lift:moved', () => {
    expect(mapEventToGoal({ type: 'lift:moved', position: 1.5 })).toBeNull();
  });
});

describe('Analytics dispatching', () => {
  const originalWindow = globalThis.window;

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('dispatches to ym, umami, and dataLayer safely', () => {
    const ymMock = vi.fn();
    const umamiMock = { track: vi.fn() };
    const dataLayerMock: unknown[] = [];

    (globalThis as unknown as { window: unknown }).window = {
      ym: ymMock,
      umami: umamiMock,
      dataLayer: dataLayerMock,
      setTimeout: globalThis.setTimeout,
    };

    trackGoal('lead_submitted', { source: 'form' }, 12345678);
    vi.runAllTimers();

    expect(ymMock).toHaveBeenCalledWith(12345678, 'reachGoal', 'lead_submitted', {
      source: 'form',
    });
    expect(umamiMock.track).toHaveBeenCalledWith('lead_submitted', { source: 'form' });
    expect(dataLayerMock).toContainEqual({ event: 'lead_submitted', source: 'form' });

    (globalThis as unknown as { window: unknown }).window = originalWindow;
  });

  it('subscribes to event bus and tracks mapped goals', () => {
    const testBus = new TowerBus();
    const ym = vi.fn();

    (globalThis as unknown as { window: unknown }).window = {
      ym,
      setTimeout: globalThis.setTimeout,
    };

    const cleanup = initAnalytics(testBus, 99999);
    testBus.emit({ type: 'lead:submitted', source: 'chat' });
    vi.runAllTimers();

    expect(ym).toHaveBeenCalledWith(99999, 'reachGoal', 'lead_submitted', {
      source: 'chat',
    });

    cleanup();
    testBus.emit({ type: 'lead:submitted', source: 'chat' });
    vi.runAllTimers();
    expect(ym).toHaveBeenCalledTimes(1);

    (globalThis as unknown as { window: unknown }).window = originalWindow;
  });
});
