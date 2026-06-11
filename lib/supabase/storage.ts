import { createClient } from './client'

const BUCKET_NAME = 'assets'

export async function uploadFile(file: File, folder: string = 'images'): Promise<string> {
  const supabase = createClient()

  // Generate unique filename
  const timestamp = Date.now()
  const randomSuffix = Math.random().toString(36).substring(2, 10)
  const extension = file.name.split('.').pop() || 'jpg'
  const storagePath = `${folder}/${timestamp}-${randomSuffix}.${extension}`

  // Upload directly to Supabase Storage
  const { error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(storagePath, file, {
      contentType: file.type,
      upsert: false,
    })

  if (error) {
    console.error('Upload error:', error)
    throw new Error('Failed to upload file')
  }

  // Get public URL
  const { data } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(storagePath)

  return data.publicUrl
}
