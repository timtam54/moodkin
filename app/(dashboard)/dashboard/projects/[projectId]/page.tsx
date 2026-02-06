'use client'

import { useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { upload } from '@vercel/blob/client'
import { ChevronLeft, MoreHorizontal, Sparkles, ImagePlus, Trash2, Loader2, Link2, Plus, ExternalLink, Layout, Download, HelpCircle, Wand2, Heart, Flag, Brain, Lightbulb, UserPlus, Users, X, Clock, CheckCircle, MessageCircle, Bell, BellOff } from 'lucide-react'
import { useConversation, useDeleteConversation } from '@/hooks/use-conversations'
import { useProjectAssets, useCreateProjectAsset, useDeleteProjectAsset } from '@/hooks/use-project-assets'
import { useMoodboards, useCreateMoodboard } from '@/hooks/use-moodboards'
import { useProjectUsers, useRemoveProjectUser, useUpdateProjectUserRole } from '@/hooks/use-project-users'
import { useMessages, useSendMessage } from '@/hooks/use-messages'
import { useSession } from '@/hooks/use-session'
import type { MoodboardWithImages } from '@/types/database'
import { Button } from '@/components/ui/button'
import { Dialog, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu'
import { InviteUserDialog } from '@/components/projects/invite-user-dialog'
import { AssetCard } from '@/components/assets/asset-card'
import { LinkCard } from '@/components/assets/link-card'
import { MessageList } from '@/components/conversation/message-list'
import { MessageInput } from '@/components/conversation/message-input'
import { usePushNotifications } from '@/hooks/use-push-notifications'
import Image from 'next/image'
import Link from 'next/link'

const tabs = [
  { id: 'uploads', label: 'Uploads' },
  { id: 'creative', label: 'Creative' },
  { id: 'client', label: 'Client' },
  { id: 'links', label: 'Links' },
  { id: 'moodboards', label: 'Moodboards' },
  { id: 'conversation', label: 'Conversation' },
]

export default function ProjectDetailPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const router = useRouter()
  const { session } = useSession()
  const { data: project, isLoading } = useConversation(projectId)
  const { data: assets, isLoading: assetsLoading } = useProjectAssets(projectId)
  const { data: moodboards, isLoading: moodboardsLoading } = useMoodboards(projectId)
  const createAsset = useCreateProjectAsset(projectId)
  const deleteAsset = useDeleteProjectAsset(projectId)
  const createMoodboard = useCreateMoodboard(projectId)
  const deleteProject = useDeleteConversation()
  const [activeTab, setActiveTab] = useState('uploads')
  const [isDeleting, setIsDeleting] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [isAddingLink, setIsAddingLink] = useState(false)
  const [isCreatingMoodboard, setIsCreatingMoodboard] = useState(false)
  const [linkUrl, setLinkUrl] = useState('')
  const [linkTitle, setLinkTitle] = useState('')
  const [showMoodboardHelp, setShowMoodboardHelp] = useState(false)
  const [showInviteDialog, setShowInviteDialog] = useState(false)
  const [showTeamPanel, setShowTeamPanel] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { data: projectUsers } = useProjectUsers(projectId)
  const removeProjectUser = useRemoveProjectUser(projectId)
  const updateProjectUserRole = useUpdateProjectUserRole(projectId)
  const { data: messages } = useMessages(projectId)
  const sendMessage = useSendMessage(projectId)
  const { isSupported: pushSupported, isSubscribed: pushSubscribed, subscribe: pushSubscribe, unsubscribe: pushUnsubscribe } = usePushNotifications()

  const currentUserId = session?.user?.id || ''

  // Build a role map from project users for filtering assets by uploader role
  const userRoleMap = new Map<string, string>()
  // Build a sender map for conversation messages (userId -> email)
  const senderMap = new Map<string, string>()
  projectUsers?.forEach(pu => {
    if (pu.user_id) {
      userRoleMap.set(pu.user_id, pu.is_owner ? 'creative' : pu.role)
      senderMap.set(pu.user_id, pu.email)
    }
  })

  const handleFileSelect = async (files: FileList | null) => {
    if (!files || files.length === 0) return

    setIsUploading(true)
    try {
      for (const file of Array.from(files)) {
        // Upload to Vercel Blob
        const blob = await upload(file.name, file, {
          access: 'public',
          handleUploadUrl: '/api/upload',
        })

        // Save to database with user info
        await createAsset.mutateAsync({
          url: blob.url,
          filename: file.name,
        })
      }
    } catch (error) {
      console.error('Upload failed:', error)
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleDeleteAsset = async (assetId: string) => {
    if (!confirm('Delete this image?')) return
    try {
      await deleteAsset.mutateAsync(assetId)
    } catch (error) {
      console.error('Failed to delete asset:', error)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this project? This action cannot be undone.')) {
      return
    }
    setIsDeleting(true)
    try {
      await deleteProject.mutateAsync(projectId)
      router.push('/dashboard/projects')
    } catch (error) {
      console.error('Failed to delete project:', error)
      setIsDeleting(false)
    }
  }

  const handleAddLink = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!linkUrl.trim()) return

    setIsAddingLink(true)
    try {
      // Fetch URL metadata for thumbnail and title
      let metadata = { title: null as string | null, image: null as string | null }
      try {
        const metaRes = await fetch('/api/url-metadata', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: linkUrl }),
        })
        if (metaRes.ok) {
          metadata = await metaRes.json()
        }
      } catch {
        // Continue without metadata if fetch fails
      }

      await createAsset.mutateAsync({
        url: linkUrl,
        filename: '',
        asset_type: 'link',
        title: linkTitle || metadata.title || new URL(linkUrl).hostname,
        thumbnail_url: metadata.image,
      })
      setLinkUrl('')
      setLinkTitle('')
    } catch (error) {
      console.error('Failed to add link:', error)
    } finally {
      setIsAddingLink(false)
    }
  }

  const getLinkIcon = (url: string) => {
    try {
      const hostname = new URL(url).hostname.toLowerCase()
      if (hostname.includes('pinterest')) return '📌'
      if (hostname.includes('youtube') || hostname.includes('youtu.be')) return '▶️'
      if (hostname.includes('instagram')) return '📷'
      if (hostname.includes('behance')) return '🎨'
      if (hostname.includes('dribbble')) return '🏀'
      return '🔗'
    } catch {
      return '🔗'
    }
  }

  const handleCreateMoodboard = async () => {
    setIsCreatingMoodboard(true)
    try {
      await createMoodboard.mutateAsync()
      setActiveTab('moodboards')
    } catch (error) {
      console.error('Failed to create moodboard:', error)
      alert(error instanceof Error ? error.message : 'Failed to create moodboard')
    } finally {
      setIsCreatingMoodboard(false)
    }
  }

  const handleExportPDF = async (moodboard: MoodboardWithImages) => {
    // Dynamic import for PDF generation (client-side only)
    const { jsPDF } = await import('jspdf')

    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4',
    })

    const pageWidth = pdf.internal.pageSize.getWidth()
    const pageHeight = pdf.internal.pageSize.getHeight()
    const margin = 10
    const usableWidth = pageWidth - margin * 2
    const usableHeight = pageHeight - margin * 2 - 20 // Leave space for title

    // Add title
    pdf.setFontSize(24)
    pdf.setTextColor(51, 51, 51)
    pdf.text(moodboard.title, pageWidth / 2, margin + 10, { align: 'center' })

    if (moodboard.description) {
      pdf.setFontSize(12)
      pdf.setTextColor(128, 128, 128)
      pdf.text(moodboard.description, pageWidth / 2, margin + 18, { align: 'center' })
    }

    // Calculate grid layout
    const images = moodboard.images
    const cols = 3
    const rows = Math.ceil(images.length / cols)
    const cellWidth = usableWidth / cols
    const cellHeight = usableHeight / Math.min(rows, 2)
    const startY = margin + 25

    // Load and add images
    let currentPage = 0
    for (let i = 0; i < images.length; i++) {
      const pageIndex = Math.floor(i / 6)
      if (pageIndex > currentPage) {
        pdf.addPage()
        currentPage = pageIndex
      }

      const indexOnPage = i % 6
      const col = indexOnPage % cols
      const row = Math.floor(indexOnPage / cols)
      const x = margin + col * cellWidth + 2
      const y = startY + row * cellHeight + 2
      const imgWidth = cellWidth - 4
      const imgHeight = cellHeight - 4

      try {
        // Fetch image as base64
        const response = await fetch(images[i].asset.url)
        const blob = await response.blob()
        const base64 = await new Promise<string>((resolve) => {
          const reader = new FileReader()
          reader.onloadend = () => resolve(reader.result as string)
          reader.readAsDataURL(blob)
        })

        pdf.addImage(base64, 'JPEG', x, y, imgWidth, imgHeight)
      } catch (error) {
        console.error('Failed to load image:', error)
        // Draw placeholder
        pdf.setFillColor(240, 240, 240)
        pdf.rect(x, y, imgWidth, imgHeight, 'F')
      }
    }

    // Add footer
    pdf.setFontSize(8)
    pdf.setTextColor(180, 180, 180)
    pdf.text(`Created with Moodkin • ${new Date().toLocaleDateString()}`, pageWidth / 2, pageHeight - 5, { align: 'center' })

    // Download
    pdf.save(`${moodboard.title.replace(/[^a-z0-9]/gi, '_')}_moodboard.pdf`)
  }

  if (isLoading) {
    return (
      <div className="py-12 text-center text-moodkin-gray">Loading...</div>
    )
  }

  if (!project) {
    return (
      <div className="py-12 text-center text-moodkin-gray">Project not found</div>
    )
  }

  return (
    <div className="min-h-[calc(100vh-10rem)] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-moodkin-cream rounded-xl transition-colors"
          >
            <ChevronLeft className="w-6 h-6 text-moodkin-dark" />
          </button> 
          <div>
            {(() => {
              const clientUser = projectUsers?.find(pu => pu.role === 'client' && !pu.is_owner)
              const clientName = clientUser?.user?.name || clientUser?.email
              const clientId = clientUser?.user_id
              return clientName && clientId ? (
                <Link
                  href={`/dashboard/clients/${clientId}`}
                  className="text-sm text-moodkin-gold font-medium tracking-wider uppercase hover:underline"
                >
                  {clientName}
                </Link>
              ) : (
                <p className="text-sm text-moodkin-gold font-medium tracking-wider uppercase">PROJECT</p>
              )
            })()}
            <h1 className="text-xl font-bold text-moodkin-dark">{project.title}</h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Team avatars / indicator */}
          {projectUsers && projectUsers.length > 0 && (
            <button
              onClick={() => setShowTeamPanel(true)}
              className="flex items-center gap-2 px-3 py-1.5 bg-moodkin-cream hover:bg-moodkin-light-gray/50 rounded-xl transition-colors"
            >
              <Users className="w-4 h-4 text-moodkin-gray" />
              <span className="text-sm text-moodkin-dark font-medium">{projectUsers.length}</span>
            </button>
          )}

          {/* Menu dropdown */}
          <DropdownMenu
            trigger={
              <button className="p-2 hover:bg-moodkin-cream rounded-xl transition-colors">
                <MoreHorizontal className="w-6 h-6 text-moodkin-dark" />
              </button>
            }
          >
            <DropdownMenuItem onClick={() => setShowInviteDialog(true)}>
              <UserPlus className="w-4 h-4" />
              Invite Collaborator
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setShowTeamPanel(true)}>
              <Users className="w-4 h-4" />
              View Team
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleDelete} destructive>
              <Trash2 className="w-4 h-4" />
              Delete Project
            </DropdownMenuItem>
          </DropdownMenu>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-6 border-b border-moodkin-light-gray/50 mb-6">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`pb-3 text-sm font-medium transition-colors relative ${
              activeTab === tab.id
                ? 'text-moodkin-dark'
                : 'text-moodkin-gray hover:text-moodkin-dark'
            }`}
          >
            {tab.label}
            {activeTab === tab.id && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-moodkin-gold" />
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1">
        {activeTab === 'uploads' && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {/* AI Image Generator Card */}
            <div className="aspect-square bg-moodkin-gold rounded-2xl p-4 flex flex-col items-center justify-center relative overflow-hidden">
              <div className="absolute top-3 right-3">
                <ExternalLink className="w-4 h-4 text-moodkin-dark/50" />
              </div>
              <div className="w-16 h-16 bg-moodkin-gold-hover/30 rounded-full flex items-center justify-center mb-3">
                <Sparkles className="w-8 h-8 text-moodkin-dark" />
              </div>
              <p className="font-bold text-moodkin-dark text-center text-sm">AI IMAGE</p>
              <p className="font-bold text-moodkin-dark text-center text-sm">GENERATOR</p>
            </div>

            {/* Real Asset Cards (images only) */}
            {assets?.filter(a => a.asset_type !== 'link').map((asset) => (
              <AssetCard
                key={asset.id}
                asset={asset}
                onDelete={handleDeleteAsset}
                currentUserId={currentUserId}
              />
            ))}

            {/* Add Asset Card */}
            <label className="aspect-square bg-moodkin-cream/50 rounded-2xl border-2 border-dashed border-moodkin-light-gray flex flex-col items-center justify-center cursor-pointer hover:border-moodkin-gold hover:bg-moodkin-cream transition-colors">
              {isUploading ? (
                <>
                  <Loader2 className="w-8 h-8 text-moodkin-gold mb-2 animate-spin" />
                  <p className="text-sm text-moodkin-gray font-medium">Uploading...</p>
                </>
              ) : (
                <>
                  <ImagePlus className="w-8 h-8 text-moodkin-gold mb-2" />
                  <p className="text-sm text-moodkin-gray font-medium">Add Asset</p>
                </>
              )}
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept="image/jpeg,image/png,image/gif,image/webp"
                multiple
                onChange={(e) => handleFileSelect(e.target.files)}
                disabled={isUploading}
              />
            </label>
          </div>
        )}

        {activeTab === 'creative' && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {/* Creative Assets (images only) */}
            {assets?.filter(a => userRoleMap.get(a.uploaded_by_id) === 'creative' && a.asset_type !== 'link').map((asset) => (
              <AssetCard
                key={asset.id}
                asset={asset}
                onDelete={handleDeleteAsset}
                currentUserId={currentUserId}
              />
            ))}

            {/* Add Asset Card */}
            <label className="aspect-square bg-moodkin-cream/50 rounded-2xl border-2 border-dashed border-moodkin-light-gray flex flex-col items-center justify-center cursor-pointer hover:border-moodkin-gold hover:bg-moodkin-cream transition-colors">
              {isUploading ? (
                <>
                  <Loader2 className="w-8 h-8 text-moodkin-gold mb-2 animate-spin" />
                  <p className="text-sm text-moodkin-gray font-medium">Uploading...</p>
                </>
              ) : (
                <>
                  <ImagePlus className="w-8 h-8 text-moodkin-gold mb-2" />
                  <p className="text-sm text-moodkin-gray font-medium">Add Creative</p>
                </>
              )}
              <input
                type="file"
                className="hidden"
                accept="image/jpeg,image/png,image/gif,image/webp"
                multiple
                onChange={(e) => handleFileSelect(e.target.files)}
                disabled={isUploading}
              />
            </label>
          </div>
        )}

        {activeTab === 'client' && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {/* Client Assets (images only) */}
            {assets?.filter(a => userRoleMap.get(a.uploaded_by_id) === 'client' && a.asset_type !== 'link').map((asset) => (
              <AssetCard
                key={asset.id}
                asset={asset}
                onDelete={handleDeleteAsset}
                currentUserId={currentUserId}
              />
            ))}

            {/* Add Asset Card */}
            <label className="aspect-square bg-moodkin-cream/50 rounded-2xl border-2 border-dashed border-moodkin-light-gray flex flex-col items-center justify-center cursor-pointer hover:border-moodkin-gold hover:bg-moodkin-cream transition-colors">
              {isUploading ? (
                <>
                  <Loader2 className="w-8 h-8 text-moodkin-gold mb-2 animate-spin" />
                  <p className="text-sm text-moodkin-gray font-medium">Uploading...</p>
                </>
              ) : (
                <>
                  <ImagePlus className="w-8 h-8 text-moodkin-gold mb-2" />
                  <p className="text-sm text-moodkin-gray font-medium">Add Client Asset</p>
                </>
              )}
              <input
                type="file"
                className="hidden"
                accept="image/jpeg,image/png,image/gif,image/webp"
                multiple
                onChange={(e) => handleFileSelect(e.target.files)}
                disabled={isUploading}
              />
            </label>
          </div>
        )}

        {activeTab === 'links' && (
          <div className="space-y-6">
            {/* Add Link Form */}
            <form onSubmit={handleAddLink} className="bg-white rounded-2xl p-4 shadow-sm">
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="url"
                  placeholder="Paste URL (Pinterest, YouTube, website...)"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  className="flex-1 px-4 py-3 rounded-xl border border-moodkin-light-gray focus:outline-none focus:border-moodkin-gold"
                  required
                />
                <input
                  type="text"
                  placeholder="Title (optional)"
                  value={linkTitle}
                  onChange={(e) => setLinkTitle(e.target.value)}
                  className="sm:w-48 px-4 py-3 rounded-xl border border-moodkin-light-gray focus:outline-none focus:border-moodkin-gold"
                />
                <Button
                  type="submit"
                  disabled={isAddingLink || !linkUrl.trim()}
                  className="bg-moodkin-gold hover:bg-moodkin-gold-hover text-moodkin-dark font-semibold rounded-xl px-6 py-3"
                >
                  {isAddingLink ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <Plus className="w-5 h-5 mr-1" />
                      Add Link
                    </>
                  )}
                </Button>
              </div>
            </form>

            {/* Links Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {assets?.filter(a => a.asset_type === 'link').map((link) => (
                <LinkCard
                  key={link.id}
                  link={link}
                  onDelete={handleDeleteAsset}
                  currentUserId={currentUserId}
                  getLinkIcon={getLinkIcon}
                />
              ))}
            </div>

            {assets?.filter(a => a.asset_type === 'link').length === 0 && (
              <div className="text-center py-8 text-moodkin-gray">
                <Link2 className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No links added yet</p>
                <p className="text-sm mt-1">Add Pinterest boards, YouTube videos, or any website reference</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'moodboards' && (
          <div className="space-y-6">
            {/* Header with Help Button */}
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-moodkin-dark">Your Moodboards</h2>
              <button
                onClick={() => setShowMoodboardHelp(true)}
                className="p-2 text-moodkin-gray hover:text-moodkin-dark hover:bg-moodkin-cream rounded-xl transition-colors"
                title="How moodboards work"
              >
                <HelpCircle className="w-5 h-5" />
              </button>
            </div>

            {/* Moodboards Grid */}
            {moodboardsLoading ? (
              <div className="text-center py-8 text-moodkin-gray">
                <Loader2 className="w-8 h-8 mx-auto mb-3 animate-spin text-moodkin-gold" />
                <p>Loading moodboards...</p>
              </div>
            ) : moodboards && moodboards.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {moodboards.map((moodboard) => (
                  <div
                    key={moodboard.id}
                    className="bg-white rounded-2xl shadow-sm overflow-hidden"
                  >
                    {/* Moodboard Preview Grid */}
                    <div className="grid grid-cols-3 gap-1 p-2 bg-moodkin-cream/30">
                      {moodboard.images.slice(0, 6).map((img, idx) => (
                        <div key={img.id} className="aspect-square relative">
                          <Image
                            src={img.asset.url}
                            alt=""
                            fill
                            className="object-cover rounded-lg"
                          />
                        </div>
                      ))}
                      {moodboard.images.length > 6 && (
                        <div className="aspect-square bg-moodkin-gold/20 rounded-lg flex items-center justify-center">
                          <span className="text-moodkin-dark font-bold">
                            +{moodboard.images.length - 6}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Moodboard Info */}
                    <div className="p-4">
                      <h3 className="font-bold text-moodkin-dark text-lg">{moodboard.title}</h3>
                      {moodboard.description && (
                        <p className="text-sm text-moodkin-gray mt-1">{moodboard.description}</p>
                      )}
                      <div className="flex items-center justify-between mt-4">
                        <p className="text-xs text-moodkin-gray">
                          {moodboard.images.length} images • Created by {moodboard.created_by_name}
                        </p>
                        <Button
                          onClick={() => handleExportPDF(moodboard)}
                          className="bg-moodkin-gold hover:bg-moodkin-gold-hover text-moodkin-dark font-semibold rounded-xl px-4 py-2 text-sm"
                        >
                          <Download className="w-4 h-4 mr-1" />
                          Export PDF
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-moodkin-gray">
                <Layout className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No moodboards created yet</p>
                <p className="text-sm mt-1">Click "Create Moodboard" to generate one from your images</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'conversation' && (
          <div className="flex flex-col h-[500px] bg-white rounded-2xl shadow-sm overflow-hidden">
            {pushSupported && (
              <div className="flex items-center justify-end px-4 pt-3 pb-1">
                <button
                  onClick={() => pushSubscribed ? pushUnsubscribe() : pushSubscribe()}
                  className={`inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${
                    pushSubscribed
                      ? 'border-moodkin-gold bg-moodkin-gold/10 text-moodkin-dark'
                      : 'border-gray-200 text-gray-500 hover:border-moodkin-gold hover:text-moodkin-dark'
                  }`}
                >
                  {pushSubscribed ? (
                    <>
                      <Bell className="w-3.5 h-3.5" />
                      Notifications on
                    </>
                  ) : (
                    <>
                      <BellOff className="w-3.5 h-3.5" />
                      Enable notifications
                    </>
                  )}
                </button>
              </div>
            )}
            <MessageList
              messages={messages || []}
              currentUserId={currentUserId}
              senderMap={senderMap}
            />
            <MessageInput
              onSend={(text) => sendMessage.mutate({ text_content: text })}
              disabled={sendMessage.isPending}
            />
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="mt-8 pb-4 flex gap-4">
        <Button
          onClick={handleCreateMoodboard}
          disabled={isCreatingMoodboard}
          className="flex-1 bg-moodkin-gold hover:bg-moodkin-gold-hover text-moodkin-dark font-bold rounded-2xl py-6 text-base tracking-wider"
        >
          {isCreatingMoodboard ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              CREATING...
            </>
          ) : (
            'CREATE MOODBOARD'
          )}
        </Button>

        <Button
          onClick={handleDelete}
          disabled={isDeleting}
          className="bg-red-500 hover:bg-red-600 text-white font-bold rounded-2xl py-6 px-6 text-base tracking-wider"
        >
          <Trash2 className="w-5 h-5" />
          <span className="sr-only">{isDeleting ? 'DELETING...' : 'DELETE PROJECT'}</span>
        </Button>
      </div>

      {/* Moodboard Help Dialog */}
      <Dialog open={showMoodboardHelp} onClose={() => setShowMoodboardHelp(false)} className="max-w-md p-0 overflow-hidden">
        {/* Header with gradient */}
        <div className="bg-gradient-to-r from-moodkin-gold to-moodkin-gold-hover p-6 text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-white/20 rounded-2xl mb-3">
            <Wand2 className="w-7 h-7 text-moodkin-dark" />
          </div>
          <h2 className="text-xl font-bold text-moodkin-dark">How Moodboards Work</h2>
          <p className="text-moodkin-dark/70 text-sm mt-1">AI-powered curation for your best images</p>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          {/* Step 1: Collect */}
          <div className="flex items-start gap-3 p-3 rounded-xl bg-moodkin-cream/30">
            <div className="w-9 h-9 rounded-xl bg-moodkin-gold/20 flex items-center justify-center flex-shrink-0">
              <ImagePlus className="w-4 h-4 text-moodkin-gold" />
            </div>
            <div>
              <p className="font-medium text-moodkin-dark text-sm">1. Collect Images</p>
              <p className="text-xs text-moodkin-gray mt-0.5">Gathers all images from your project uploads</p>
            </div>
          </div>

          {/* Step 2: Score */}
          <div className="flex items-start gap-3 p-3 rounded-xl bg-moodkin-cream/30">
            <div className="w-9 h-9 rounded-xl bg-moodkin-gold/20 flex items-center justify-center flex-shrink-0">
              <Heart className="w-4 h-4 text-moodkin-gold" />
            </div>
            <div>
              <p className="font-medium text-moodkin-dark text-sm">2. Score by Reactions</p>
              <p className="text-xs text-moodkin-gray mt-0.5">
                <span className="inline-flex items-center gap-1 text-green-600 font-medium">+1</span> for likes,
                <span className="inline-flex items-center gap-1 text-red-500 font-medium ml-1">-2</span> for flags
              </p>
            </div>
          </div>

          {/* Step 3: Curate */}
          <div className="flex items-start gap-3 p-3 rounded-xl bg-moodkin-cream/30">
            <div className="w-9 h-9 rounded-xl bg-moodkin-gold/20 flex items-center justify-center flex-shrink-0">
              <Flag className="w-4 h-4 text-moodkin-gold" />
            </div>
            <div>
              <p className="font-medium text-moodkin-dark text-sm">3. Curate & Sort</p>
              <p className="text-xs text-moodkin-gray mt-0.5">Filters flagged images, sorts best to top</p>
            </div>
          </div>

          {/* Step 4: AI Magic */}
          <div className="flex items-start gap-3 p-3 rounded-xl bg-moodkin-cream/30">
            <div className="w-9 h-9 rounded-xl bg-moodkin-gold/20 flex items-center justify-center flex-shrink-0">
              <Brain className="w-4 h-4 text-moodkin-gold" />
            </div>
            <div>
              <p className="font-medium text-moodkin-dark text-sm">4. AI Title & Description</p>
              <p className="text-xs text-moodkin-gray mt-0.5">GPT-4 Vision analyzes top images to create an evocative title and description</p>
            </div>
          </div>

          {/* Tip */}
          <div className="flex items-start gap-3 p-3 rounded-xl bg-gradient-to-r from-moodkin-gold/10 to-moodkin-gold/5 border border-moodkin-gold/20">
            <div className="w-9 h-9 rounded-xl bg-moodkin-gold/30 flex items-center justify-center flex-shrink-0">
              <Lightbulb className="w-4 h-4 text-moodkin-dark" />
            </div>
            <div>
              <p className="font-medium text-moodkin-dark text-sm">Pro Tip</p>
              <p className="text-xs text-moodkin-gray mt-0.5">React to images with likes and flags to influence which images appear in your moodboard!</p>
            </div>
          </div>
        </div>
      </Dialog>

      {/* Invite User Dialog */}
      <InviteUserDialog
        open={showInviteDialog}
        onClose={() => setShowInviteDialog(false)}
        projectId={projectId}
        projectTitle={project.title}
      />

      {/* Team Panel Dialog */}
      <Dialog open={showTeamPanel} onClose={() => setShowTeamPanel(false)} className="max-w-md">
        <DialogHeader>
          <DialogTitle>Project Team</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          {projectUsers && projectUsers.length > 0 ? (
            projectUsers.map((user) => (
              <div
                key={user.id}
                className="flex items-center justify-between p-3 rounded-xl bg-moodkin-cream/50"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-moodkin-gold/20 flex items-center justify-center">
                    <span className="text-sm font-medium text-moodkin-dark">
                      {user.email.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-moodkin-dark">{user.email}</p>
                    <div className="flex items-center gap-2">
                      {user.is_owner ? (
                        <span className="text-xs text-moodkin-gold font-medium">Owner</span>
                      ) : (
                        <button
                          onClick={() => {
                            const newRole = user.role === 'creative' ? 'client' : 'creative'
                            updateProjectUserRole.mutate({ userId: user.id, role: newRole })
                          }}
                          className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border transition-colors hover:bg-moodkin-gold/10 hover:border-moodkin-gold capitalize"
                          style={{
                            borderColor: user.role === 'creative' ? '#E9B824' : '#9ca3af',
                            color: user.role === 'creative' ? '#92700e' : '#6b7280',
                          }}
                        >
                          {user.role}
                        </button>
                      )}
                      {user.invite_status === 'pending' ? (
                        <span className="inline-flex items-center gap-1 text-xs text-amber-600">
                          <Clock className="w-3 h-3" />
                          Pending
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-green-600">
                          <CheckCircle className="w-3 h-3" />
                          Accepted
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => {
                    if (confirm('Remove this user from the project?')) {
                      removeProjectUser.mutate(user.id)
                    }
                  }}
                  className="p-2 text-moodkin-gray hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))
          ) : (
            <div className="text-center py-6 text-moodkin-gray">
              <Users className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p>No team members yet</p>
              <p className="text-sm mt-1">Invite collaborators to work on this project</p>
            </div>
          )}
          <Button
            onClick={() => {
              setShowTeamPanel(false)
              setShowInviteDialog(true)
            }}
            variant="outline"
            className="w-full mt-4"
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Invite Collaborator
          </Button>
        </div>
      </Dialog>
    </div>
  )
}
