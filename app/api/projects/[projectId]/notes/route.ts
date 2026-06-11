import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth/session'
import { createServiceClient } from '@/lib/supabase/server'
import { isProjectMember } from '@/lib/auth/project-access'
import { z } from 'zod'

const updateNoteSchema = z.object({
  content: z.string().max(200_000),
})

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const session = await requireSession()
    const supabase = await createServiceClient()
    const { projectId } = await params

    const hasAccess = await isProjectMember(supabase, projectId, session.user.id)
    if (!hasAccess) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    const { data: note, error } = await supabase
      .from('project_notes')
      .select('*')
      .eq('conversation_id', projectId)
      .maybeSingle()

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch note' }, { status: 500 })
    }

    return NextResponse.json(note ?? { content: '', conversation_id: projectId })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const session = await requireSession()
    const supabase = await createServiceClient()
    const { projectId } = await params

    const hasAccess = await isProjectMember(supabase, projectId, session.user.id)
    if (!hasAccess) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    const body = await request.json()
    const parsed = updateNoteSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }

    const { data: note, error } = await supabase
      .from('project_notes')
      .upsert(
        {
          conversation_id: projectId,
          content: parsed.data.content,
          updated_by_id: session.user.id,
          updated_by_name: session.user.name || session.user.email,
        },
        { onConflict: 'conversation_id' }
      )
      .select()
      .single()

    if (error) {
      console.error('Failed to save note:', error)
      return NextResponse.json({ error: error.message || 'Failed to save note' }, { status: 500 })
    }

    return NextResponse.json(note)
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
