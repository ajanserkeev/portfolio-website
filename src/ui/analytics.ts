import { bus as defaultBus, type TowerBus, type TowerEvent } from '../engine/events';

export interface AnalyticsGoal {
  name: string;
  params?: Record<string, unknown>;
}

declare global {
  interface Window {
    ym?: (
      counterId: number,
      action: string,
      goal: string,
      params?: Record<string, unknown>,
    ) => void;
    umami?: {
      track: (event: string, data?: Record<string, unknown>) => void;
    };
    dataLayer?: unknown[];
  }
}

export function mapEventToGoal(event: TowerEvent): AnalyticsGoal | null {
  switch (event.type) {
    case 'lead:submitted':
      return { name: 'lead_submitted', params: { source: event.source } };
    case 'booking:confirmed':
      return { name: 'booking_confirmed', params: { slot: event.slotIso } };
    case 'capsule:selected':
      return { name: 'capsule_selected', params: { pain: event.pain } };
    case 'level:reached':
      return { name: 'level_reached', params: { level: event.level } };
    case 'deal:run':
      return { name: 'deal_run' };
    case 'agent:enabled':
      return { name: 'agent_enabled' };
    case 'chat:user-message':
      return { name: 'chat_user_message' };
    case 'chat:tool':
      return { name: 'chat_tool', params: { tool: event.tool } };
    default:
      return null;
  }
}

export function trackGoal(
  name: string,
  params?: Record<string, unknown>,
  ymCounterId?: number,
): void {
  if (typeof window === 'undefined') return;

  const dispatch = () => {
    try {
      if (typeof ymCounterId === 'number' && typeof window.ym === 'function') {
        window.ym(ymCounterId, 'reachGoal', name, params);
      }
      if (window.umami && typeof window.umami.track === 'function') {
        window.umami.track(name, params);
      }
      if (Array.isArray(window.dataLayer)) {
        window.dataLayer.push({ event: name, ...params });
      }
    } catch (err) {
      console.warn('[analytics] goal dispatch failed:', err);
    }
  };

  // Schedule without blocking the main rendering loop
  if (typeof window.requestIdleCallback === 'function') {
    window.requestIdleCallback(dispatch);
  } else {
    setTimeout(dispatch, 0);
  }
}

export function initAnalytics(towerBus: TowerBus = defaultBus, ymCounterId?: number): () => void {
  const unsubscribers: Array<() => void> = [];

  const handle = (event: TowerEvent) => {
    const goal = mapEventToGoal(event);
    if (goal) {
      trackGoal(goal.name, goal.params, ymCounterId);
    }
  };

  unsubscribers.push(towerBus.on('lead:submitted', handle));
  unsubscribers.push(towerBus.on('booking:confirmed', handle));
  unsubscribers.push(towerBus.on('capsule:selected', handle));
  unsubscribers.push(towerBus.on('level:reached', handle));
  unsubscribers.push(towerBus.on('deal:run', handle));
  unsubscribers.push(towerBus.on('agent:enabled', handle));
  unsubscribers.push(towerBus.on('chat:user-message', handle));
  unsubscribers.push(towerBus.on('chat:tool', handle));

  return () => {
    for (const unsub of unsubscribers) {
      unsub();
    }
  };
}
