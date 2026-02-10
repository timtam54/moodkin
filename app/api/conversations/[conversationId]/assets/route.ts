import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth/session'
import { createServiceClient } from '@/lib/supabase/server'
import { extractColorsFromUrl } from '@/lib/utils/extract-colors'
import { isProjectMember, isProjectOwner } from '@/lib/auth/project-access'
import { z } from 'zod'

const createAssetSchema = z.object({
  url: z.string().url(),
  filename: z.string(),
  asset_type: z.enum(['image', 'link']).default('image'),
  title: z.string().optional(),
  thumbnail_url: z.string().url().optional().nullable(),
})

const updateCreativeSchema = z.object({
  assetId: z.string().uuid(),
  creative: z.boolean(),
})

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  try {
    const session = await requireSession()
    const supabase = await createServiceClient()
    const { conversationId } = await params

    const hasAccess = await isProjectMember(supabase, conversationId, session.user.id)
    if (!hasAccess) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
    }

    const { data: assets, error } = await supabase
      .from('project_assets')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch assets' }, { status: 500 })
    }

    return NextResponse.json(assets)
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

    const hasAccess = await isProjectMember(supabase, conversationId, session.user.id)
    if (!hasAccess) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
    }

    const body = await request.json()
    const parsed = createAssetSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }

    // Extract color palette for image assets
    let colorPalette: string[] | null = null
    if (parsed.data.asset_type === 'image') {
      colorPalette = await extractColorsFromUrl(parsed.data.url)
      if (colorPalette.length === 0) colorPalette = null
    }

    // Check if user is a creative (owner or creative role)
    const { data: projectUser } = await supabase
      .from('project_users')
      .select('role, is_owner')
      .eq('project_id', conversationId)
      .eq('user_id', session.user.id)
      .single()

    const isCreative = projectUser?.is_owner || projectUser?.role === 'creative'

    const { data: asset, error } = await supabase
      .from('project_assets')
      .insert({
        conversation_id: conversationId,
        url: parsed.data.url,
        filename: parsed.data.filename || '',
        asset_type: parsed.data.asset_type,
        title: parsed.data.title || null,
        thumbnail_url: parsed.data.thumbnail_url || null,
        color_palette: colorPalette,
        uploaded_by_id: session.user.id,
        uploaded_by_name: session.user.name || session.user.email,
        creative: isCreative,
      })
      .select()
      .single()

    if (error) {
      console.error('Failed to create asset:', error)
      return NextResponse.json({ error: error.message || 'Failed to save asset' }, { status: 500 })
    }

    return NextResponse.json(asset)
  } catch {
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
    const assetId = searchParams.get('assetId')

    if (!assetId) {
      return NextResponse.json({ error: 'Asset ID required' }, { status: 400 })
    }

    // Verify asset exists in this conversation
    const { data: asset } = await supabase
      .from('project_assets')
      .select('id, uploaded_by_id')
      .eq('id', assetId)
      .eq('conversation_id', conversationId)
      .single()

    if (!asset) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 })
    }

    // Allow delete if user uploaded it, is the project owner, or is a creative
    const { data: projectUser } = await supabase
      .from('project_users')
      .select('role, is_owner')
      .eq('project_id', conversationId)
      .eq('user_id', session.user.id)
      .single()

    const isOwnerOrCreative = projectUser?.is_owner || projectUser?.role === 'creative'
    const canDelete = asset.uploaded_by_id === session.user.id || isOwnerOrCreative

    if (!canDelete) {
      return NextResponse.json({
        error: 'Only the uploader or project creatives can delete this image'
      }, { status: 403 })
    }

    // Delete related records first (foreign key constraints)
    // Delete reactions
    await supabase
      .from('asset_reactions')
      .delete()
      .eq('asset_id', assetId)

    // Delete comments
    await supabase
      .from('asset_comments')
      .delete()
      .eq('asset_id', assetId)

    // Delete from moodboard_images
    await supabase
      .from('moodboard_images')
      .delete()
      .eq('asset_id', assetId)

    // Now delete the asset
    const { error } = await supabase
      .from('project_assets')
      .delete()
      .eq('id', assetId)

    if (error) {
      console.error('Failed to delete asset:', error)
      return NextResponse.json({ error: 'Failed to delete asset' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  try {
    const session = await requireSession()
    const supabase = await createServiceClient()
    const { conversationId } = await params

    const hasAccess = await isProjectMember(supabase, conversationId, session.user.id)
    if (!hasAccess) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
    }

    const body = await request.json()
    const parsed = updateCreativeSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }

    // Verify asset exists in this conversation
    const { data: asset } = await supabase
      .from('project_assets')
      .select('id')
      .eq('id', parsed.data.assetId)
      .eq('conversation_id', conversationId)
      .single()

    if (!asset) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 })
    }

    const { data: updatedAsset, error } = await supabase
      .from('project_assets')
      .update({ creative: parsed.data.creative })
      .eq('id', parsed.data.assetId)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: 'Failed to update asset' }, { status: 500 })
    }

    return NextResponse.json(updatedAsset)
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
