import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth/session'
import { createServiceClient } from '@/lib/supabase/server'
import { isProjectMember } from '@/lib/auth/project-access'

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

    // Get all asset IDs for this project
    const { data: assets } = await supabase
      .from('project_assets')
      .select('id')
      .eq('conversation_id', conversationId)

    if (!assets || assets.length === 0) {
      return NextResponse.json([])
    }

    const assetIds = assets.map(a => a.id)

    // Get all reactions for these assets
    const { data: reactions, error } = await supabase
      .from('asset_reactions')
      .select('*')
      .in('asset_id', assetIds)

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch reactions' }, { status: 500 })
    }

    return NextResponse.json(reactions || [])
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
