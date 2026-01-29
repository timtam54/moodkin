import { NextRequest, NextResponse } from 'next/server'
import { requirePhotographer } from '@/lib/auth/session'
import { createServiceClient } from '@/lib/supabase/server'
import { createClientSchema } from '@/lib/validators/client'

export async function GET(request: NextRequest) {
  try {
    const session = await requirePhotographer()
    const supabase = await createServiceClient()

    const search = request.nextUrl.searchParams.get('search')

    let query = supabase
      .from('clients')
      .select('*')
      .eq('photographer_id', session.user.id)
      .order('created_at', { ascending: false })

    if (search) {
      query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%`)
    }

    const { data, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requirePhotographer()
    const supabase = await createServiceClient()

    const body = await request.json()
    const parsed = createClientSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('clients')
      .insert({
        ...parsed.data,
        photographer_id: session.user.id,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
