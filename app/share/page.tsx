import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/session'
import { createServiceClient } from '@/lib/supabase/server'
import { ShareReceiver } from './share-receiver'

type SearchParams = Promise<{
  title?: string
  text?: string
  url?: string
}>

function extractUrl(params: { title?: string; text?: string; url?: string }): string | null {
  const candidates = [params.url, params.text, params.title].filter(Boolean) as string[]
  for (const candidate of candidates) {
    const match = candidate.match(/https?:\/\/[^\s]+/i)
    if (match) return match[0]
  }
  return null
}

export default async function SharePage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const params = await searchParams
  const sharedUrl = extractUrl(params)

  const session = await getSession()
  if (!session) {
    const qs = new URLSearchParams()
    if (params.title) qs.set('title', params.title)
    if (params.text) qs.set('text', params.text)
    if (params.url) qs.set('url', params.url)
    const returnUrl = `/share?${qs.toString()}`
    redirect(`/login?returnUrl=${encodeURIComponent(returnUrl)}`)
  }

  if (!sharedUrl) {
    return (
      <div className="min-h-screen bg-moodkin-cream flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-2xl p-6 shadow-sm text-center">
          <h1 className="text-xl font-semibold text-moodkin-dark mb-2">No link found</h1>
          <p className="text-moodkin-gray mb-4">
            We couldn&apos;t find a link in what you shared. Try sharing again and make sure the app you&apos;re sharing from includes a URL.
          </p>
          <a
            href="/dashboard/projects"
            className="inline-block px-4 py-2 bg-moodkin-gold hover:bg-moodkin-gold-hover text-moodkin-dark font-semibold rounded-xl"
          >
            Back to projects
          </a>
        </div>
      </div>
    )
  }

  const supabase = await createServiceClient()
  const { data: projectAccess } = await supabase
    .from('project_users')
    .select('project_id')
    .eq('user_id', session.user.id)
    .eq('invite_status', 'accepted')

  const projectIds = projectAccess?.map((p) => p.project_id) || []

  const { data: conversations } = projectIds.length
    ? await supabase
        .from('conversations')
        .select('id, title, cover_image_url')
        .in('id', projectIds)
        .order('updated_at', { ascending: false })
    : { data: [] as { id: string; title: string; cover_image_url: string | null }[] }

  return (
    <ShareReceiver
      sharedUrl={sharedUrl}
      projects={conversations || []}
    />
  )
}
