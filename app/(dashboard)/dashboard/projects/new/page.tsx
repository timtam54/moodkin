'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, ArrowRight, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useCreateConversation } from '@/hooks/use-conversations'
import { useClients } from '@/hooks/use-clients'
import { ImageUpload } from '@/components/upload/image-upload'

type Mode = 'new' | 'join'

export default function NewProjectPage() {
  const router = useRouter()
  const createConversation = useCreateConversation()
  const { data: clients, isLoading: clientsLoading } = useClients()

  const [mode, setMode] = useState<Mode>('new')
  const [projectName, setProjectName] = useState('')
  const [selectedClientId, setSelectedClientId] = useState('')
  const [collaboratorCode, setCollaboratorCode] = useState('')
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (mode === 'new' && projectName.trim() && selectedClientId) {
      createConversation.mutate(
        {
          title: projectName.trim(),
          client_id: selectedClientId,
          cover_image_url: coverImageUrl || undefined,
        },
        {
          onSuccess: (data) => router.push(`/dashboard/projects/${data.id}`),
        }
      )
    } else if (mode === 'join' && collaboratorCode.trim()) {
      // TODO: Implement join by code
      console.log('Joining with code:', collaboratorCode)
    }
  }

  return (
    <div className="min-h-[calc(100vh-10rem)] flex flex-col max-w-md mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <button
          onClick={() => router.back()}
          className="p-2 -ml-2 hover:bg-moodkin-cream rounded-xl transition-colors"
        >
          <ChevronLeft className="w-6 h-6 text-moodkin-dark" />
        </button>
        <span className="text-sm text-moodkin-gray">Step 1 of 2</span>
      </div>

      {/* Title */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-moodkin-dark mb-3">
          What are we creating?
        </h1>
        <p className="text-moodkin-gray">
          Set up your project details to begin collaborating with your team or clients.
        </p>
      </div>

      {/* Mode Toggle */}
      <div className="bg-moodkin-cream/50 rounded-full p-1 flex mb-8">
        <button
          onClick={() => setMode('new')}
          className={`flex-1 py-3 px-4 rounded-full text-sm font-medium transition-colors ${
            mode === 'new'
              ? 'bg-white text-moodkin-dark shadow-sm'
              : 'text-moodkin-gray hover:text-moodkin-dark'
          }`}
        >
          New Project
        </button>
        <button
          onClick={() => setMode('join')}
          className={`flex-1 py-3 px-4 rounded-full text-sm font-medium transition-colors ${
            mode === 'join'
              ? 'bg-white text-moodkin-dark shadow-sm'
              : 'text-moodkin-gray hover:text-moodkin-dark'
          }`}
        >
          Join Code
        </button>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="flex-1 flex flex-col">
        {mode === 'new' ? (
          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-moodkin-dark mb-2">
                Client
              </label>
              <div className="relative">
                <select
                  value={selectedClientId}
                  onChange={(e) => setSelectedClientId(e.target.value)}
                  className="w-full px-4 py-4 bg-white border border-moodkin-light-gray rounded-2xl text-moodkin-dark appearance-none focus:outline-none focus:ring-2 focus:ring-moodkin-gold focus:border-transparent"
                >
                  <option value="">Select a client...</option>
                  {clients?.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.name || client.email}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-moodkin-gray pointer-events-none" />
              </div>
              {clients?.length === 0 && !clientsLoading && (
                <p className="text-sm text-moodkin-gray mt-2">
                  No clients yet.{' '}
                  <a href="/dashboard/clients" className="text-moodkin-dark underline">
                    Add a client first
                  </a>
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-moodkin-dark mb-2">
                Project Name
              </label>
              <input
                type="text"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="e.g. Summer Editorial 2024"
                className="w-full px-4 py-4 bg-white border border-moodkin-light-gray rounded-2xl text-moodkin-dark placeholder:text-moodkin-gray/50 focus:outline-none focus:ring-2 focus:ring-moodkin-gold focus:border-transparent"
              />
              <p className="text-sm text-moodkin-gray mt-2">
                You can change this name later in settings.
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-moodkin-dark mb-2">
                Cover Image
              </label>
              <ImageUpload
                onUploadComplete={(url) => {
                  setCoverImageUrl(url)
                  setUploadError(null)
                }}
                onError={(error) => setUploadError(error)}
              />
              {uploadError && (
                <p className="text-sm text-red-500 mt-2">{uploadError}</p>
              )}
              <p className="text-sm text-moodkin-gray mt-2">
                Optional. Add a cover image for your project.
              </p>
            </div>
          </div>
        ) : (
          <div className="mb-6">
            <label className="block text-sm font-medium text-moodkin-gray mb-2">
              Collaborator Code
            </label>
            <input
              type="text"
              value={collaboratorCode}
              onChange={(e) => setCollaboratorCode(e.target.value)}
              placeholder="Enter 6-digit code"
              maxLength={6}
              className="w-full px-4 py-4 bg-moodkin-cream/30 border border-moodkin-light-gray/50 rounded-2xl text-moodkin-dark placeholder:text-moodkin-gray/50 focus:outline-none focus:ring-2 focus:ring-moodkin-gold focus:border-transparent"
            />
          </div>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Continue Button */}
        <Button
          type="submit"
          disabled={
            createConversation.isPending ||
            (mode === 'new' && (!projectName.trim() || !selectedClientId)) ||
            (mode === 'join' && !collaboratorCode.trim())
          }
          className="w-full bg-moodkin-gold hover:bg-moodkin-gold-hover text-moodkin-dark font-semibold rounded-2xl py-6 text-base disabled:opacity-50"
        >
          {createConversation.isPending ? 'Creating...' : 'Continue'}
          <ArrowRight className="w-5 h-5 ml-2" />
        </Button>

        {/* Help Link */}
        <p className="text-center text-sm text-moodkin-gray mt-6">
          Need help?{' '}
          <a href="#" className="text-moodkin-dark underline underline-offset-4">
            Contact support
          </a>
        </p>
      </form>
    </div>
  )
}
