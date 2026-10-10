import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { caseSchema } from './schema';

describe('caseSchema', () => {
  const validCase = {
    title: 'ИИ-диспетчер для сети медицинских клиник',
    summary:
      'Автоматизация первичного сбора анамнеза, записи к врачу и ответов на частые вопросы пациентов в WhatsApp и Telegram.',
    service: 'agents',
    industry: 'Медицина',
    city: 'Алматы',
    metrics: [
      { value: '-65%', label: 'нагрузки на колл-центр' },
      { value: '< 15 с', label: 'время первого ответа' },
      { value: '+28%', label: 'конверсия в запись' },
    ],
    stack: ['Python', 'Claude API', 'WhatsApp Business', 'PostgreSQL'],
    nda: true,
    order: 1,
    floorId: 'agents',
  };

  it('validates a complete case successfully', () => {
    const parsed = caseSchema.parse(validCase);
    expect(parsed.title).toBe(validCase.title);
    expect(parsed.service).toBe('agents');
    expect(parsed.nda).toBe(true);
    expect(parsed.metrics).toHaveLength(3);
  });

  it('rejects a case with missing title', () => {
    const invalid = { ...validCase, title: '' };
    expect(() => caseSchema.parse(invalid)).toThrow();
  });

  it('rejects a case with invalid service', () => {
    const invalid = { ...validCase, service: 'unknown-service' };
    expect(() => caseSchema.parse(invalid)).toThrow();
  });

  it('rejects empty metrics array', () => {
    const invalid = { ...validCase, metrics: [] };
    expect(() => caseSchema.parse(invalid)).toThrow();
  });

  it('rejects empty stack array', () => {
    const invalid = { ...validCase, stack: [] };
    expect(() => caseSchema.parse(invalid)).toThrow();
  });

  it('defaults nda to false and order to 0 when omitted', () => {
    const minimal = {
      title: 'Сайт туроператора',
      summary: 'Каталог туров с онлайн-оплатой и личным кабинетом туриста.',
      service: 'workshop',
      industry: 'Туризм',
      city: 'Астана',
      metrics: [{ value: '3.2x', label: 'рост онлайн-продаж' }],
      stack: ['Astro', 'TypeScript', 'TailwindCSS'],
      floorId: 'workshop',
    };
    const parsed = caseSchema.parse(minimal);
    expect(parsed.nda).toBe(false);
    expect(parsed.order).toBe(0);
  });

  it('validates all markdown/mdx cases in src/content/cases', () => {
    const baseDir = path.resolve(process.cwd(), 'src/content/cases');
    if (!fs.existsSync(baseDir)) return;

    const locales = ['ru', 'en'];
    for (const locale of locales) {
      const locDir = path.join(baseDir, locale);
      if (!fs.existsSync(locDir)) continue;
      const files = fs.readdirSync(locDir).filter((f) => f.endsWith('.md') || f.endsWith('.mdx'));
      expect(files.length).toBeGreaterThan(0);

      for (const file of files) {
        const content = fs.readFileSync(path.join(locDir, file), 'utf-8');
        const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
        expect(match, `Frontmatter missing in ${locale}/${file}`).toBeTruthy();
        if (match) {
          const yaml = match[1] ?? '';
          const lines = yaml.split('\n');
          const data: Record<string, unknown> = {};
          let currentListKey: string | null = null;
          let currentList: unknown[] = [];

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith('#')) continue;

            if (trimmed.startsWith('- ') && currentListKey) {
              const itemStr = trimmed.slice(2).trim();
              if (itemStr.includes(':')) {
                const obj: Record<string, string> = {};
                const parts = itemStr.split(':');
                const part0 = parts[0]?.trim();
                if (part0) {
                  obj[part0] = parts
                    .slice(1)
                    .join(':')
                    .trim()
                    .replace(/^['"]|['"]$/g, '');
                  currentList.push(obj);
                }
              } else {
                currentList.push(itemStr.replace(/^['"]|['"]$/g, ''));
              }
              continue;
            }

            if (line.startsWith('    ') && currentListKey && currentList.length > 0) {
              const lastObj = currentList[currentList.length - 1];
              if (typeof lastObj === 'object' && lastObj !== null) {
                const parts = trimmed.split(':');
                const part0 = parts[0]?.trim();
                if (part0) {
                  (lastObj as Record<string, string>)[part0] = parts
                    .slice(1)
                    .join(':')
                    .trim()
                    .replace(/^['"]|['"]$/g, '');
                }
                continue;
              }
            }

            const colonIdx = line.indexOf(':');
            if (colonIdx > 0 && !line.startsWith(' ')) {
              const key = line.slice(0, colonIdx).trim();
              const val = line.slice(colonIdx + 1).trim();

              if (!val) {
                currentListKey = key;
                currentList = [];
                data[key] = currentList;
              } else {
                currentListKey = null;
                const cleanVal = val.replace(/^['"]|['"]$/g, '');
                if (cleanVal === 'true') data[key] = true;
                else if (cleanVal === 'false') data[key] = false;
                else if (!Number.isNaN(Number(cleanVal)) && cleanVal !== '')
                  data[key] = Number(cleanVal);
                else data[key] = cleanVal;
              }
            }
          }
          expect(
            () => caseSchema.parse(data),
            `Validation failed for ${locale}/${file}`,
          ).not.toThrow();
        }
      }
    }
  });
});
