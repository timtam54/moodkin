import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth/session'
import { createServiceClient } from '@/lib/supabase/server'
import { isProjectMember } from '@/lib/auth/project-access'
import { isSubscriptionActive, subscriptionConfig, getCurrentMonthString } from '@/lib/config/subscription'
import { fal } from '@fal-ai/client'

const BUCKET_NAME = 'assets'

// Configure Fal.ai client
fal.config({
  credentials: process.env.FAL_KEY,
})

// Helper to get current AI image count, resetting if new month
async function getAndUpdateAIImageCount(
  supabase: ReturnType<typeof createServiceClient> extends Promise<infer T> ? T : never,
  userId: string
): Promise<{ count: number; isNewMonth: boolean }> {
  const currentMonth = getCurrentMonthString()

  // Get user's current count and reset month
  const { data: user } = await supabase
    .from('users')
    .select('ai_images_count, ai_count_reset_month')
    .eq('id', userId)
    .single()

  const storedMonth = user?.ai_count_reset_month
  const storedCount = user?.ai_images_count || 0

  // If it's a new month, reset the count
  if (storedMonth !== currentMonth) {
    await supabase
      .from('users')
      .update({
        ai_images_count: 0,
        ai_count_reset_month: currentMonth
      })
      .eq('id', userId)

    return { count: 0, isNewMonth: true }
  }

  return { count: storedCount, isNewMonth: false }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  try {
    const session = await requireSession()
    const supabase = await createServiceClient()
    const { conversationId } = await params

    // Verify access
    const hasAccess = await isProjectMember(supabase, conversationId, session.user.id)
    if (!hasAccess) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    // Check if the current user has an active subscription
    const hasSubscription = isSubscriptionActive(
      session.user.stripeid,
      session.user.subscriptionEndsAt
    )
    if (!hasSubscription) {
      return NextResponse.json({ error: 'Subscription required to generate AI images' }, { status: 403 })
    }

    // Check AI image quota
    const { count: currentCount } = await getAndUpdateAIImageCount(supabase, session.user.id)
    const monthlyLimit = subscriptionConfig.features.aiImagesPerMonth

    if (currentCount >= monthlyLimit) {
      return NextResponse.json({
        error: 'QUOTA_EXCEEDED',
        message: `You've created ${monthlyLimit} images and consumed your quota for the month.`,
        count: currentCount,
        limit: monthlyLimit
      }, { status: 429 })
    }

    const body = await request.json()
    const { prompt, style, size = '1024x1024', saveToProject = false, imageUrl } = body

    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 })
    }

    // If we have an existing imageUrl and saveToProject is true, skip generation
    // This happens when the user previewed an image and now wants to save it
    if (saveToProject && imageUrl) {
      // Download the image from the existing URL
      const imageResponse = await fetch(imageUrl)
      if (!imageResponse.ok) {
        return NextResponse.json({ error: 'Failed to download generated image' }, { status: 500 })
      }

      const imageBuffer = await imageResponse.arrayBuffer()
      const filename = `ai-generated-${Date.now()}.png`
      const storagePath = `images/${filename}`

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(storagePath, Buffer.from(imageBuffer), {
          contentType: 'image/png',
          upsert: false,
        })

      if (uploadError) {
        console.error('Failed to upload to storage:', uploadError)
        return NextResponse.json({ error: 'Failed to upload image' }, { status: 500 })
      }

      const { data: urlData } = supabase.storage
        .from(BUCKET_NAME)
        .getPublicUrl(storagePath)

      const imageUrl2 = urlData.publicUrl

      // Save to project assets
      const { data: asset, error: assetError } = await supabase
        .from('project_assets')
        .insert({
          conversation_id: conversationId,
          url: imageUrl2,
          filename: filename,
          asset_type: 'image',
          title: prompt.slice(0, 100),
          uploaded_by_id: session.user.id,
          uploaded_by_name: session.user.name || session.user.email,
          ai_generated: true,
        })
        .select()
        .single()

      if (assetError) {
        console.error('Failed to save asset:', assetError)
        return NextResponse.json({ error: 'Failed to save image to project' }, { status: 500 })
      }

      return NextResponse.json({
        url: imageUrl2,
        saved: true,
        asset,
      })
    }

    // Get project context for better generation
    const { data: project } = await supabase
      .from('conversations')
      .select('title, description')
      .eq('id', conversationId)
      .single()

    // Build enhanced prompt with style and project context
    let enhancedPrompt = prompt
    if (style) {
      enhancedPrompt = `${prompt}. Style: ${style}`
    }
    if (project?.title) {
      enhancedPrompt = `For a project called "${project.title}": ${enhancedPrompt}`
    }

    // Map size parameter to Nano Banana aspect ratio format
    type NanoBananaAspectRatio = '1:1' | '21:9' | '16:9' | '3:2' | '4:3' | '5:4' | '4:5' | '3:4' | '2:3' | '9:16'
    const aspectRatioMap: Record<string, NanoBananaAspectRatio> = {
      '1024x1024': '1:1',
      '1792x1024': '16:9',
      '1024x1792': '9:16',
    }
    const aspectRatio: NanoBananaAspectRatio = aspectRatioMap[size] || '1:1'

    // Generate image with Fal.ai Nano Banana (Google's Gemini-based model)
    const result = await fal.subscribe('fal-ai/nano-banana', {
      input: {
        prompt: enhancedPrompt,
        aspect_ratio: aspectRatio,
        num_images: 1,
        output_format: 'png',
      },
    })

    const falImageUrl = result.data?.images?.[0]?.url

    if (!falImageUrl) {
      return NextResponse.json({ error: 'Failed to generate image' }, { status: 500 })
    }

    // Increment the user's AI image count (image was generated regardless of save)
    const newCount = currentCount + 1
    await supabase
      .from('users')
      .update({ ai_images_count: newCount })
      .eq('id', session.user.id)

    // If saveToProject is true but no imageUrl was provided (shouldn't happen in normal flow)
    if (saveToProject) {
      // Download the image from Fal.ai
      const imageResponse = await fetch(falImageUrl)
      if (!imageResponse.ok) {
        return NextResponse.json({ error: 'Failed to download generated image' }, { status: 500 })
      }

      const imageBuffer = await imageResponse.arrayBuffer()
      const filename = `ai-generated-${Date.now()}.png`
      const storagePath = `images/${filename}`

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(storagePath, Buffer.from(imageBuffer), {
          contentType: 'image/png',
          upsert: false,
        })

      if (uploadError) {
        console.error('Failed to upload to storage:', uploadError)
        return NextResponse.json({ error: 'Failed to upload image' }, { status: 500 })
      }

      const { data: urlData } = supabase.storage
        .from(BUCKET_NAME)
        .getPublicUrl(storagePath)

      const savedImageUrl = urlData.publicUrl

      // Save to project assets
      const { data: asset, error: assetError } = await supabase
        .from('project_assets')
        .insert({
          conversation_id: conversationId,
          url: savedImageUrl,
          filename: filename,
          asset_type: 'image',
          title: prompt.slice(0, 100),
          uploaded_by_id: session.user.id,
          uploaded_by_name: session.user.name || session.user.email,
          ai_generated: true,
        })
        .select()
        .single()

      if (assetError) {
        console.error('Failed to save asset:', assetError)
        return NextResponse.json({ error: 'Failed to save image to project' }, { status: 500 })
      }

      return NextResponse.json({
        url: savedImageUrl,
        saved: true,
        asset,
        aiImageCount: newCount,
        aiImageLimit: monthlyLimit,
      })
    }

    // Just return the Fal.ai URL for preview (temporary)
    return NextResponse.json({
      url: falImageUrl,
      saved: false,
      aiImageCount: newCount,
      aiImageLimit: monthlyLimit,
    })
  } catch (error) {
    console.error('Image generation error:', error)

    // Handle Fal.ai errors
    if (error instanceof Error) {
      if (error.message.includes('safety') || error.message.includes('content')) {
        return NextResponse.json({
          error: 'Your prompt was rejected by the safety filter. Please try a different description.'
        }, { status: 400 })
      }
      if (error.message.includes('rate') || error.message.includes('limit')) {
        return NextResponse.json({
          error: 'Too many requests. Please wait a moment and try again.'
        }, { status: 429 })
      }
    }

    return NextResponse.json({ error: 'Failed to generate image' }, { status: 500 })
  }
}
