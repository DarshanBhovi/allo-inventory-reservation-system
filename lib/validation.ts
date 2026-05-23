import { z } from 'zod';

export const reserveSchema = z.object({
  productId: z.string(),
  warehouseId: z.string(),
  quantity: z.number().int().min(1)
});

export const reservationResponseSchema = z.object({
  id: z.string().uuid(),
  productId: z.string().uuid(),
  warehouseId: z.string().uuid(),
  quantity: z.number().int(),
  status: z.string(),
  expiresAt: z.string()
});

export type ReserveRequest = z.infer<typeof reserveSchema>;
