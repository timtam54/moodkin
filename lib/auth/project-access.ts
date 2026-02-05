import type { SupabaseClient } from '@supabase/supabase-js'
import type { ProjectUserRole } from '@/types/database'

export async function isProjectOwner(
  supabase: SupabaseClient,
  projectId: string,
  userId: string
): Promise<boolean> {
  const { data } = await supabase
    .from('project_users')
    .select('id')
    .eq('project_id', projectId)
    .eq('user_id', userId)
    .eq('is_owner', true)
    .single()
  return !!data
}

export async function isProjectMember(
  supabase: SupabaseClient,
  projectId: string,
  userId: string
): Promise<boolean> {
  const { data } = await supabase
    .from('project_users')
    .select('id')
    .eq('project_id', projectId)
    .eq('user_id', userId)
    .eq('invite_status', 'accepted')
    .single()
  return !!data
}

export async function getProjectRole(
  supabase: SupabaseClient,
  projectId: string,
  userId: string
): Promise<ProjectUserRole | null> {
  const { data } = await supabase
    .from('project_users')
    .select('role')
    .eq('project_id', projectId)
    .eq('user_id', userId)
    .eq('invite_status', 'accepted')
    .single()
  return data?.role ?? null
}
