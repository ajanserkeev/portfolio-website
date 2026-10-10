import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { caseSchema } from './content/schema';

export * from './content/schema';

export const casesRu = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/cases/ru' }),
  schema: caseSchema,
});

export const casesEn = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/cases/en' }),
  schema: caseSchema,
});

export const collections = {
  'cases-ru': casesRu,
  'cases-en': casesEn,
};
