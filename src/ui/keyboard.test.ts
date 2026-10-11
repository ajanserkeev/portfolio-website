import { describe, expect, it } from 'vitest';
import { getNextFloorIndex, isEditableElement } from './keyboard';

describe('Keyboard navigation helpers', () => {
  it('navigates sequentially between floor indices', () => {
    expect(getNextFloorIndex(0, 'down', 6)).toBe(1);
    expect(getNextFloorIndex(1, 'down', 6)).toBe(2);
    expect(getNextFloorIndex(5, 'down', 6)).toBe(5); // clamped at bottom

    expect(getNextFloorIndex(5, 'up', 6)).toBe(4);
    expect(getNextFloorIndex(1, 'up', 6)).toBe(0);
    expect(getNextFloorIndex(0, 'up', 6)).toBe(0); // clamped at top
  });

  it('detects editable form elements to avoid hijacking typing', () => {
    const input = { tagName: 'INPUT' };
    const textarea = { tagName: 'TEXTAREA' };
    const div = { tagName: 'DIV' };
    const editableDiv = { tagName: 'DIV', isContentEditable: true };

    expect(isEditableElement(input)).toBe(true);
    expect(isEditableElement(textarea)).toBe(true);
    expect(isEditableElement(editableDiv)).toBe(true);
    expect(isEditableElement(div)).toBe(false);
  });
});
