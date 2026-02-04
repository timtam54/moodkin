import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth/session'
import { createServiceClient } from '@/lib/supabase/server'
import { z } from 'zod'

const commentSchema = z.object({
  content: z.string().min(1).max(1000),
})

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ assetId: string }> }
) {
  try {
    await requireSession()
    const supabase = await createServiceClient()
    const { assetId } = await params

    const { data: comments, error } = await supabase
      .from('asset_comments')
      .select('*')
      .eq('asset_id', assetId)
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
  { params }: { params: Promise<{ assetId: string }> }
) {
  try {
    const session = await requireSession()
    const supabase = await createServiceClient()
    const { assetId } = await params

    const body = await request.json()
    const parsed = commentSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }

    const { data: comment, error } = await supabase
      .from('asset_comments')
      .insert({
        asset_id: assetId,
        user_id: session.user.id,
        user_type: session.user.role,
        user_name: session.user.name || session.user.email,
        content: parsed.data.content,
      })
      .select()
      .single()

    if (error) {
      console.error('Failed to create comment:', error)
      return NextResponse.json({ error: 'Failed to add comment' }, { status: 500 })
    }

    return NextResponse.json(comment)
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ assetId: string }> }
) {
  try {
    const session = await requireSession()
    const supabase = await createServiceClient()
    const { assetId } = await params

    const { searchParams } = new URL(request.url)
    const commentId = searchParams.get('commentId')

    if (!commentId) {
      return NextResponse.json({ error: 'Comment ID required' }, { status: 400 })
    }

    // Only allow user to delete their own comments
    const { data: comment } = await supabase
      .from('asset_comments')
      .select('user_id')
      .eq('id', commentId)
      .eq('asset_id', assetId)
      .single()

    if (!comment) {
      return NextResponse.json({ error: 'Comment not found' }, { status: 404 })
    }

    if (comment.user_id !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { error } = await supabase
      .from('asset_comments')
      .delete()
      .eq('id', commentId)

    if (error) {
      return NextResponse.json({ error: 'Failed to delete comment' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
