import { z } from 'zod';

export const createProductSchema = z.object({
  name: z.string().trim().min(1).max(255),
  description: z.string().nullable().optional(),
  price: z.number().positive(),
  stockQuantity: z.number().int().min(0),
  categoryId: z.string().nullable().optional()
});

export const updateProductSchema = z.object({
  name: z.string().trim().min(1).max(255).optional(),
  description: z.string().nullable().optional(),
  price: z.number().positive().optional(),
  stockQuantity: z.number().int().min(0).optional(),
  categoryId: z.string().nullable().optional(),
  isActive: z.boolean().optional()
});

export const createCategorySchema = z.object({
  name: z.string().trim().min(1).max(255)
});

export const listProductsQuerySchema = z.object({
  search: z.string().trim().optional(),
  categoryId: z.string().optional(),
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional()
});