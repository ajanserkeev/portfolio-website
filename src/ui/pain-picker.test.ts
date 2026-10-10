import { beforeEach, describe, expect, it } from 'vitest';
import { TowerBus, type TowerEventOf } from '../engine/events';
import { clearStoredPain, getStoredPain } from '../engine/relevance';
import { initPainPicker } from './pain-picker';

interface MockButton {
  dataset: Record<string, string>;
  attributes: Record<string, string>;
  getAttribute(name: string): string | null;
  setAttribute(name: string, value: string): void;
  removeAttribute(name: string): void;
  closest(sel: string): MockButton | null;
}

interface MockSection {
  dataset: Record<string, string>;
  getAttribute(name: string): string | null;
  setAttribute(name: string, value: string): void;
  removeAttribute(name: string): void;
}

interface MockContainer {
  listeners: Record<string, Array<(e: unknown) => void>>;
  buttons: MockButton[];
  sections: MockSection[];
  addEventListener(type: string, cb: (e: unknown) => void): void;
  removeEventListener(type: string, cb: (e: unknown) => void): void;
  querySelectorAll(sel: string): Array<MockButton | MockSection>;
}

function createMockDom(): MockContainer {
  const store: Record<string, string> = {};
  Object.defineProperty(globalThis, 'sessionStorage', {
    value: {
      getItem: (k: string) => store[k] ?? null,
      setItem: (k: string, v: string) => {
        store[k] = v;
      },
      removeItem: (k: string) => {
        delete store[k];
      },
    },
    configurable: true,
    writable: true,
  });

  const buttons: MockButton[] = [
    createButton('lost-leads'),
    createButton('need-site'),
    createButton('browsing'),
  ];

  const sections: MockSection[] = [
    createSection('roof'),
    createSection('agents'),
    createSection('crm'),
    createSection('workshop'),
  ];

  const listeners: Record<string, Array<(e: unknown) => void>> = {};

  const container: MockContainer = {
    listeners,
    buttons,
    sections,
    addEventListener(type, cb) {
      if (!listeners[type]) listeners[type] = [];
      listeners[type].push(cb);
    },
    removeEventListener(type, cb) {
      if (listeners[type]) {
        listeners[type] = listeners[type].filter((fn) => fn !== cb);
      }
    },
    querySelectorAll(sel: string) {
      if (sel === '[data-pain-option]') return buttons;
      if (sel === 'section[data-level]') return sections;
      return [];
    },
  };

  return container;
}

function createButton(pain: string): MockButton {
  const attrs: Record<string, string> = { 'data-pain-option': pain };
  const btn: MockButton = {
    dataset: { painOption: pain },
    attributes: attrs,
    getAttribute(name) {
      return attrs[name] ?? null;
    },
    setAttribute(name, val) {
      attrs[name] = val;
    },
    removeAttribute(name) {
      delete attrs[name];
    },
    closest(sel) {
      return sel === '[data-pain-option]' ? btn : null;
    },
  };
  return btn;
}

function createSection(levelId: string): MockSection {
  const attrs: Record<string, string> = { 'data-level': levelId };
  return {
    dataset: { level: levelId },
    getAttribute(name) {
      return attrs[name] ?? null;
    },
    setAttribute(name, val) {
      attrs[name] = val;
    },
    removeAttribute(name) {
      delete attrs[name];
    },
  };
}

describe('initPainPicker', () => {
  let bus: TowerBus;

  beforeEach(() => {
    bus = new TowerBus();
    clearStoredPain();
  });

  it('selects pain on click, stores in session, marks relevant sections, and emits event', () => {
    const container = createMockDom();
    const emitted: Array<TowerEventOf<'capsule:selected'>> = [];
    bus.on('capsule:selected', (ev) => emitted.push(ev));

    const cleanup = initPainPicker({
      container: container as unknown as HTMLElement,
      bus,
    });

    const targetBtn = container.buttons[0];
    if (!targetBtn) throw new Error('Target button missing');
    const clickEvent = { target: targetBtn };

    for (const handler of container.listeners.click ?? []) {
      handler(clickEvent);
    }

    expect(getStoredPain()).toBe('lost-leads');
    expect(targetBtn.getAttribute('aria-pressed')).toBe('true');
    expect(emitted).toEqual([{ type: 'capsule:selected', pain: 'lost-leads' }]);

    // 'lost-leads' maps to agents & crm
    const agentsSection = container.sections.find((s) => s.dataset.level === 'agents');
    const crmSection = container.sections.find((s) => s.dataset.level === 'crm');
    const workshopSection = container.sections.find((s) => s.dataset.level === 'workshop');

    expect(agentsSection?.getAttribute('data-relevant')).toBe('true');
    expect(crmSection?.getAttribute('data-relevant')).toBe('true');
    expect(workshopSection?.getAttribute('data-relevant')).toBeNull();

    cleanup();
  });
});
