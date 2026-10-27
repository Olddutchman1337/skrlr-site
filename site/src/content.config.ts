import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const modelClass = z.enum([
  'llm',
  'image-gen',
  'video-gen',
  'upscale',
  'agent',
  'system',
]);

const outcome = z.enum(['pass', 'fail', 'mixed']).optional();

const compareSchema = z
  .object({
    value: z.union([z.number(), z.string()]),
    unit: z.string(),
    label: z.string(),
  })
  .optional();

const benchmarks = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/benchmarks' }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    hardware: z.string(),
    model_class: modelClass,
    metric: z.string(),
    value: z.union([z.number(), z.string()]),
    unit: z.string(),
    method: z.string(),
    caveats: z.string(),
    outcome: outcome,
    compare: compareSchema,
    tags: z.array(z.string()).optional(),
    card_label: z.string().optional(),
    card_detail: z.string().optional(),
  }),
});

export const collections = { benchmarks };
