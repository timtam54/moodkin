import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth/session'
import { createServiceClient } from '@/lib/supabase/server'
import { isProjectMember } from '@/lib/auth/project-access'
import { isSubscriptionActive, subscriptionConfig, getCurrentMonthString } from '@/lib/config/subscription'
import { put } from '@vercel/blob'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
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

      // Upload to Vercel Blob
      const blob = await put(filename, imageBuffer, {
        access: 'public',
        contentType: 'image/png',
      })

      // Save to project assets
      const { data: asset, error: assetError } = await supabase
        .from('project_assets')
        .insert({
          conversation_id: conversationId,
          url: blob.url,
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
        url: blob.url,
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

    // Generate image with DALL-E 3
    const response = await openai.images.generate({
      model: 'dall-e-3',
      prompt: enhancedPrompt,
      n: 1,
      size: size as '1024x1024' | '1792x1024' | '1024x1792',
      quality: 'standard',
      response_format: 'url',
    })

    const imageData = response.data?.[0]
    const openaiImageUrl = imageData?.url
    const revisedPrompt = imageData?.revised_prompt

    if (!openaiImageUrl) {
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
      // Download the image from OpenAI
      const imageResponse = await fetch(openaiImageUrl)
      if (!imageResponse.ok) {
        return NextResponse.json({ error: 'Failed to download generated image' }, { status: 500 })
      }

      const imageBuffer = await imageResponse.arrayBuffer()
      const filename = `ai-generated-${Date.now()}.png`

      // Upload to Vercel Blob
      const blob = await put(filename, imageBuffer, {
        access: 'public',
        contentType: 'image/png',
      })

      // Save to project assets
      const { data: asset, error: assetError } = await supabase
        .from('project_assets')
        .insert({
          conversation_id: conversationId,
          url: blob.url,
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
        url: blob.url,
        revisedPrompt,
        saved: true,
        asset,
        aiImageCount: newCount,
        aiImageLimit: monthlyLimit,
      })
    }

    // Just return the OpenAI URL for preview (temporary)
    return NextResponse.json({
      url: openaiImageUrl,
      revisedPrompt,
      saved: false,
      aiImageCount: newCount,
      aiImageLimit: monthlyLimit,
    })
  } catch (error) {
    console.error('Image generation error:', error)

    if (error instanceof OpenAI.APIError) {
      if (error.status === 400) {
        return NextResponse.json({
          error: 'Your prompt was rejected. Please try a different description.'
        }, { status: 400 })
      }
      if (error.status === 429) {
        return NextResponse.json({
          error: 'Too many requests. Please wait a moment and try again.'
        }, { status: 429 })
      }
    }

    return NextResponse.json({ error: 'Failed to generate image' }, { status: 500 })
  }
}
