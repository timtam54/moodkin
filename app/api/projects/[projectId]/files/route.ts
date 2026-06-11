import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth/session'
import { createServiceClient } from '@/lib/supabase/server'
import { isProjectMember, getProjectMemberInfo } from '@/lib/auth/project-access'
import { z } from 'zod'

const createFileSchema = z.object({
  url: z.string().url(),
  filename: z.string().min(1).max(255),
  mime_type: z.string().max(150).optional(),
  size_bytes: z.number().int().nonnegative().optional(),
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

    const { data: files, error } = await supabase
      .from('project_files')
      .select('*')
      .eq('conversation_id', projectId)
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch files' }, { status: 500 })
    }

    return NextResponse.json(files)
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
    const parsed = createFileSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }

    const { data: file, error } = await supabase
      .from('project_files')
      .insert({
        conversation_id: projectId,
        url: parsed.data.url,
        filename: parsed.data.filename,
        mime_type: parsed.data.mime_type || null,
        size_bytes: parsed.data.size_bytes ?? null,
        uploaded_by_id: session.user.id,
        uploaded_by_name: session.user.name || session.user.email,
      })
      .select()
      .single()

    if (error) {
      console.error('Failed to create file:', error)
      return NextResponse.json({ error: error.message || 'Failed to save file' }, { status: 500 })
    }

    return NextResponse.json(file)
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
    const fileId = searchParams.get('fileId')
    if (!fileId) {
      return NextResponse.json({ error: 'File ID required' }, { status: 400 })
    }

    const { data: file } = await supabase
      .from('project_files')
      .select('id, uploaded_by_id')
      .eq('id', fileId)
      .eq('conversation_id', projectId)
      .single()

    if (!file) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 })
    }

    const member = await getProjectMemberInfo(supabase, projectId, session.user.id)
    const canDelete =
      file.uploaded_by_id === session.user.id ||
      (member && (member.role === 'creative' || member.isOwner))

    if (!canDelete) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { error } = await supabase
      .from('project_files')
      .delete()
      .eq('id', fileId)

    if (error) {
      return NextResponse.json({ error: 'Failed to delete file' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
