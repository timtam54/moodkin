import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth/session'
import { createServiceClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    await requireSession()
    const supabase = await createServiceClient()

    // Get conversationId from query params
    const { searchParams } = new URL(request.url)
    const conversationId = searchParams.get('conversationId')

    if (!conversationId) {
      return NextResponse.json({ error: 'conversationId is required' }, { status: 400 })
    }

    // Get the project owner from project_users table
    const { data: projectOwner, error: ownerError } = await supabase
      .from('project_users')
      .select('user_id')
      .eq('project_id', conversationId)
      .eq('is_owner', true)
      .single()

    if (ownerError || !projectOwner) {
      console.error('Failed to fetch project owner:', ownerError)
      return NextResponse.json({ error: 'Project owner not found' }, { status: 404 })
    }

    const ownerId = projectOwner.user_id

    // Get the owner's name
    const { data: owner } = await supabase
      .from('users')
      .select('name, email')
      .eq('id', ownerId)
      .single()

    const ownerName = owner?.name || owner?.email || 'Unknown'

    // Get the first day of the current month
    const now = new Date()
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const firstDayISO = firstDayOfMonth.toISOString()

    // Get all projects owned by this project's owner
    const { data: ownedProjects, error: projectsError } = await supabase
      .from('project_users')
      .select('project_id')
      .eq('user_id', ownerId)
      .eq('is_owner', true)

    if (projectsError) {
      console.error('Failed to fetch owned projects:', projectsError)
      return NextResponse.json({ error: 'Failed to fetch projects' }, { status: 500 })
    }

    if (!ownedProjects || ownedProjects.length === 0) {
      return NextResponse.json({
        count: 0,
        month: now.toLocaleString('default', { month: 'long', year: 'numeric' }),
        ownerName,
      })
    }

    const projectIds = ownedProjects.map(p => p.project_id)

    // Count AI-generated images in those projects created this month
    const { count, error: countError } = await supabase
      .from('project_assets')
      .select('*', { count: 'exact', head: true })
      .in('conversation_id', projectIds)
      .eq('ai_generated', true)
      .gte('created_at', firstDayISO)

    if (countError) {
      console.error('Failed to count AI images:', countError)
      return NextResponse.json({ error: 'Failed to count images' }, { status: 500 })
    }

    return NextResponse.json({
      count: count || 0,
      month: now.toLocaleString('default', { month: 'long', year: 'numeric' }),
      ownerName,
    })
  } catch (err) {
    console.error('AI image count error:', err)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
