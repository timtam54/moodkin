import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth/session'
import { createServiceClient } from '@/lib/supabase/server'
import { updateConversationSchema } from '@/lib/validators/conversation'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  try {
    const session = await requireSession()
    const supabase = await createServiceClient()
    const { conversationId } = await params

    // For clients, also check project_users for invite-based access
    if (session.user.role === 'client') {
      // Check if user has access via project_users (invite)
      const { data: projectUser } = await supabase
        .from('project_users')
        .select('id')
        .eq('project_id', conversationId)
        .eq('email', session.user.email)
        .eq('invite_status', 'accepted')
        .single()

      // Also check if they're the direct client
      const { data, error } = await supabase
        .from('conversations')
        .select(`
          *,
          client:clients(id, name, email),
          photographer:photographers(id, name, email)
        `)
        .eq('id', conversationId)
        .single()

      if (error || !data) {
        return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
      }

      // Allow access if user is the direct client OR has accepted invite
      const isDirectClient = data.client_id === session.user.id
      const hasInviteAccess = !!projectUser

      if (!isDirectClient && !hasInviteAccess) {
        return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
      }

      return NextResponse.json(data)
    }

    // Photographer access
    const { data, error } = await supabase
      .from('conversations')
      .select(`
        *,
        client:clients(id, name, email),
        photographer:photographers(id, name, email)
      `)
      .eq('id', conversationId)
      .eq('photographer_id', session.user.id)
      .single()

    if (error || !data) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
    }

    return NextResponse.json(data)
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

    if (session.user.role !== 'photographer') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const parsed = updateConversationSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('conversations')
      .update(parsed.data)
      .eq('id', conversationId)
      .eq('photographer_id', session.user.id)
      .select()
      .single()

    if (error || !data) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
    }

    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  try {
    const session = await requireSession()
    const supabase = await createServiceClient()
    const { conversationId } = await params

    if (session.user.role !== 'photographer') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { error } = await supabase
      .from('conversations')
      .delete()
      .eq('id', conversationId)
      .eq('photographer_id', session.user.id)

    if (error) {
      return NextResponse.json({ error: 'Failed to delete conversation' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
