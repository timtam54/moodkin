import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth/session'
import { createServiceClient } from '@/lib/supabase/server'
import type { CreativeClientType } from '@/types/database'

export async function PATCH(request: NextRequest) {
  try {
    const session = await requireSession()
    const supabase = await createServiceClient()

    const body = await request.json()
    const { type } = body as { type: CreativeClientType }

    if (type !== 'creative' && type !== 'client') {
      return NextResponse.json(
        { error: 'Invalid type. Must be "creative" or "client"' },
        { status: 400 }
      )
    }

    const { error } = await supabase
      .from('users')
      .update({ creative_client: type })
      .eq('id', session.user.id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, type })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
