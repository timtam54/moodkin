import { NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth/session'
import { createServiceClient } from '@/lib/supabase/server'
import { getCurrentMonthString, subscriptionConfig } from '@/lib/config/subscription'

export async function GET() {
  try {
    const session = await requireSession()
    const supabase = await createServiceClient()
    const userId = session.user.id
    const currentMonth = getCurrentMonthString()

    // Get user's current count and reset month
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('ai_images_count, ai_count_reset_month')
      .eq('id', userId)
      .single()

    if (userError) {
      console.error('Failed to fetch user:', userError)
      return NextResponse.json({ error: 'Failed to fetch user data' }, { status: 500 })
    }

    const storedMonth = user?.ai_count_reset_month
    let count = user?.ai_images_count || 0

    // If it's a new month, reset the count
    if (storedMonth !== currentMonth) {
      await supabase
        .from('users')
        .update({
          ai_images_count: 0,
          ai_count_reset_month: currentMonth
        })
        .eq('id', userId)

      count = 0
    }

    const now = new Date()
    const limit = subscriptionConfig.features.aiImagesPerMonth

    return NextResponse.json({
      count,
      limit,
      month: now.toLocaleString('default', { month: 'long', year: 'numeric' }),
      quotaExceeded: count >= limit,
    })
  } catch (err) {
    console.error('AI image count error:', err)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
