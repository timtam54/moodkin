import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { createServiceClient } from '@/lib/supabase/server'

export async function PATCH(request: Request) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { name?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const name = typeof body.name === 'string' ? body.name.trim() : ''
  if (!name) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 })
  }
  if (name.length > 120) {
    return NextResponse.json({ error: 'Name is too long' }, { status: 400 })
  }

  const supabase = await createServiceClient()
  const { error } = await supabase
    .from('users')
    .update({ name, updated_at: new Date().toISOString() })
    .eq('id', session.user.id)

  if (error) {
    console.error('[users/me] update failed', error)
    return NextResponse.json({ error: 'Could not update profile' }, { status: 500 })
  }

  return NextResponse.json({ status: 'ok', name })
}
