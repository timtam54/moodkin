import { NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth/session'
import { createServiceClient } from '@/lib/supabase/server'

export type NotificationType =
  | 'message'
  | 'asset'
  | 'asset_comment'
  | 'asset_reaction'
  | 'colour_comment'
  | 'colour_reaction'

export interface NotificationItem {
  id: string
  type: NotificationType
  projectId: string
  projectTitle: string
  actorId: string
  actorName: string | null
  content: string
  createdAt: string
  isNew: boolean
  // For navigation
  tab?: string
  assetId?: string
  colourId?: string
}

export async function GET() {
  try {
    const session = await requireSession()
    const supabase = await createServiceClient()
    const userId = session.user.id

    // Get all projects the user has access to
    const { data: projectAccess, error: accessError } = await supabase
      .from('project_users')
      .select('project_id')
      .eq('user_id', userId)
      .eq('invite_status', 'accepted')

    if (accessError) {
      return NextResponse.json({ error: accessError.message }, { status: 500 })
    }

    const projectIds = projectAccess?.map(p => p.project_id) || []

    if (projectIds.length === 0) {
      return NextResponse.json({ notifications: [], unseenCount: 0 })
    }

    // Get project titles
    const { data: projects } = await supabase
      .from('conversations')
      .select('id, title')
      .in('id', projectIds)

    const projectMap = new Map(projects?.map(p => [p.id, p.title]) || [])

    // Get last seen timestamps for the 'project' tab (overall view)
    const { data: lastSeenData } = await supabase
      .from('project_last_seen')
      .select('project_id, last_seen_at')
      .eq('user_id', userId)
      .eq('tab_type', 'project')
      .in('project_id', projectIds)

    const lastSeenMap = new Map(
      lastSeenData?.map(ls => [ls.project_id, ls.last_seen_at]) || []
    )

    // Fetch recent activity (last 7 days for performance)
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    const cutoffDate = sevenDaysAgo.toISOString()

    // Fetch all activity types in parallel
    const [
      messagesResult,
      assetsResult,
      assetCommentsResult,
      assetReactionsResult,
      colourCommentsResult,
      colourReactionsResult,
    ] = await Promise.all([
      // Messages
      supabase
        .from('messages')
        .select('id, conversation_id, sender_id, text_content, image_url, created_at')
        .in('conversation_id', projectIds)
        .neq('sender_id', userId) // Exclude own messages
        .gte('created_at', cutoffDate)
        .order('created_at', { ascending: false })
        .limit(50),

      // Assets
      supabase
        .from('project_assets')
        .select('id, conversation_id, uploaded_by_id, uploaded_by_name, filename, asset_type, created_at')
        .in('conversation_id', projectIds)
        .neq('uploaded_by_id', userId) // Exclude own uploads
        .gte('created_at', cutoffDate)
        .order('created_at', { ascending: false })
        .limit(50),

      // Asset comments
      supabase
        .from('asset_comments')
        .select('id, asset_id, user_id, user_name, content, created_at, project_assets!inner(conversation_id)')
        .in('project_assets.conversation_id', projectIds)
        .neq('user_id', userId)
        .gte('created_at', cutoffDate)
        .order('created_at', { ascending: false })
        .limit(30),

      // Asset reactions
      supabase
        .from('asset_reactions')
        .select('id, asset_id, user_id, user_name, reaction_type, created_at, project_assets!inner(conversation_id)')
        .in('project_assets.conversation_id', projectIds)
        .neq('user_id', userId)
        .gte('created_at', cutoffDate)
        .order('created_at', { ascending: false })
        .limit(30),

      // Colour comments
      supabase
        .from('colour_comments')
        .select('id, colour_id, user_id, user_name, content, created_at, project_colours!inner(conversation_id)')
        .in('project_colours.conversation_id', projectIds)
        .neq('user_id', userId)
        .gte('created_at', cutoffDate)
        .order('created_at', { ascending: false })
        .limit(20),

      // Colour reactions
      supabase
        .from('colour_reactions')
        .select('id, colour_id, user_id, user_name, reaction_type, created_at, project_colours!inner(conversation_id)')
        .in('project_colours.conversation_id', projectIds)
        .neq('user_id', userId)
        .gte('created_at', cutoffDate)
        .order('created_at', { ascending: false })
        .limit(20),
    ])

    // Get sender names for messages
    const senderIds = new Set(messagesResult.data?.map(m => m.sender_id) || [])
    const { data: users } = await supabase
      .from('users')
      .select('id, name')
      .in('id', Array.from(senderIds))

    const userMap = new Map(users?.map(u => [u.id, u.name]) || [])

    const notifications: NotificationItem[] = []

    // Process messages
    messagesResult.data?.forEach(msg => {
      const projectId = msg.conversation_id
      const lastSeen = lastSeenMap.get(projectId) || '1970-01-01T00:00:00Z'
      const isNew = new Date(msg.created_at) > new Date(lastSeen)

      notifications.push({
        id: `msg-${msg.id}`,
        type: 'message',
        projectId,
        projectTitle: projectMap.get(projectId) || 'Unknown Project',
        actorId: msg.sender_id,
        actorName: userMap.get(msg.sender_id) || null,
        content: msg.text_content
          ? msg.text_content.slice(0, 80) + (msg.text_content.length > 80 ? '...' : '')
          : msg.image_url
            ? 'Shared an image'
            : 'Sent a canvas update',
        createdAt: msg.created_at,
        isNew,
        tab: 'conversation',
      })
    })

    // Process assets
    assetsResult.data?.forEach(asset => {
      const projectId = asset.conversation_id
      const lastSeen = lastSeenMap.get(projectId) || '1970-01-01T00:00:00Z'
      const isNew = new Date(asset.created_at) > new Date(lastSeen)

      notifications.push({
        id: `asset-${asset.id}`,
        type: 'asset',
        projectId,
        projectTitle: projectMap.get(projectId) || 'Unknown Project',
        actorId: asset.uploaded_by_id,
        actorName: asset.uploaded_by_name,
        content: asset.asset_type === 'link'
          ? `Added a link: ${asset.filename}`
          : `Uploaded ${asset.filename}`,
        createdAt: asset.created_at,
        isNew,
        tab: asset.asset_type === 'link' ? 'links' : 'project',
        assetId: asset.id,
      })
    })

    // Process asset comments
    assetCommentsResult.data?.forEach(comment => {
      const assetData = comment.project_assets as unknown as { conversation_id: string } | null
      if (!assetData) return
      const projectId = assetData.conversation_id
      const lastSeen = lastSeenMap.get(projectId) || '1970-01-01T00:00:00Z'
      const isNew = new Date(comment.created_at) > new Date(lastSeen)

      notifications.push({
        id: `ac-${comment.id}`,
        type: 'asset_comment',
        projectId,
        projectTitle: projectMap.get(projectId) || 'Unknown Project',
        actorId: comment.user_id,
        actorName: comment.user_name,
        content: `Commented: "${comment.content.slice(0, 60)}${comment.content.length > 60 ? '...' : ''}"`,
        createdAt: comment.created_at,
        isNew,
        tab: 'project',
        assetId: comment.asset_id,
      })
    })

    // Process asset reactions
    assetReactionsResult.data?.forEach(reaction => {
      const assetData = reaction.project_assets as unknown as { conversation_id: string } | null
      if (!assetData) return
      const projectId = assetData.conversation_id
      const lastSeen = lastSeenMap.get(projectId) || '1970-01-01T00:00:00Z'
      const isNew = new Date(reaction.created_at) > new Date(lastSeen)

      notifications.push({
        id: `ar-${reaction.id}`,
        type: 'asset_reaction',
        projectId,
        projectTitle: projectMap.get(projectId) || 'Unknown Project',
        actorId: reaction.user_id,
        actorName: reaction.user_name,
        content: reaction.reaction_type === 'like' ? 'Liked an image' : 'Flagged an image',
        createdAt: reaction.created_at,
        isNew,
        tab: 'project',
        assetId: reaction.asset_id,
      })
    })

    // Process colour comments
    colourCommentsResult.data?.forEach(comment => {
      const colourData = comment.project_colours as unknown as { conversation_id: string } | null
      if (!colourData) return
      const projectId = colourData.conversation_id
      const lastSeen = lastSeenMap.get(projectId) || '1970-01-01T00:00:00Z'
      const isNew = new Date(comment.created_at) > new Date(lastSeen)

      notifications.push({
        id: `cc-${comment.id}`,
        type: 'colour_comment',
        projectId,
        projectTitle: projectMap.get(projectId) || 'Unknown Project',
        actorId: comment.user_id,
        actorName: comment.user_name,
        content: `Commented on a colour: "${comment.content.slice(0, 50)}${comment.content.length > 50 ? '...' : ''}"`,
        createdAt: comment.created_at,
        isNew,
        tab: 'project',
        colourId: comment.colour_id,
      })
    })

    // Process colour reactions
    colourReactionsResult.data?.forEach(reaction => {
      const colourData = reaction.project_colours as unknown as { conversation_id: string } | null
      if (!colourData) return
      const projectId = colourData.conversation_id
      const lastSeen = lastSeenMap.get(projectId) || '1970-01-01T00:00:00Z'
      const isNew = new Date(reaction.created_at) > new Date(lastSeen)

      notifications.push({
        id: `cr-${reaction.id}`,
        type: 'colour_reaction',
        projectId,
        projectTitle: projectMap.get(projectId) || 'Unknown Project',
        actorId: reaction.user_id,
        actorName: reaction.user_name,
        content: reaction.reaction_type === 'like' ? 'Liked a colour' : 'Flagged a colour',
        createdAt: reaction.created_at,
        isNew,
        tab: 'project',
        colourId: reaction.colour_id,
      })
    })

    // Sort by created_at descending
    notifications.sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )

    // Limit total notifications
    const limitedNotifications = notifications.slice(0, 50)
    const unseenCount = limitedNotifications.filter(n => n.isNew).length

    return NextResponse.json({
      notifications: limitedNotifications,
      unseenCount
    })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
