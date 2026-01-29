import Image from 'next/image'
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/session'

export default async function ClientLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getSession()

  // If no session and not on invite page, redirect to login
  // Invite page handles its own auth
  if (!session || session.user.role !== 'client') {
    // Allow invite pages through without session
    return (
      <div className="min-h-screen bg-moodkin-cream">
        <header className="bg-moodkin-dark px-6 h-16 flex items-center">
          <Image
            src="/darklogo.png"
            alt="Moodkin"
            width={150}
            height={48}
            className="object-contain"
          />
        </header>
        <main className="p-6">{children}</main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-moodkin-cream">
      <header className="bg-moodkin-dark px-6 h-16 flex items-center justify-between">
        <Image
          src="/darklogo.png"
          alt="Moodkin"
          width={150}
          height={48}
          className="object-contain"
        />
        <div className="flex items-center gap-3">
          <span className="text-sm text-white/70">{session.user.name || session.user.email}</span>
          <a
            href="/api/auth/logout"
            className="text-sm text-white/50 hover:text-white"
          >
            Logout
          </a>
        </div>
      </header>
      <main className="p-6">{children}</main>
    </div>
  )
}
