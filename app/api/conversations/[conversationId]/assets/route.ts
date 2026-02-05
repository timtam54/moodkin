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

    // Allow delete if user uploaded it or is the project owner
    const isOwner = await isProjectOwner(supabase, conversationId, session.user.id)
    const canDelete = asset.uploaded_by_id === session.user.id || isOwner

    if (!canDelete) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { error } = await supabase
      .from('project_assets')
      .delete()
      .eq('id', assetId)

    if (error) {
      return NextResponse.json({ error: 'Failed to delete asset' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
