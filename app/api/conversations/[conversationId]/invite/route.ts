import { NextRequest, NextResponse } from 'next/server'
import { requirePhotographer } from '@/lib/auth/session'
import { createServiceClient } from '@/lib/supabase/server'
import { generateToken } from '@/lib/utils'

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  try {
    const session = await requirePhotographer()
    const supabase = await createServiceClient()
    const { conversationId } = await params

    // Verify photographer owns this conversation
    const { data: conversation } = await supabase
      .from('conversations')
      .select('id, client_id')
      .eq('id', conversationId)
      .eq('photographer_id', session.user.id)
      .single()

    if (!conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
    }

    const token = generateToken(48)
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days

    const { error } = await supabase
      .from('client_invite_tokens')
      .insert({
        client_id: conversation.client_id,
        conversation_id: conversationId,
        token,
        expires_at: expiresAt,
      })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const origin = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const url = `${origin}/c/invite/${token}`

    return NextResponse.json({ url, expiresAt })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
