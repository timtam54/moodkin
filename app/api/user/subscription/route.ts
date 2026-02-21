import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth/session'
import { createServiceClient } from '@/lib/supabase/server'

export async function PATCH(request: NextRequest) {
  try {
    const session = await requireSession()
    const supabase = await createServiceClient()

    const body = await request.json()
    const { stripeid } = body as { stripeid: string }

    // Validate that stripeid starts with 'cus_' (Stripe customer ID format)
    if (!stripeid || !stripeid.startsWith('cus_')) {
      return NextResponse.json({ error: 'Invalid customer ID' }, { status: 400 })
    }

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
