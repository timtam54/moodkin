import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth/session'
import { createServiceClient } from '@/lib/supabase/server'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  try {
    const session = await requireSession()
    const supabase = await createServiceClient()
    const { clientId } = await params

    // Get projects where the current user is owner
    const { data: ownedProjects } = await supabase
      .from('project_users')
      .select('project_id')
      .eq('user_id', session.user.id)
      .eq('is_owner', true)

    const projectIds = ownedProjects?.map(p => p.project_id) || []

    if (projectIds.length === 0) {
      return NextResponse.json([])
    }

    // Get projects where this client is a member
    const { data: clientProjects } = await supabase
      .from('project_users')
      .select('project_id')
      .in('project_id', projectIds)
      .eq('user_id', clientId)
      .eq('role', 'client')

    const clientProjectIds = clientProjects?.map(p => p.project_id) || []

    if (clientProjectIds.length === 0) {
      return NextResponse.json([])
    }

    // Fetch the actual project details
    const { data: projects, error } = await supabase
      .from('conversations')
      .select('*')
      .in('id', clientProjectIds)
      .order('updated_at', { ascending: false })

    if (error) {
      console.error('Error fetching client projects:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(projects || [])
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
