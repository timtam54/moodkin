import { z } from 'zod'

export const createClientSchema = z.object({
  email: z.string().email(),
  name: z.string().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
})

export const updateClientSchema = createClientSchema.partial()
