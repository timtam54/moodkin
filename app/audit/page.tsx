import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/session'
import { createServiceClient } from '@/lib/supabase/server'

interface PageViewRow {
  id: string
  user_id: string | null
  path: string
  platform: string | null
  browser: string | null
  os: string | null
  is_pwa: boolean
  created_at: string
  users: { name: string | null; email: string } | null
}

function formatDateTime(dateString: string) {
  return new Date(dateString).toLocaleString('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default async function AuditPage() {
  const session = await getSession()

  if (!session) {
    redirect('/login')
  }

  const supabase = await createServiceClient()
  const { data: views, error } = await supabase
    .from('page_views')
    .select('id, user_id, path, platform, browser, os, is_pwa, created_at, users(name, email)')
    .order('created_at', { ascending: false })
    .limit(200)

  const rows = (views || []) as unknown as PageViewRow[]

  return (
    <div className="min-h-screen bg-moodkin-cream p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-moodkin-dark">Audit Log</h1>
            <p className="text-moodkin-gray mt-1">
              {error ? 'Error loading page views' : `Latest ${rows.length} page views`}
            </p>
          </div>
          <Link
            href="/admin"
            className="text-sm font-medium text-moodkin-dark hover:text-moodkin-gold-hover bg-white px-4 py-2 rounded-xl shadow-sm"
          >
            Go to Admin
          </Link>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-lg">
            {error.message}
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-moodkin-cream/50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-moodkin-dark uppercase tracking-wider">When</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-moodkin-dark uppercase tracking-wider">User</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-moodkin-dark uppercase tracking-wider">Path</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-moodkin-dark uppercase tracking-wider">Platform</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-moodkin-dark uppercase tracking-wider">OS</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-moodkin-dark uppercase tracking-wider">Browser</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-moodkin-dark uppercase tracking-wider">PWA</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rows.map((row) => (
                  <tr key={row.id} className="hover:bg-moodkin-cream/30 transition-colors">
                    <td className="px-4 py-3 text-sm text-moodkin-gray whitespace-nowrap">{formatDateTime(row.created_at)}</td>
                    <td className="px-4 py-3 text-sm">
                      {row.users ? (
                        <div>
                          <p className="font-medium text-moodkin-dark">{row.users.name || 'No name'}</p>
                          <p className="text-xs text-moodkin-gray">{row.users.email}</p>
                        </div>
                      ) : (
                        <span className="text-moodkin-gray">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-moodkin-dark font-mono break-all">{row.path}</td>
                    <td className="px-4 py-3 text-sm text-moodkin-gray capitalize">{row.platform || '-'}</td>
                    <td className="px-4 py-3 text-sm text-moodkin-gray">{row.os || '-'}</td>
                    <td className="px-4 py-3 text-sm text-moodkin-gray">{row.browser || '-'}</td>
                    <td className="px-4 py-3 text-sm">
                      {row.is_pwa ? (
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-moodkin-gold/20 text-moodkin-dark">PWA</span>
                      ) : (
                        <span className="text-moodkin-gray text-xs">-</span>
                      )}
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && !error && (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-moodkin-gray text-sm">
                      No page views recorded yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
