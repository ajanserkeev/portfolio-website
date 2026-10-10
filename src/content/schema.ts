import { z } from 'zod';

export const caseSchema = z.object({
  title: z.string().min(1),
  summary: z.string().min(1),
  service: z.enum(['agents', 'crm', 'booking', 'workshop']),
  industry: z.string().min(1),
  city: z.string().min(1),
  metrics: z
    .array(
      z.object({
        value: z.string().min(1),
        label: z.string().min(1),
      }),
    )
    .min(1),
  stack: z.array(z.string().min(1)).min(1),
  nda: z.boolean().default(false),
  order: z.number().int().default(0),
  floorId: z.enum(['agents', 'crm', 'booking', 'workshop']),
  heroImage: z.string().optional(),
});

export type Case = z.infer<typeof caseSchema>;
