'use client'

import Link from 'next/link'
import { Plus, FolderOpen, FolderPlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { ConversationCard } from '@/components/conversations/conversation-card'
import { useConversations } from '@/hooks/use-conversations'

export default function ProjectsPage() {
  const { data: projects, isLoading } = useConversations()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-moodkin-dark">Projects</h1>
          <p className="text-moodkin-gray mt-1">Moodboard sessions with your clients</p>
        </div>
        <Link href="/dashboard/projects/new">
          <Button variant="primary">
            <Plus className="w-4 h-4 mr-2" />
            New Project
          </Button>
        </Link>
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-moodkin-gray">Loading...</div>
      ) : !projects?.length ? (
        <div className="bg-white rounded-2xl shadow-sm p-8">
          <EmptyState
            icon={FolderOpen}
            title="No projects yet"
            description="Start a moodboard project with a client"
            action={
              <Link href="/dashboard/projects/new">
                <Button variant="primary" size="sm">
                  <Plus className="w-4 h-4 mr-1" />
                  New Project
                </Button>
              </Link>
            }
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {/* New Project Card */}
          <Link
            href="/dashboard/projects/new"
            className="aspect-square bg-moodkin-gold rounded-2xl p-4 flex flex-col items-center justify-center cursor-pointer hover:bg-moodkin-gold-hover transition-colors"
          >
            <div className="w-16 h-16 bg-moodkin-gold-hover/30 rounded-full flex items-center justify-center mb-3">
              <FolderPlus className="w-8 h-8 text-moodkin-dark" />
            </div>
            <p className="font-bold text-moodkin-dark text-center text-sm">NEW</p>
            <p className="font-bold text-moodkin-dark text-center text-sm">PROJECT</p>
          </Link>

          {/* Project Cards */}
          {projects.map((project) => (
            <ConversationCard key={project.id} conversation={project} />
          ))}
        </div>
      )}
    </div>
  )
}
