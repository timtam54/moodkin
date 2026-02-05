import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth/session'
import { createServiceClient } from '@/lib/supabase/server'
import { updateConversationSchema } from '@/lib/validators/conversation'
import { isProjectMember, isProjectOwner } from '@/lib/auth/project-access'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  try {
    const session = await requireSession()
    const supabase = await createServiceClient()
    const { conversationId } = await params

    // Check access via project_users
    const hasAccess = await isProjectMember(supabase, conversationId, session.user.id)
    if (!hasAccess) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
    }

    const { data, error } = await supabase
      .from('conversations')
      .select('*')
      .eq('id', conversationId)
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

    const isOwner = await isProjectOwner(supabase, conversationId, session.user.id)
    if (!isOwner) {
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

    const isOwner = await isProjectOwner(supabase, conversationId, session.user.id)
    if (!isOwner) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { error } = await supabase
      .from('conversations')
      .delete()
      .eq('id', conversationId)

    if (error) {
      return NextResponse.json({ error: 'Failed to delete conversation' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
