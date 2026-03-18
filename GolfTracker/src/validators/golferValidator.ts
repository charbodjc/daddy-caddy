import { z } from 'zod';

export const golferSchema = z.object({
  name: z.string().min(1, 'Name is required').max(50),
  handicap: z.number().min(0).max(54).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid color format').optional(),
});

export type GolferData = z.infer<typeof golferSchema>;

export const validateCreateGolfer = (data: unknown): GolferData => {
  return golferSchema.parse(data);
};

export const safeValidateGolfer = (data: unknown): { success: boolean; data?: GolferData; error?: string } => {
  const result = golferSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error.issues[0].message };
};
