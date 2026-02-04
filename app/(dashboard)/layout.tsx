import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/session'
import { DashboardNav } from '@/components/layout/dashboard-nav'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getSession()

  if (!session) {
    redirect('/login')
  }

  // Allow both photographers and clients (clients can view projects they're invited to)
  return (
    <div className="min-h-screen bg-moodkin-cream">
      <DashboardNav user={session.user} />

      {/* Main content */}
      <main className="max-w-7xl mx-auto">
        <div className="p-4 md:p-8">{children}</div>
      </main>
    </div>
  )
}
