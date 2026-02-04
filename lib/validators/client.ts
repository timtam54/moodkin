import { z } from 'zod'

export const createClientSchema = z.object({
  email: z.string().email(),
  name: z.string().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
  avatar_url: z.string().url().optional().or(z.literal('')),
})

export const updateClientSchema = createClientSchema.partial()
