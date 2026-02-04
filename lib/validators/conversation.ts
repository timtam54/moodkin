import { z } from 'zod'

export const createConversationSchema = z.object({
  client_id: z.string().uuid(),
  category_id: z.string().uuid().optional(),
  title: z.string().min(1),
  cover_image_url: z.string().url().optional(),
})

export const updateConversationSchema = z.object({
  title: z.string().min(1).optional(),
  status: z.enum(['active', 'archived']).optional(),
  category_id: z.string().uuid().nullable().optional(),
  cover_image_url: z.string().url().nullable().optional(),
})
