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

    let query = supabase
      .from('conversations')
      .select(`
        *,
        client:clients(id, name, email),
        photographer:photographers(id, name, email)
      `)
      .eq('id', conversationId)

    // Scope by role
    if (session.user.role === 'photographer') {
      query = query.eq('photographer_id', session.user.id)
    } else {
      query = query.eq('client_id', session.user.id)
    }

    const { data, error } = await query.single()

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
