import { describe, expect, it, vi } from 'vitest';
import { TowerBus } from './events';

describe('TowerBus', () => {
  it('delivers events to handlers of that type only', () => {
    const bus = new TowerBus();
    const moved = vi.fn();
    const reached = vi.fn();
    bus.on('lift:moved', moved);
    bus.on('level:reached', reached);
    bus.emit({ type: 'lift:moved', position: 1.5 });
    expect(moved).toHaveBeenCalledWith({ type: 'lift:moved', position: 1.5 });
    expect(reached).not.toHaveBeenCalled();
  });

  it('stops delivering after unsubscribe', () => {
    const bus = new TowerBus();
    const handler = vi.fn();
    const off = bus.on('deal:run', handler);
    off();
    bus.emit({ type: 'deal:run' });
    expect(handler).not.toHaveBeenCalled();
  });

  it('keeps delivering when one handler throws', () => {
    const bus = new TowerBus();
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    const second = vi.fn();
    bus.on('agent:enabled', () => {
      throw new Error('boom');
    });
    bus.on('agent:enabled', second);
    bus.emit({ type: 'agent:enabled' });
    expect(second).toHaveBeenCalled();
    error.mockRestore();
  });
});
