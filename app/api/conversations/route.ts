import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth/session'
import { createServiceClient } from '@/lib/supabase/server'
import { createConversationSchema } from '@/lib/validators/conversation'

export async function GET() {
  try {
    const session = await requireSession()
    const supabase = await createServiceClient()

    // All users get conversations via project_users
    const { data: projectAccess, error: accessError } = await supabase
      .from('project_users')
      .select('project_id, role, is_owner')
      .eq('user_id', session.user.id)
      .eq('invite_status', 'accepted')

    if (accessError) {
      return NextResponse.json({ error: accessError.message }, { status: 500 })
    }

    const projectIds = projectAccess?.map(p => p.project_id) || []

    if (projectIds.length === 0) {
      return NextResponse.json([])
    }

    const { data, error } = await supabase
      .from('conversations')
      .select('*')
      .in('id', projectIds)
      .order('updated_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession()
    const supabase = await createServiceClient()

    const body = await request.json()
    const parsed = createConversationSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('conversations')
      .insert({
        title: parsed.data.title,
        category_id: parsed.data.category_id,
        cover_image_url: parsed.data.cover_image_url,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Auto-create project_users entry for the creator as owner
    await supabase
      .from('project_users')
      .insert({
        project_id: data.id,
        email: session.user.email,
        role: 'creative',
        user_id: session.user.id,
        invite_status: 'accepted',
        invited_by_id: session.user.id,
        is_owner: true,
        accepted_at: new Date().toISOString(),
      })

    return NextResponse.json(data, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
