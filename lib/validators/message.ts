import { z } from 'zod'

export const sendMessageSchema = z.object({
  text_content: z.string().optional(),
  canvas_data: z.any().optional(),
  image_url: z.string().url().optional(),
}).refine(
  (data) => data.text_content || data.canvas_data || data.image_url,
  { message: 'Either text_content, canvas_data, or image_url must be provided' }
)
