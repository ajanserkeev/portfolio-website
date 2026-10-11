import { describe, expect, it } from 'vitest';
import { initMenu } from './menu';

type Listener = (event: Record<string, unknown>) => void;

function fakeTarget() {
  const listeners = new Map<string, Set<Listener>>();
  return {
    listeners,
    addEventListener: (type: string, fn: Listener) => {
      const set = listeners.get(type) ?? new Set<Listener>();
      set.add(fn);
      listeners.set(type, set);
    },
    removeEventListener: (type: string, fn: Listener) => listeners.get(type)?.delete(fn),
    fire(type: string, event: Record<string, unknown> = {}) {
      for (const fn of listeners.get(type) ?? []) fn(event);
    },
  };
}

function setup() {
  const attrs = new Map<string, string>([['aria-expanded', 'false']]);
  let focused = 0;
  const menuEl = { hidden: true, contains: (node: unknown) => node === menuEl.inner, inner: {} };
  const button = {
    ...fakeTarget(),
    getAttribute: (name: string) => attrs.get(name) ?? null,
    setAttribute: (name: string, value: string) => attrs.set(name, value),
    contains: (node: unknown) => node === button,
    focus: () => {
      focused += 1;
    },
  };
  const doc = {
    ...fakeTarget(),
    querySelector: (selector: string) =>
      selector === '[data-menu-button]' ? button : selector === '[data-menu]' ? menuEl : null,
  };
  const dispose = initMenu(doc as unknown as Document);
  return { doc, button, menuEl, attrs, dispose, focusCount: () => focused };
}

describe('initMenu', () => {
  it('opens and closes on the button', () => {
    const { button, menuEl, attrs } = setup();
    button.fire('click');
    expect(menuEl.hidden).toBe(false);
    expect(attrs.get('aria-expanded')).toBe('true');
    button.fire('click');
    expect(menuEl.hidden).toBe(true);
    expect(attrs.get('aria-expanded')).toBe('false');
  });

  it('closes on Escape and returns focus to the button', () => {
    const { doc, button, menuEl, focusCount } = setup();
    button.fire('click');
    doc.fire('keydown', { key: 'Escape' });
    expect(menuEl.hidden).toBe(true);
    expect(focusCount()).toBe(1);
  });

  it('closes on a click outside, but not inside', () => {
    const { doc, button, menuEl } = setup();
    button.fire('click');
    doc.fire('click', { target: menuEl.inner });
    expect(menuEl.hidden).toBe(false);
    doc.fire('click', { target: {} });
    expect(menuEl.hidden).toBe(true);
  });

  it('stops listening after dispose', () => {
    const { button, menuEl, dispose } = setup();
    dispose();
    button.fire('click');
    expect(menuEl.hidden).toBe(true);
  });
});
