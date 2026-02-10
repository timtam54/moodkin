import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth/session'
import { createServiceClient } from '@/lib/supabase/server'
import { isProjectMember } from '@/lib/auth/project-access'
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
    const {
      backgroundColor = '#1A1A1A',
      gridLayout = '2x2',
      borderEnabled = true,
      borderColor = '#FFFFFF',
      borderRadius = 12,
      borderWidth = 0,
      spacing = 8,
    } = body

    // Get conversation title
    const { data: conv } = await supabase
      .from('conversations')
      .select('title')
      .eq('id', conversationId)
      .single()
    const conversationTitle = conv?.title || 'Untitled'

    // Get all images (not links) for this project
    const { data: assets } = await supabase
      .from('project_assets')
      .select('*')
      .eq('conversation_id', conversationId)
      .neq('asset_type', 'link')

    if (!assets || assets.length === 0) {
      return NextResponse.json({ error: 'No images to create moodboard' }, { status: 400 })
    }

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
    const sortedAssets = assetScores
      .filter(a => a.score >= -2) // Exclude images with too many flags
      .sort((a, b) => b.score - a.score)

    if (sortedAssets.length === 0) {
      return NextResponse.json({ error: 'No suitable images for moodboard' }, { status: 400 })
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
        grid_layout: gridLayout,
        border_enabled: borderEnabled,
        border_color: borderColor,
        border_radius: borderRadius,
        border_width: borderWidth,
        spacing: spacing,
      })
      .select()
      .single()

    if (moodboardError || !moodboard) {
      console.error('Failed to create moodboard:', moodboardError)
      return NextResponse.json({ error: 'Failed to create moodboard' }, { status: 500 })
    }

    // Add images to the moodboard
    const moodboardImages = sortedAssets.map((item, index) => ({
      moodboard_id: moodboard.id,
      asset_id: item.asset.id,
      position: index,
      score: item.score,
    }))

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
