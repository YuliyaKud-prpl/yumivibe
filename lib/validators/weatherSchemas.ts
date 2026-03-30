import { z } from 'zod';

export const weatherQuerySchema = z.union([
  z.object({ city: z.string().min(1).max(100) }),
  z.object({
    latitude: z.coerce.number().min(-90).max(90),
    longitude: z.coerce.number().min(-180).max(180),
  }),
]);

export type WeatherQuery = z.infer<typeof weatherQuerySchema>;
