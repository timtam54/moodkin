import { redirect } from 'next/navigation'
import { hasBillingNotice, getSession } from '@/lib/auth/session'
import { DashboardNav } from '@/components/layout/dashboard-nav'
import { OnboardingTour } from '@/components/onboarding/onboarding-tour'
import { BillingNoticeToast } from '@/components/subscription/billing-notice-toast'
import { PageViewTracker } from '@/components/audit/page-view-tracker'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getSession()

  if (!session) {
    redirect('/login')
  }

  const showBillingNotice = await hasBillingNotice()

  // Allow both photographers and clients (clients can view projects they're invited to)
  return (
    <div className="min-h-screen bg-moodkin-cream">
      <DashboardNav user={session.user} />

      {/* Main content */}
      <main className="max-w-7xl mx-auto">
        <div className="p-4 md:p-8">{children}</div>
      </main>

      {/* Onboarding tour for new users */}
      <OnboardingTour />

      {showBillingNotice && <BillingNoticeToast />}

      <PageViewTracker />
    </div>
  )
}
