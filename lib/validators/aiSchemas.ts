import { z } from 'zod';

export const clothingSuggestionSchema = z.object({
  city: z.string().min(1),
  temp: z.coerce.number(),
  condition: z.string().min(1),
});

export type ClothingSuggestionInput = z.infer<typeof clothingSuggestionSchema>;
