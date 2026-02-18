import { NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth/session'
import { createServiceClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const session = await requireSession()
    const supabase = await createServiceClient()
    const userId = session.user.id

    // Get all projects the user has access to
    const { data: projectAccess, error: accessError } = await supabase
      .from('project_users')
      .select('project_id, role, is_owner')
      .eq('user_id', userId)
      .eq('invite_status', 'accepted')

    if (accessError) {
      return NextResponse.json({ error: accessError.message }, { status: 500 })
    }

    const projectIds = projectAccess?.map(p => p.project_id) || []

    if (projectIds.length === 0) {
      return NextResponse.json({})
    }

    // Build role map for each project
    const projectRoleMap = new Map<string, string>()
    projectAccess?.forEach(p => {
      projectRoleMap.set(p.project_id, p.is_owner ? 'creative' : p.role)
    })

    // Get last seen timestamps for all projects (overall project view)
    const { data: lastSeenData } = await supabase
      .from('project_last_seen')
      .select('project_id, tab_type, last_seen_at')
      .eq('user_id', userId)
      .in('project_id', projectIds)

    // Build last seen map: project_id -> { tab_type -> last_seen_at }
    const lastSeenMap = new Map<string, Map<string, string>>()
    lastSeenData?.forEach(ls => {
      if (!lastSeenMap.has(ls.project_id)) {
        lastSeenMap.set(ls.project_id, new Map())
      }
      lastSeenMap.get(ls.project_id)!.set(ls.tab_type, ls.last_seen_at)
    })

    // Get all project users to determine who is creative/client
    const { data: allProjectUsers } = await supabase
      .from('project_users')
      .select('project_id, user_id, role, is_owner')
      .in('project_id', projectIds)
      .eq('invite_status', 'accepted')

    // Build map of creative user IDs per project
    const creativeUsersMap = new Map<string, Set<string>>()
    allProjectUsers?.forEach(pu => {
      if (!creativeUsersMap.has(pu.project_id)) {
        creativeUsersMap.set(pu.project_id, new Set())
      }
      if (pu.is_owner || pu.role === 'creative') {
        creativeUsersMap.get(pu.project_id)!.add(pu.user_id)
      }
    })

    // Get assets for all projects
    const { data: assets } = await supabase
      .from('project_assets')
      .select('id, conversation_id, created_at, asset_type, creative, uploaded_by_id')
      .in('conversation_id', projectIds)

    // Get messages for all projects
    const { data: messages } = await supabase
      .from('conversation_messages')
      .select('id, conversation_id, created_at')
      .in('conversation_id', projectIds)

    // Calculate unseen counts per project
    const unseenCounts: Record<string, {
      total: number
      client: number
      creative: number
      links: number
      conversations: number
    }> = {}

    for (const projectId of projectIds) {
      const projectLastSeen = lastSeenMap.get(projectId) || new Map()
      const projectLastSeenOverall = projectLastSeen.get('project') || '1970-01-01T00:00:00Z'
      const clientLastSeen = projectLastSeen.get('client') || '1970-01-01T00:00:00Z'
      const creativeLastSeen = projectLastSeen.get('creative') || '1970-01-01T00:00:00Z'
      const linksLastSeen = projectLastSeen.get('links') || '1970-01-01T00:00:00Z'
      const conversationsLastSeen = projectLastSeen.get('conversations') || '1970-01-01T00:00:00Z'

      const creativeUserIds = creativeUsersMap.get(projectId) || new Set()
      const projectAssets = assets?.filter(a => a.conversation_id === projectId) || []
      const projectMessages = messages?.filter(m => m.conversation_id === projectId) || []

      // Client tab: images uploaded by clients (not creatives)
      const clientImages = projectAssets.filter(a =>
        a.asset_type !== 'link' &&
        a.uploaded_by_id &&
        !creativeUserIds.has(a.uploaded_by_id)
      )
      const unseenClientImages = clientImages.filter(a =>
        new Date(a.created_at) > new Date(clientLastSeen)
      ).length

      // Creative tab: images uploaded by creatives OR marked as creative
      const creativeImages = projectAssets.filter(a =>
        a.asset_type !== 'link' &&
        (a.creative || (a.uploaded_by_id && creativeUserIds.has(a.uploaded_by_id)))
      )
      const unseenCreativeImages = creativeImages.filter(a =>
        new Date(a.created_at) > new Date(creativeLastSeen)
      ).length

      // Links
      const links = projectAssets.filter(a => a.asset_type === 'link')
      const unseenLinks = links.filter(a =>
        new Date(a.created_at) > new Date(linksLastSeen)
      ).length

      // Conversations
      const unseenMessages = projectMessages.filter(m =>
        new Date(m.created_at) > new Date(conversationsLastSeen)
      ).length

      // Total unseen (for project card badge) - items since last overall project view
      const totalUnseen = projectAssets.filter(a =>
        new Date(a.created_at) > new Date(projectLastSeenOverall)
      ).length + projectMessages.filter(m =>
        new Date(m.created_at) > new Date(projectLastSeenOverall)
      ).length

      unseenCounts[projectId] = {
        total: totalUnseen,
        client: unseenClientImages,
        creative: unseenCreativeImages,
        links: unseenLinks,
        conversations: unseenMessages,
      }
    }

    return NextResponse.json(unseenCounts)
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
