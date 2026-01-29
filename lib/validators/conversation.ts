import { z } from 'zod'

export const createConversationSchema = z.object({
  client_id: z.string().uuid(),
  category_id: z.string().uuid().optional(),
  title: z.string().min(1),
})

export const updateConversationSchema = z.object({
  title: z.string().min(1).optional(),
  status: z.enum(['active', 'archived']).optional(),
  category_id: z.string().uuid().nullable().optional(),
})
