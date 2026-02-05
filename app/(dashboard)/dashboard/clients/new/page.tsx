'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function NewClientPage() {
  const router = useRouter()

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <Link
        href="/dashboard/clients"
        className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft className="w-4 h-4 mr-1" />
        Back to clients
      </Link>

      <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
        <p className="text-moodkin-dark font-medium mb-2">Adding clients has changed</p>
        <p className="text-moodkin-gray text-sm">
          Clients are now added by inviting them to a project. Go to a project and use the
          &quot;Invite Collaborator&quot; button to add team members.
        </p>
        <button
          onClick={() => router.push('/dashboard/projects')}
          className="mt-4 px-6 py-2 bg-moodkin-gold hover:bg-moodkin-gold-hover text-moodkin-dark font-semibold rounded-xl transition-colors"
        >
          Go to Projects
        </button>
      </div>
    </div>
  )
}
