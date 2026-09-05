import { z } from 'zod';

export const checkoutSchema = z.object({
  shippingAddressId: z.string().nullable().optional()
});

export const listOrdersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  status: z
    .enum(['pending', 'paid', 'shipped', 'delivered', 'cancelled'])
    .optional()
});

export const updateOrderStatusSchema = z.object({
  status: z.enum(['pending', 'paid', 'shipped', 'delivered', 'cancelled'])
});