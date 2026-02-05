import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth/session'
import { createServiceClient } from '@/lib/supabase/server'
import { z } from 'zod'

const reactionSchema = z.object({
  reaction_type: z.enum(['like', 'redflag']),
})

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ assetId: string }> }
) {
  try {
    await requireSession()
    const supabase = await createServiceClient()
    const { assetId } = await params

    const { data: reactions, error } = await supabase
      .from('asset_reactions')
      .select('*')
      .eq('asset_id', assetId)
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch reactions' }, { status: 500 })
    }

    return NextResponse.json(reactions)
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ assetId: string }> }
) {
  try {
    const session = await requireSession()
    const supabase = await createServiceClient()
    const { assetId } = await params

    const body = await request.json()
    const parsed = reactionSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }

    // Check if user already has this reaction type on this asset
    const { data: existing } = await supabase
      .from('asset_reactions')
      .select('id')
      .eq('asset_id', assetId)
      .eq('user_id', session.user.id)
      .eq('reaction_type', parsed.data.reaction_type)
      .single()

    // If reaction exists, toggle it off (delete) and return
    if (existing) {
      await supabase
        .from('asset_reactions')
        .delete()
        .eq('id', existing.id)

      return NextResponse.json({ toggled: 'removed', reaction_type: parsed.data.reaction_type })
    }

    // Otherwise, create the reaction
    const { data: reaction, error } = await supabase
      .from('asset_reactions')
      .insert({
        asset_id: assetId,
        user_id: session.user.id,
        user_name: session.user.name || session.user.email,
        reaction_type: parsed.data.reaction_type,
      })
      .select()
      .single()

    if (error) {
      console.error('Failed to create reaction:', error)
      return NextResponse.json({ error: 'Failed to add reaction' }, { status: 500 })
    }

    return NextResponse.json({ ...reaction, toggled: 'added' })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ assetId: string }> }
) {
  try {
    const session = await requireSession()
    const supabase = await createServiceClient()
    const { assetId } = await params

    const { searchParams } = new URL(request.url)
    const reactionType = searchParams.get('type') as 'like' | 'redflag'

    if (!reactionType) {
      return NextResponse.json({ error: 'Reaction type required' }, { status: 400 })
    }

    const { error } = await supabase
      .from('asset_reactions')
      .delete()
      .eq('asset_id', assetId)
      .eq('user_id', session.user.id)
      .eq('reaction_type', reactionType)

    if (error) {
      return NextResponse.json({ error: 'Failed to remove reaction' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
