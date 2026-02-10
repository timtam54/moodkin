import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/session'
import { createServiceClient } from '@/lib/supabase/server'
import { AdminUsersTable } from './admin-users-table'

export default async function AdminPage() {
  const session = await getSession()

  if (!session) {
    redirect('/login')
  }

  const supabase = await createServiceClient()

  const { data: users, error } = await supabase
    .from('users')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    return (
      <div className="min-h-screen bg-moodkin-cream p-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-2xl font-bold text-moodkin-dark mb-4">Admin</h1>
          <div className="bg-red-50 text-red-600 p-4 rounded-lg">
            Error loading users: {error.message}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-moodkin-cream p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-moodkin-dark">Admin</h1>
          <p className="text-moodkin-gray mt-1">
            All users ({users?.length || 0})
          </p>
        </div>

        <AdminUsersTable users={users || []} currentUserId={session.user.id} />
      </div>
    </div>
  )
}
