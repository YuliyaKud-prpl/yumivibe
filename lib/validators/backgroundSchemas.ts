import { z } from 'zod';

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

export const searchBackgroundsSchema = z.object({
  query: z.string().min(1),
  page: z.coerce.number().int().positive().optional(),
});

export const uploadBackgroundSchema = z.object({
  mimetype: z
    .string()
    .refine(
      (type): type is (typeof ALLOWED_IMAGE_TYPES)[number] =>
        (ALLOWED_IMAGE_TYPES as readonly string[]).includes(type),
      { message: 'File must be jpg, png, or webp' }
    ),
  size: z
    .number()
    .max(MAX_FILE_SIZE_BYTES, { message: 'File must be 5MB or smaller' }),
});

export type SearchBackgroundsInput = z.infer<typeof searchBackgroundsSchema>;
export type UploadBackgroundInput = z.infer<typeof uploadBackgroundSchema>;
