import { z } from 'zod'

export const sendMessageSchema = z.object({
  text_content: z.string().optional(),
  canvas_data: z.any().optional(),
}).refine(
  (data) => data.text_content || data.canvas_data,
  { message: 'Either text_content or canvas_data must be provided' }
)
