import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth/session'
import { createServiceClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const session = await requireSession()
    const supabase = await createServiceClient()

    const search = request.nextUrl.searchParams.get('search')

    // Find projects this user owns
    const { data: ownedProjects } = await supabase
      .from('project_users')
      .select('project_id')
      .eq('user_id', session.user.id)
      .eq('is_owner', true)

    const projectIds = ownedProjects?.map(p => p.project_id) || []

    if (projectIds.length === 0) {
      return NextResponse.json([])
    }

    // Find distinct users who are clients on those projects
    const { data: clientEntries } = await supabase
      .from('project_users')
      .select('user_id')
      .in('project_id', projectIds)
      .eq('role', 'client')
      .not('user_id', 'is', null)

    const userIds = [...new Set(clientEntries?.map(c => c.user_id).filter(Boolean) || [])]

    if (userIds.length === 0) {
      return NextResponse.json([])
    }

    let query = supabase
      .from('users')
      .select('*')
      .in('id', userIds)
      .order('created_at', { ascending: false })

    if (search) {
      query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%`)
    }

    const { data, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
