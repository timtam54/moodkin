import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth/session'
import { createServiceClient } from '@/lib/supabase/server'
import { updateClientSchema } from '@/lib/validators/client'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  try {
    const session = await requireSession()
    const supabase = await createServiceClient()
    const { clientId } = await params

    // Verify the current user shares a project with this client
    const { data: sharedProject } = await supabase
      .from('project_users')
      .select('project_id')
      .eq('user_id', session.user.id)
      .eq('is_owner', true)

    const projectIds = sharedProject?.map(p => p.project_id) || []

    if (projectIds.length === 0) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    const { data: clientAccess } = await supabase
      .from('project_users')
      .select('id')
      .in('project_id', projectIds)
      .eq('user_id', clientId)
      .eq('role', 'client')
      .limit(1)
      .single()

    if (!clientAccess) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', clientId)
      .single()

    if (error || !data) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  try {
    const session = await requireSession()
    const supabase = await createServiceClient()
    const { clientId } = await params

    const body = await request.json()
    const parsed = updateClientSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }

    // Verify the current user is an owner of a project that includes this client
    const { data: ownedProjects } = await supabase
      .from('project_users')
      .select('project_id')
      .eq('user_id', session.user.id)
      .eq('is_owner', true)

    const projectIds = ownedProjects?.map(p => p.project_id) || []

    if (projectIds.length === 0) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { data: clientAccess } = await supabase
      .from('project_users')
      .select('id')
      .in('project_id', projectIds)
      .eq('user_id', clientId)
      .eq('role', 'client')
      .limit(1)
      .single()

    if (!clientAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { data, error } = await supabase
      .from('users')
      .update(parsed.data)
      .eq('id', clientId)
      .select()
      .single()

    if (error || !data) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
