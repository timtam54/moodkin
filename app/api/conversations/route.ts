import { NextRequest, NextResponse } from 'next/server'
import { requireSession, requirePhotographer } from '@/lib/auth/session'
import { createServiceClient } from '@/lib/supabase/server'
import { createConversationSchema } from '@/lib/validators/conversation'

export async function GET() {
  try {
    const session = await requireSession()
    const supabase = await createServiceClient()

    // For photographers, return their conversations
    if (session.user.role === 'photographer') {
      const { data, error } = await supabase
        .from('conversations')
        .select(`
          *,
          client:clients(id, name, email)
        `)
        .eq('photographer_id', session.user.id)
        .order('updated_at', { ascending: false })

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json(data)
    }

    // For clients, return conversations they have access to via project_users
    const { data: projectAccess, error: accessError } = await supabase
      .from('project_users')
      .select('project_id')
      .eq('email', session.user.email)
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
      .select(`
        *,
        photographer:photographers(id, name, email)
      `)
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
    const session = await requirePhotographer()
    const supabase = await createServiceClient()

    const body = await request.json()
    const parsed = createConversationSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }

    // Verify client belongs to this photographer
    const { data: client } = await supabase
      .from('clients')
      .select('id')
      .eq('id', parsed.data.client_id)
      .eq('photographer_id', session.user.id)
      .single()

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    const { data, error } = await supabase
      .from('conversations')
      .insert({
        ...parsed.data,
        photographer_id: session.user.id,
      })
      .select(`
        *,
        client:clients(id, name, email)
      `)
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
