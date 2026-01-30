'use client'

import { Plus, FolderOpen } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { useConversations } from '@/hooks/use-conversations'

// Placeholder images for demo projects
const placeholderImages = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&q=80',
  'https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=400&q=80',
  'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=400&q=80',
  'https://images.unsplash.com/photo-1496747611176-843222e1e57c?w=400&q=80',
]

export default function DashboardPage() {
  const { data: projects, isLoading } = useConversations()

  if (isLoading) {
    return (
      <div className="py-12 text-center text-moodkin-gray">Loading...</div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-moodkin-dark">Projects</h1>
          <p className="text-moodkin-gray mt-1">
            {projects?.length || 0} project{projects?.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Link
          href="/dashboard/conversations/new"
          className="flex items-center gap-2 bg-moodkin-gold hover:bg-moodkin-gold-hover text-moodkin-dark font-semibold rounded-full px-6 py-3 transition-colors"
        >
          <Plus className="w-5 h-5" />
          New Project
        </Link>
      </div>

      {/* Projects Grid */}
      {!projects?.length ? (
        <div className="text-center py-16">
          <div className="w-20 h-20 bg-moodkin-gold/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <FolderOpen className="w-10 h-10 text-moodkin-gold" />
          </div>
          <h3 className="text-lg font-semibold text-moodkin-dark mb-2">No projects yet</h3>
          <p className="text-moodkin-gray mb-6">Create your first project to get started</p>
          <Link
            href="/dashboard/conversations/new"
            className="inline-flex items-center gap-2 bg-moodkin-gold hover:bg-moodkin-gold-hover text-moodkin-dark font-semibold rounded-full px-6 py-3 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Create Project
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project: any, index: number) => (
            <Link
              key={project.id}
              href={`/dashboard/conversations/${project.id}`}
              className="group"
            >
              <div className="bg-white rounded-2xl shadow-sm overflow-hidden hover:shadow-lg transition-all hover:scale-[1.02]">
                {/* Thumbnail Grid */}
                <div className="aspect-square p-2 bg-moodkin-cream/50">
                  <div className="grid grid-cols-2 gap-2 h-full">
                    {[0, 1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className="relative rounded-xl overflow-hidden bg-moodkin-light-gray/30"
                      >
                        <Image
                          src={placeholderImages[(index + i) % placeholderImages.length]}
                          alt=""
                          fill
                          className="object-cover"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Project Info */}
                <div className="p-4">
                  <h3 className="font-semibold text-moodkin-dark truncate group-hover:text-moodkin-gold transition-colors">
                    {project.title}
                  </h3>
                  <p className="text-sm text-moodkin-gray truncate mt-1">
                    {project.client?.name || project.client?.email || 'No client'}
                  </p>
                  <div className="flex items-center justify-between mt-3">
                    <span className="text-xs text-moodkin-gray">
                      {new Date(project.updated_at).toLocaleDateString()}
                    </span>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      project.status === 'active'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      {project.status}
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          ))}

          {/* Add New Project Card */}
          <Link
            href="/dashboard/conversations/new"
            className="group"
          >
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden hover:shadow-lg transition-all hover:scale-[1.02] border-2 border-dashed border-moodkin-light-gray hover:border-moodkin-gold">
              <div className="aspect-square flex flex-col items-center justify-center p-8">
                <div className="w-16 h-16 bg-moodkin-gold/20 rounded-2xl flex items-center justify-center mb-4 group-hover:bg-moodkin-gold/30 transition-colors">
                  <Plus className="w-8 h-8 text-moodkin-gold" />
                </div>
                <p className="font-semibold text-moodkin-dark">New Project</p>
                <p className="text-sm text-moodkin-gray mt-1">Create a moodboard</p>
              </div>
            </div>
          </Link>
        </div>
      )}
    </div>
  )
}
