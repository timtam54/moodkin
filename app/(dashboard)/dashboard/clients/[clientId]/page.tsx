'use client'

import { useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Trash2, Mail, Phone, MapPin, FolderOpen, Plus, Camera, Loader2, Pencil } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { upload } from '@vercel/blob/client'
import { Button } from '@/components/ui/button'
import { EditClientDialog } from '@/components/clients/edit-client-dialog'
import { ConversationCard } from '@/components/conversations/conversation-card'
import { useClient, useUpdateClient, useDeleteClient } from '@/hooks/use-clients'
import { useConversations } from '@/hooks/use-conversations'

export default function ClientDetailPage() {
  const { clientId } = useParams<{ clientId: string }>()
  const router = useRouter()
  const { data: client, isLoading } = useClient(clientId)
  const { data: allProjects } = useConversations()
  const updateClient = useUpdateClient(clientId)
  const deleteClient = useDeleteClient()
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const photoInputRef = useRef<HTMLInputElement>(null)

  // Filter projects for this client
  const clientProjects = allProjects?.filter(p => p.client_id === clientId) || []

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    const maxBytes = 10 * 1024 * 1024
    if (file.size > maxBytes) {
      alert('File size must be less than 10MB')
      return
    }

    setIsUploadingPhoto(true)
    try {
      const blob = await upload(file.name, file, {
        access: 'public',
        handleUploadUrl: '/api/upload',
      })

      updateClient.mutate({ avatar_url: blob.url })
    } catch (error) {
      console.error('Upload failed:', error)
      alert('Failed to upload image')
    } finally {
      setIsUploadingPhoto(false)
      if (photoInputRef.current) {
        photoInputRef.current.value = ''
      }
    }
  }

  function handleSubmit(data: { email: string; name?: string; phone?: string; address?: string; notes?: string; avatar_url?: string }) {
    updateClient.mutate(data, {
      onSuccess: () => setIsEditDialogOpen(false),
    })
  }

  function handleDelete() {
    if (!confirm('Are you sure you want to delete this client? This will also delete all their conversations.')) return
    deleteClient.mutate(clientId, {
      onSuccess: () => router.push('/dashboard/clients'),
    })
  }

  if (isLoading) {
    return <div className="py-12 text-center text-moodkin-gray">Loading...</div>
  }

  if (!client) {
    return <div className="py-12 text-center text-moodkin-gray">Client not found</div>
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Link
          href="/dashboard/clients"
          className="inline-flex items-center text-sm text-moodkin-gray hover:text-moodkin-dark transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to clients
        </Link>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setIsEditDialogOpen(true)}>
            <Pencil className="w-4 h-4 mr-1" />
            Edit
          </Button>
          <Button variant="destructive" size="sm" onClick={handleDelete}>
            <Trash2 className="w-4 h-4 mr-1" />
            Delete
          </Button>
        </div>
      </div>

      {/* Client Profile Section */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="flex flex-col md:flex-row">
          {/* Client Photo */}
          <div
            className="relative w-full md:w-72 h-64 md:h-auto bg-moodkin-light-gray flex-shrink-0 group cursor-pointer"
            onClick={() => photoInputRef.current?.click()}
          >
            {client.avatar_url ? (
              <Image
                src={client.avatar_url}
                alt={client.name || client.email}
                fill
                className="object-cover"
              />
            ) : (
              <div className="w-full h-full min-h-[16rem] flex items-center justify-center bg-gradient-to-br from-moodkin-gold/20 to-moodkin-gold/40">
                <span className="text-5xl font-bold text-moodkin-dark/30">
                  {(client.name || client.email).charAt(0).toUpperCase()}
                </span>
              </div>
            )}
            {/* Upload overlay */}
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              {isUploadingPhoto ? (
                <Loader2 className="w-8 h-8 text-white animate-spin" />
              ) : (
                <div className="text-center text-white">
                  <Camera className="w-8 h-8 mx-auto mb-2" />
                  <span className="text-sm font-medium">Change Photo</span>
                </div>
              )}
            </div>
            {/* Show loading overlay when uploading even without hover */}
            {isUploadingPhoto && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-white animate-spin" />
              </div>
            )}
            <input
              ref={photoInputRef}
              type="file"
              className="hidden"
              accept="image/jpeg,image/png,image/gif,image/webp"
              onChange={handlePhotoUpload}
            />
          </div>

          {/* Client Info */}
          <div className="flex-1 p-6 md:p-8">
            <h1 className="text-2xl font-bold text-moodkin-dark mb-1">
              {client.name || 'Unnamed Client'}
            </h1>

            <div className="space-y-2 mt-4">
              <div className="flex items-center text-moodkin-gray">
                <Mail className="w-4 h-4 mr-2 flex-shrink-0" />
                <span className="text-sm">{client.email}</span>
              </div>
              {client.phone && (
                <div className="flex items-center text-moodkin-gray">
                  <Phone className="w-4 h-4 mr-2 flex-shrink-0" />
                  <span className="text-sm">{client.phone}</span>
                </div>
              )}
              {client.address && (
                <div className="flex items-center text-moodkin-gray">
                  <MapPin className="w-4 h-4 mr-2 flex-shrink-0" />
                  <span className="text-sm">{client.address}</span>
                </div>
              )}
            </div>

            {client.notes && (
              <div className="mt-4 pt-4 border-t border-moodkin-light-gray">
                <p className="text-sm text-moodkin-gray">{client.notes}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Projects Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-moodkin-dark">Projects</h2>
          <Link href={`/dashboard/projects/new?client=${clientId}`}>
            <Button variant="outline" size="sm">
              <Plus className="w-4 h-4 mr-1" />
              New Project
            </Button>
          </Link>
        </div>

        {clientProjects.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {clientProjects.map((project) => (
              <ConversationCard key={project.id} conversation={project} />
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
            <FolderOpen className="w-12 h-12 text-moodkin-light-gray mx-auto mb-3" />
            <p className="text-moodkin-gray text-sm">No projects with this client yet</p>
          </div>
        )}
      </div>

      {/* Edit Client Dialog */}
      <EditClientDialog
        open={isEditDialogOpen}
        onClose={() => setIsEditDialogOpen(false)}
        client={client}
        onSubmit={handleSubmit}
        isLoading={updateClient.isPending}
      />
    </div>
  )
}
