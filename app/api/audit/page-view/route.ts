import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { createServiceClient } from '@/lib/supabase/server'
import { parseUserAgent } from '@/lib/audit/parse-ua'

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ success: true })
  }

  let body: { path?: string; isPwa?: boolean }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  const path = typeof body.path === 'string' ? body.path.slice(0, 500) : null
  if (!path) {
    return NextResponse.json({ error: 'path required' }, { status: 400 })
  }

  const ua = request.headers.get('user-agent') || ''
  const parsed = parseUserAgent(ua)

  const supabase = await createServiceClient()
  const { error } = await supabase.from('page_views').insert({
    user_id: session.user.id,
    path,
    user_agent: ua.slice(0, 1000),
    platform: parsed.platform,
    browser: parsed.browser,
    os: parsed.os,
    is_pwa: Boolean(body.isPwa),
  })

  if (error) {
    console.error('[page-view] insert failed', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
