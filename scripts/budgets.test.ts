import { describe, expect, it } from 'vitest';
import { closure, overBudget, parseImports, resolveSpecifier } from './budgets';

describe('parseImports', () => {
  it('finds static and dynamic imports in minified code', () => {
    const code =
      'import{a as b}from"./x.js";import"./y.js";export{c}from"./z.js";const m=()=>import("./app.js");';
    expect(parseImports(code)).toEqual({
      static: ['./x.js', './y.js', './z.js'],
      dynamic: ['./app.js'],
    });
  });

  it('finds dynamic imports written with template literals (Rolldown output)', () => {
    expect(parseImports('const m=()=>import(`./app.B5wRXqJx.js`);').dynamic).toEqual([
      './app.B5wRXqJx.js',
    ]);
  });

  it('ignores property access that looks like import', () => {
    expect(parseImports('foo.import"./nope.js"').static).toEqual([]);
  });
});

describe('resolveSpecifier', () => {
  it('resolves relative and root-absolute paths inside dist', () => {
    expect(resolveSpecifier('_astro/a.js', './b.js')).toBe('_astro/b.js');
    expect(resolveSpecifier('_astro/a.js', '/_astro/c.js')).toBe('_astro/c.js');
    expect(resolveSpecifier('_astro/deep/a.js', '../x.js')).toBe('_astro/x.js');
  });
});

describe('closure', () => {
  it('follows edges and survives cycles', () => {
    const graph: Record<string, string[]> = { a: ['b'], b: ['c', 'a'], c: [] };
    expect([...closure(['a'], (file) => graph[file] ?? [])].sort()).toEqual(['a', 'b', 'c']);
  });
});

describe('overBudget', () => {
  it('returns only the budgets that are exceeded', () => {
    const budgets = [
      { name: 'initial', limitBytes: 100, actualBytes: 90 },
      { name: 'engine', limitBytes: 100, actualBytes: 120 },
    ];
    expect(overBudget(budgets).map((b) => b.name)).toEqual(['engine']);
  });
});
