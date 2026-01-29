import { NextRequest, NextResponse } from 'next/server'
import { destroySession } from '@/lib/auth/session'

export async function POST(request: NextRequest) {
  await destroySession()
  return NextResponse.json({ success: true })
}

export async function GET(request: NextRequest) {
  await destroySession()
  return NextResponse.redirect(new URL('/', request.url))
}
