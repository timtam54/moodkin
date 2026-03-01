import { NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth/session'
import { createServiceClient } from '@/lib/supabase/server'

export async function PATCH() {
  try {
    const session = await requireSession()
    const supabase = await createServiceClient()

    const { error } = await supabase
      .from('users')
      .update({ tour_displayed: true })
      .eq('id', session.user.id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, tour_displayed: true })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}

export async function DELETE() {
  try {
    const session = await requireSession()
    const supabase = await createServiceClient()

    const { error } = await supabase
      .from('users')
      .update({ tour_displayed: null })
      .eq('id', session.user.id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, tour_displayed: null })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
