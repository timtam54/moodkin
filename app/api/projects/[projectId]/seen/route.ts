import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth/session'
import { createServiceClient } from '@/lib/supabase/server'

type TabType = 'project' | 'client' | 'creative' | 'links' | 'conversations'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const session = await requireSession()
    const supabase = await createServiceClient()
    const { projectId } = await params
    const userId = session.user.id

    const body = await request.json()
    const tabType: TabType = body.tab || 'project'

    // Validate tab type
    const validTabs: TabType[] = ['project', 'client', 'creative', 'links', 'conversations']
    if (!validTabs.includes(tabType)) {
      return NextResponse.json({ error: 'Invalid tab type' }, { status: 400 })
    }

    // Verify user has access to this project
    const { data: access } = await supabase
      .from('project_users')
      .select('id')
      .eq('project_id', projectId)
      .eq('user_id', userId)
      .eq('invite_status', 'accepted')
      .single()

    if (!access) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Upsert the last seen record
    const { error } = await supabase
      .from('project_last_seen')
      .upsert(
        {
          project_id: projectId,
          user_id: userId,
          tab_type: tabType,
          last_seen_at: new Date().toISOString(),
        },
        {
          onConflict: 'project_id,user_id,tab_type',
        }
      )

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
