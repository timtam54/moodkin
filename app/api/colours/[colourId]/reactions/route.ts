import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth/session'
import { createServiceClient } from '@/lib/supabase/server'
import { z } from 'zod'

const reactionSchema = z.object({
  reaction_type: z.enum(['like', 'redflag']),
})

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ colourId: string }> }
) {
  try {
    await requireSession()
    const supabase = await createServiceClient()
    const { colourId } = await params

    const { data: reactions, error } = await supabase
      .from('colour_reactions')
      .select('*')
      .eq('colour_id', colourId)

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch reactions' }, { status: 500 })
    }

    return NextResponse.json(reactions)
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
    const parsed = reactionSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }

    const { data: reaction, error } = await supabase
      .from('colour_reactions')
      .insert({
        colour_id: colourId,
        user_id: session.user.id,
        user_name: session.user.name || session.user.email,
        reaction_type: parsed.data.reaction_type,
      })
      .select()
      .single()

    if (error) {
      // Handle unique constraint violation (user already reacted)
      if (error.code === '23505') {
        return NextResponse.json({ error: 'Already reacted' }, { status: 409 })
      }
      return NextResponse.json({ error: 'Failed to add reaction' }, { status: 500 })
    }

    return NextResponse.json(reaction)
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ colourId: string }> }
) {
  try {
    const session = await requireSession()
    const supabase = await createServiceClient()
    const { colourId } = await params

    const { searchParams } = new URL(request.url)
    const reactionType = searchParams.get('type')

    if (!reactionType) {
      return NextResponse.json({ error: 'Reaction type required' }, { status: 400 })
    }

    const { error } = await supabase
      .from('colour_reactions')
      .delete()
      .eq('colour_id', colourId)
      .eq('user_id', session.user.id)
      .eq('reaction_type', reactionType)

    if (error) {
      return NextResponse.json({ error: 'Failed to remove reaction' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
