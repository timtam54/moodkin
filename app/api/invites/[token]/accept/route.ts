import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth/session'
import { createServiceClient } from '@/lib/supabase/server'

// POST - Accept invite
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params
    const session = await requireSession()
    const supabase = await createServiceClient()

    // Get the invite
    const { data: invite, error: inviteError } = await supabase
      .from('project_users')
      .select('*')
      .eq('invite_token', token)
      .single()

    if (inviteError || !invite) {
      return NextResponse.json({ error: 'Invite not found or has expired' }, { status: 404 })
    }

    // Check if already accepted
    if (invite.invite_status === 'accepted') {
      return NextResponse.json({ error: 'This invite has already been accepted' }, { status: 400 })
    }

    // Get user's email from session (already fetched during auth)
    const userEmail = session.user.email

    // Verify the invite email matches (case-insensitive)
    if (!userEmail || userEmail.toLowerCase() !== invite.email.toLowerCase()) {
      return NextResponse.json({
        error: `This invite was sent to ${invite.email}. Please sign in with that email address.`
      }, { status: 403 })
    }

    // Accept the invite
    const { error: updateError } = await supabase
      .from('project_users')
      .update({
        invite_status: 'accepted',
        accepted_at: new Date().toISOString(),
        user_id: session.user.id,
      })
      .eq('id', invite.id)

    if (updateError) {
      console.error('Error accepting invite:', updateError)
      return NextResponse.json({ error: 'Failed to accept invite' }, { status: 500 })
    }

    return NextResponse.json({ success: true, project_id: invite.project_id })
  } catch {
    return NextResponse.json({ error: 'Please sign in to accept this invite' }, { status: 401 })
  }
}
