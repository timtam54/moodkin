import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth/session'
import { createServiceClient } from '@/lib/supabase/server'
import { z } from 'zod'

const commentSchema = z.object({
  content: z.string().min(1).max(1000),
})

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ colourId: string }> }
) {
  try {
    await requireSession()
    const supabase = await createServiceClient()
    const { colourId } = await params

    const { data: comments, error } = await supabase
      .from('colour_comments')
      .select('*')
      .eq('colour_id', colourId)
      .order('created_at', { ascending: true })

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch comments' }, { status: 500 })
    }

    return NextResponse.json(comments)
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ colourId: string }> }
) {
  try {
    const session = await requireSession()
    const supabase = await createServiceClient()
    const { colourId } = await params

    const body = await request.json()
    const parsed = commentSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }

    const { data: comment, error } = await supabase
      .from('colour_comments')
      .insert({
        colour_id: colourId,
        user_id: session.user.id,
        user_name: session.user.name || session.user.email,
        content: parsed.data.content,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: 'Failed to add comment' }, { status: 500 })
    }

    return NextResponse.json(comment)
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
