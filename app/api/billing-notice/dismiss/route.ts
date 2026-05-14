import { NextResponse } from 'next/server'
import { clearBillingNotice } from '@/lib/auth/session'

export async function POST() {
  await clearBillingNotice()
  return NextResponse.json({ success: true })
}
