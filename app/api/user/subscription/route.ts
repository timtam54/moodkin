import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth/session'
import { createServiceClient } from '@/lib/supabase/server'

export async function PATCH(request: NextRequest) {
  try {
    const session = await requireSession()
    const supabase = await createServiceClient()

    const body = await request.json()
    const { subscribed } = body as { subscribed: boolean }

    const stripeid = subscribed ? 'subscribed' : null

    const { error } = await supabase
      .from('users')
      .update({ stripeid })
      .eq('id', session.user.id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, stripeid })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
