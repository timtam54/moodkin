import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth/session'
import { createServiceClient } from '@/lib/supabase/server'
import { isProjectMember } from '@/lib/auth/project-access'
import { z } from 'zod'

const createColourSchema = z.object({
  hex_color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid hex color'),
  name: z.string().max(100).optional(),
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

    const { data: colours, error } = await supabase
      .from('project_colours')
      .select('*')
      .eq('conversation_id', projectId)
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch colours' }, { status: 500 })
    }

    return NextResponse.json(colours)
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}

export async function POST(
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
    const parsed = createColourSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }

    const { data: colour, error } = await supabase
      .from('project_colours')
      .insert({
        conversation_id: projectId,
        hex_color: parsed.data.hex_color.toUpperCase(),
        name: parsed.data.name || null,
        added_by_id: session.user.id,
        added_by_name: session.user.name || session.user.email,
      })
      .select()
      .single()

    if (error) {
      console.error('Failed to create colour:', error)
      return NextResponse.json({ error: error.message || 'Failed to save colour' }, { status: 500 })
    }

    return NextResponse.json(colour)
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const session = await requireSession()
    const supabase = await createServiceClient()
    const { projectId } = await params

    const { searchParams } = new URL(request.url)
    const colourId = searchParams.get('colourId')

    if (!colourId) {
      return NextResponse.json({ error: 'Colour ID required' }, { status: 400 })
    }

    // Verify colour exists in this project and user owns it
    const { data: colour } = await supabase
      .from('project_colours')
      .select('id, added_by_id')
      .eq('id', colourId)
      .eq('conversation_id', projectId)
      .single()

    if (!colour) {
      return NextResponse.json({ error: 'Colour not found' }, { status: 404 })
    }

    if (colour.added_by_id !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { error } = await supabase
      .from('project_colours')
      .delete()
      .eq('id', colourId)

    if (error) {
      return NextResponse.json({ error: 'Failed to delete colour' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
