import { NextRequest, NextResponse } from 'next/server'
import { requirePhotographer } from '@/lib/auth/session'
import { createServiceClient } from '@/lib/supabase/server'
import { updateClientSchema } from '@/lib/validators/client'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  try {
    const session = await requirePhotographer()
    const supabase = await createServiceClient()
    const { clientId } = await params

    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('id', clientId)
      .eq('photographer_id', session.user.id)
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
    const session = await requirePhotographer()
    const supabase = await createServiceClient()
    const { clientId } = await params

    const body = await request.json()
    const parsed = updateClientSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('clients')
      .update(parsed.data)
      .eq('id', clientId)
      .eq('photographer_id', session.user.id)
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

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  try {
    const session = await requirePhotographer()
    const supabase = await createServiceClient()
    const { clientId } = await params

    const { error } = await supabase
      .from('clients')
      .delete()
      .eq('id', clientId)
      .eq('photographer_id', session.user.id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
