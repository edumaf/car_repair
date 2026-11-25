// Offline Learn guides (CLAUDE.md §6.9) from content/learn.json.
import { z } from 'zod';

import learnJson from '../../../content/learn.json';

export const guideSchema = z.object({
  id: z.string().regex(/^[a-z0-9_]+$/),
  title: z.string().min(1),
  icon: z.string().min(1),
  minutes: z.number().int().positive(),
  sections: z
    .array(
      z.object({
        heading: z.string().optional(),
        text: z.array(z.string().min(1)).optional(),
        bullets: z.array(z.string().min(1)).optional(),
      }),
    )
    .min(1),
});
export const learnFileSchema = z.object({
  _meta: z.object({ version: z.number(), note: z.string() }),
  guides: z.array(guideSchema).min(1),
});

export type Guide = z.infer<typeof guideSchema>;
export const rawLearn: unknown = learnJson;
export const GUIDES: readonly Guide[] = (learnJson as unknown as z.infer<typeof learnFileSchema>).guides;
export const getGuide = (id: string) => GUIDES.find((g) => g.id === id);
