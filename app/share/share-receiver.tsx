'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Loader2, Check, Link2 } from 'lucide-react'

type ShareProject = {
  id: string
  title: string
  cover_image_url: string | null
}

export function ShareReceiver({
  sharedUrl,
  projects,
}: {
  sharedUrl: string
  projects: ShareProject[]
}) {
  const router = useRouter()
  const [savingId, setSavingId] = useState<string | null>(null)
  const [savedId, setSavedId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  let hostname = sharedUrl
  try {
    hostname = new URL(sharedUrl).hostname.replace(/^www\./, '')
  } catch {
    // keep raw string
  }

  async function saveToProject(projectId: string) {
    if (savingId) return
    setSavingId(projectId)
    setError(null)

    try {
      let title: string | null = null
      let thumbnail: string | null = null
      try {
        const metaRes = await fetch('/api/url-metadata', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: sharedUrl }),
        })
        if (metaRes.ok) {
          const meta = await metaRes.json()
          title = meta.title || null
          thumbnail = meta.image || null
        }
      } catch {
        // proceed without metadata
      }

      const res = await fetch(`/api/conversations/${projectId}/assets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: sharedUrl,
          filename: '',
          asset_type: 'link',
          title: title || hostname,
          thumbnail_url: thumbnail,
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to save link')
      }

      setSavedId(projectId)
      setTimeout(() => {
        router.push(`/dashboard/projects/${projectId}?tab=links`)
      }, 800)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save link')
      setSavingId(null)
    }
  }

  return (
    <div className="min-h-screen bg-moodkin-cream p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl p-5 shadow-sm mb-6">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-moodkin-gold/20 flex items-center justify-center shrink-0">
              <Link2 className="w-5 h-5 text-moodkin-dark" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs uppercase tracking-wide text-moodkin-gray font-semibold">
                Save link to a project
              </p>
              <p className="text-moodkin-dark font-medium truncate">{hostname}</p>
              <a
                href={sharedUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-moodkin-gray truncate block hover:underline"
              >
                {sharedUrl}
              </a>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
            {error}
          </div>
        )}

        {projects.length === 0 ? (
          <div className="bg-white rounded-2xl p-6 shadow-sm text-center">
            <p className="text-moodkin-dark font-medium mb-2">No projects yet</p>
            <p className="text-sm text-moodkin-gray mb-4">
              Create a project first, then come back and share this link into it.
            </p>
            <a
              href="/dashboard/projects/new"
              className="inline-block px-4 py-2 bg-moodkin-gold hover:bg-moodkin-gold-hover text-moodkin-dark font-semibold rounded-xl"
            >
              Create project
            </a>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-sm text-moodkin-gray px-1 mb-2">Choose a project:</p>
            {projects.map((project) => {
              const isSaving = savingId === project.id
              const isSaved = savedId === project.id
              return (
                <button
                  key={project.id}
                  onClick={() => saveToProject(project.id)}
                  disabled={!!savingId}
                  className="w-full flex items-center gap-3 bg-white rounded-2xl p-3 shadow-sm hover:shadow-md transition-shadow disabled:opacity-60 text-left"
                >
                  <div className="w-12 h-12 rounded-xl overflow-hidden bg-moodkin-light-gray shrink-0 relative">
                    {project.cover_image_url ? (
                      <Image
                        src={project.cover_image_url}
                        alt=""
                        fill
                        className="object-cover"
                        sizes="48px"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-moodkin-gray text-lg">
                        📁
                      </div>
                    )}
                  </div>
                  <span className="flex-1 font-medium text-moodkin-dark truncate">
                    {project.title}
                  </span>
                  {isSaved ? (
                    <Check className="w-5 h-5 text-green-600 shrink-0" />
                  ) : isSaving ? (
                    <Loader2 className="w-5 h-5 animate-spin text-moodkin-gold shrink-0" />
                  ) : null}
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
