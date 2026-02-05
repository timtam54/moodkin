import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth/session'
import { createServiceClient } from '@/lib/supabase/server'
import { sendMessageSchema } from '@/lib/validators/message'
import { isProjectMember } from '@/lib/auth/project-access'
import { sendPushToProjectMembers } from '@/lib/push'

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
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
    }

    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  try {
    const session = await requireSession()
    const supabase = await createServiceClient()
    const { conversationId } = await params

    // Verify access
    const hasAccess = await isProjectMember(supabase, conversationId, session.user.id)
    if (!hasAccess) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
    }

    const body = await request.json()
    const parsed = sendMessageSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_id: session.user.id,
        text_content: parsed.data.text_content || null,
        canvas_data: parsed.data.canvas_data || null,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Update conversation's updated_at
    await supabase
      .from('conversations')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', conversationId)

    // Send push notifications to other project members (fire-and-forget)
    const { data: conversation } = await supabase
      .from('conversations')
      .select('title')
      .eq('id', conversationId)
      .single()

    sendPushToProjectMembers(supabase, conversationId, session.user.id, {
      title: conversation?.title || 'New message',
      body: parsed.data.text_content
        ? parsed.data.text_content.slice(0, 100)
        : 'Canvas updated',
      conversationId,
    }).catch(() => {})

    return NextResponse.json(data, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
