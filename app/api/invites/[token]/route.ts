import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

// GET invite details by token (public - no auth required to view invite)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params
    const supabase = await createServiceClient()

    // Get invite with project and inviter details
    const { data: invite, error } = await supabase
      .from('project_users')
      .select(`
        id,
        project_id,
        email,
        role,
        invite_status,
        invited_by_id
      `)
      .eq('invite_token', token)
      .single()

    if (error || !invite) {
      return NextResponse.json({ error: 'Invite not found or has expired' }, { status: 404 })
    }

    // Get project title
    const { data: project } = await supabase
      .from('conversations')
      .select('title')
      .eq('id', invite.project_id)
      .single()

    // Get inviter name
    const { data: inviter } = await supabase
      .from('photographers')
      .select('name, email')
      .eq('id', invite.invited_by_id)
      .single()

    return NextResponse.json({
      ...invite,
      project_title: project?.title,
      inviter_name: inviter?.name || inviter?.email,
    })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
