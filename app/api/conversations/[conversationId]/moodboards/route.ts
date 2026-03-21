import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth/session'
import { createServiceClient } from '@/lib/supabase/server'
import { isProjectMember, isProjectOwner } from '@/lib/auth/project-access'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function GET(
  _request: NextRequest,
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

    // Get all moodboards for this project with their images
    const { data: moodboards, error } = await supabase
      .from('moodboards')
      .select(`
        *,
        images:moodboard_images(
          *,
          asset:project_assets(*)
        )
      `)
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch moodboards' }, { status: 500 })
    }

    return NextResponse.json(moodboards)
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
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

    // Parse style options from request body
    const body = await request.json().catch(() => ({}))
    let {
      backgroundColor = '#1A1A1A',
      gridLayout = '2x2',
      borderEnabled = true,
      borderColor = '#FFFFFF',
      borderRadius = 12,
      borderWidth = 0,
      spacing = 8,
      aspectRatio = 'square', // 'portrait', 'square', or 'landscape'
      mode = 'automatic', // 'automatic', 'manual', or 'freeform'
      selectedAssetIds = [], // Only used in manual mode
      freeformImages = [], // Only used in freeform mode: { assetId, x, y, width, height, rotation, zIndex }[]
    } = body

    // Helper to determine layout based on image count for automatic mode
    const getAutoLayout = (count: number): string => {
      if (count === 1) return '1'
      if (count === 2) return '2-big-left'
      if (count === 3) return '3-top'
      if (count === 4) return '4-diagonal'
      if (count <= 6) return '3x2'
      return 'auto' // Fallback for tiered layout
    }

    // Get conversation title
    const { data: conv } = await supabase
      .from('conversations')
      .select('title')
      .eq('id', conversationId)
      .single()
    const conversationTitle = conv?.title || 'Untitled'

    // Get all visual assets (images and links with thumbnails)
    const { data: allAssets } = await supabase
      .from('project_assets')
      .select('*')
      .eq('conversation_id', conversationId)

    // Filter to images and links that have thumbnails
    const assets = allAssets?.filter(a =>
      a.asset_type === 'image' || (a.asset_type === 'link' && a.thumbnail_url)
    ) || []

    if (assets.length === 0) {
      return NextResponse.json({ error: 'No images to create moodboard' }, { status: 400 })
    }

    let sortedAssets: { asset: typeof assets[0]; score: number }[]
    let isFreeform = false
    let freeformImageData: { assetId: string; x: number; y: number; width: number; height: number; rotation: number; zIndex: number }[] = []

    if (mode === 'freeform' && freeformImages.length > 0) {
      // Freeform mode: use images with position data
      isFreeform = true
      freeformImageData = freeformImages
      const assetIds = freeformImages.map((img: { assetId: string }) => img.assetId)
      const freeformAssets = assets.filter(a => assetIds.includes(a.id))

      sortedAssets = freeformAssets.map((asset, index) => ({
        asset,
        score: freeformAssets.length - index,
      }))

      if (sortedAssets.length === 0) {
        return NextResponse.json({ error: 'No valid images in freeform data' }, { status: 400 })
      }
    } else if (mode === 'manual' && selectedAssetIds.length > 0) {
      // Manual mode: use selected assets in the order provided
      const selectedSet = new Set(selectedAssetIds as string[])
      const selectedAssets = assets.filter(a => selectedSet.has(a.id))

      // Sort by the order in selectedAssetIds
      selectedAssets.sort((a, b) => {
        return selectedAssetIds.indexOf(a.id) - selectedAssetIds.indexOf(b.id)
      })

      sortedAssets = selectedAssets.map((asset, index) => ({
        asset,
        score: selectedAssets.length - index, // Higher score for earlier position
      }))

      if (sortedAssets.length === 0) {
        return NextResponse.json({ error: 'No valid images selected' }, { status: 400 })
      }
    } else {
      // Automatic mode: score based on reactions
      // Get reactions for all assets
      const assetIds = assets.map(a => a.id)
      const { data: reactions } = await supabase
        .from('asset_reactions')
        .select('*')
        .in('asset_id', assetIds)

      // Calculate scores for each asset
      // Likes = +1, Red flags = -2
      const assetScores = assets.map(asset => {
        const assetReactions = reactions?.filter(r => r.asset_id === asset.id) || []
        const likes = assetReactions.filter(r => r.reaction_type === 'like').length
        const flags = assetReactions.filter(r => r.reaction_type === 'redflag').length
        const score = likes - (flags * 2)
        return { asset, score }
      })

      // Sort by score (highest first), then filter out heavily flagged images
      sortedAssets = assetScores
        .filter(a => a.score >= -2) // Exclude images with too many flags
        .sort((a, b) => b.score - a.score)

      if (sortedAssets.length === 0) {
        return NextResponse.json({ error: 'No suitable images for moodboard' }, { status: 400 })
      }
    }

    // Use AI to generate a title and description based on the images
    let aiTitle = `${conversationTitle} Moodboard`
    let aiDescription = null

    try {
      // Prepare image URLs for AI analysis (limit to top 6)
      const topImages = sortedAssets.slice(0, 6).map(a => a.asset.url)

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a creative director helping to name and describe moodboards. Be concise and evocative.'
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Based on these images from a project called "${conversationTitle}", create a short evocative title (3-5 words) and a one-sentence description for this moodboard. Return as JSON: {"title": "...", "description": "..."}`
              },
              ...topImages.map(url => ({
                type: 'image_url' as const,
                image_url: { url, detail: 'low' as const }
              }))
            ]
          }
        ],
        max_tokens: 150,
        response_format: { type: 'json_object' }
      })

      const aiResponse = JSON.parse(completion.choices[0].message.content || '{}')
      if (aiResponse.title) aiTitle = aiResponse.title
      if (aiResponse.description) aiDescription = aiResponse.description
    } catch (aiError) {
      console.error('AI generation failed, using defaults:', aiError)
    }

    // Calculate actual layout for automatic mode
    const finalGridLayout = gridLayout === 'auto'
      ? getAutoLayout(sortedAssets.length)
      : gridLayout

    // Create the moodboard
    const { data: moodboard, error: moodboardError } = await supabase
      .from('moodboards')
      .insert({
        conversation_id: conversationId,
        title: aiTitle,
        description: aiDescription,
        created_by_id: session.user.id,
        created_by_name: session.user.name || session.user.email,
        background_color: backgroundColor,
        grid_layout: finalGridLayout,
        border_enabled: borderEnabled,
        border_color: borderColor,
        border_radius: borderRadius,
        border_width: borderWidth,
        spacing: spacing,
        aspect_ratio: aspectRatio,
        moodboard_type: isFreeform ? 'freeform' : 'grid',
      })
      .select()
      .single()

    if (moodboardError || !moodboard) {
      console.error('Failed to create moodboard:', moodboardError)
      return NextResponse.json({ error: 'Failed to create moodboard' }, { status: 500 })
    }

    // Add images to the moodboard
    const moodboardImages = sortedAssets.map((item, index) => {
      const baseImage = {
        moodboard_id: moodboard.id,
        asset_id: item.asset.id,
        position: index,
        score: item.score,
      }

      // Add freeform positioning data if in freeform mode
      if (isFreeform) {
        const freeformData = freeformImageData.find(f => f.assetId === item.asset.id)
        if (freeformData) {
          return {
            ...baseImage,
            x: freeformData.x,
            y: freeformData.y,
            width: freeformData.width,
            height: freeformData.height,
            rotation: freeformData.rotation,
            z_index: freeformData.zIndex,
          }
        }
      }

      return baseImage
    })

    const { error: imagesError } = await supabase
      .from('moodboard_images')
      .insert(moodboardImages)

    if (imagesError) {
      console.error('Failed to add images to moodboard:', imagesError)
    }

    // Fetch the complete moodboard with images
    const { data: completeMoodboard } = await supabase
      .from('moodboards')
      .select(`
        *,
        images:moodboard_images(
          *,
          asset:project_assets(*)
        )
      `)
      .eq('id', moodboard.id)
      .single()

    return NextResponse.json(completeMoodboard)
  } catch (error) {
    console.error('Moodboard creation error:', error)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  try {
    const session = await requireSession()
    const supabase = await createServiceClient()
    const { conversationId } = await params

    const { searchParams } = new URL(request.url)
    const moodboardId = searchParams.get('moodboardId')

    if (!moodboardId) {
      return NextResponse.json({ error: 'Moodboard ID required' }, { status: 400 })
    }

    // Verify moodboard exists and belongs to this conversation
    const { data: moodboard } = await supabase
      .from('moodboards')
      .select('id, created_by_id')
      .eq('id', moodboardId)
      .eq('conversation_id', conversationId)
      .single()

    if (!moodboard) {
      return NextResponse.json({ error: 'Moodboard not found' }, { status: 404 })
    }

    // Check if user can delete (creator or project owner/creative)
    const { data: projectUser } = await supabase
      .from('project_users')
      .select('role, is_owner')
      .eq('project_id', conversationId)
      .eq('user_id', session.user.id)
      .single()

    const isOwnerOrCreative = projectUser?.is_owner || projectUser?.role === 'creative'
    const canDelete = moodboard.created_by_id === session.user.id || isOwnerOrCreative

    if (!canDelete) {
      return NextResponse.json({ error: 'Only the creator or project creatives can delete this moodboard' }, { status: 403 })
    }

    // Delete moodboard images first (foreign key constraint)
    await supabase
      .from('moodboard_images')
      .delete()
      .eq('moodboard_id', moodboardId)

    // Delete the moodboard
    const { error } = await supabase
      .from('moodboards')
      .delete()
      .eq('id', moodboardId)

    if (error) {
      console.error('Failed to delete moodboard:', error)
      return NextResponse.json({ error: 'Failed to delete moodboard' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
