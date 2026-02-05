import { NextRequest, NextResponse } from 'next/server'
import { createSession } from '@/lib/auth/session'
import { createServiceClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json()

    if (!token || typeof token !== 'string') {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 })
    }

    const supabase = await createServiceClient()

    // Look up token
    const { data: invite } = await supabase
      .from('client_invite_tokens')
      .select('*')
      .eq('token', token)
      .single()

    if (!invite) {
      return NextResponse.json({ error: 'Invalid invite token' }, { status: 404 })
    }

    // Check expiry
    if (new Date(invite.expires_at) < new Date()) {
      // Clean up expired token
      await supabase
        .from('client_invite_tokens')
        .delete()
        .eq('id', invite.id)

      return NextResponse.json({ error: 'Invite token has expired' }, { status: 410 })
    }

    // Create session
    await createSession(invite.user_id)

    // Delete token (single use)
    await supabase
      .from('client_invite_tokens')
      .delete()
      .eq('id', invite.id)

    return NextResponse.json({
      conversationId: invite.conversation_id,
    })
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}
