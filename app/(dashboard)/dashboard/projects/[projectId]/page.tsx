'use client'

import { useState, useRef, useMemo, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { upload } from '@vercel/blob/client'
import { ChevronLeft, ChevronRight, MoreHorizontal, Sparkles, ImagePlus, Trash2, Loader2, Link2, Plus, ExternalLink, Layout, Download, HelpCircle, Wand2, Heart, Flag, Brain, Lightbulb, Users, X, Bell, BellOff, Pencil } from 'lucide-react'
import { useConversation, useDeleteConversation, useUpdateConversation } from '@/hooks/use-conversations'
import { useProjectAssets, useCreateProjectAsset, useDeleteProjectAsset, useUpdateAssetCreative, useInvalidateProjectAssets } from '@/hooks/use-project-assets'
import { useMoodboards, useCreateMoodboard, useDeleteMoodboard } from '@/hooks/use-moodboards'
import { useProjectUsers } from '@/hooks/use-project-users'
import { useMessages, useSendMessage } from '@/hooks/use-messages'
import { useSession } from '@/hooks/use-session'
import type { MoodboardWithImages } from '@/types/database'
import { Button } from '@/components/ui/button'
import { Dialog, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu'
import { InviteUserDialog } from '@/components/projects/invite-user-dialog'
import { EditProjectDialog } from '@/components/projects/edit-project-dialog'
import { AssetCard } from '@/components/assets/asset-card'
import { LinkCard } from '@/components/assets/link-card'
import { AssetPickerDialog } from '@/components/assets/asset-picker-dialog'
import { MoodboardCreatorDialog, type MoodboardOptions, type RankedAsset } from '@/components/moodboard/moodboard-creator-dialog'
import { MoodboardModeSelector, type MoodboardMode } from '@/components/moodboard/moodboard-mode-selector'
import { ManualMoodboardCreator, type ManualMoodboardOptions } from '@/components/moodboard/manual-moodboard-creator'
import { AIImageGenerator } from '@/components/moodboard/ai-image-generator'
import { SubscribeDialog } from '@/components/subscription/subscribe-dialog'
import { MessageList } from '@/components/conversation/message-list'
import { MessageInput } from '@/components/conversation/message-input'
import { usePushNotifications } from '@/hooks/use-push-notifications'
import { useProjectReactions } from '@/hooks/use-asset-interactions'
import { useUnseenCounts, useMarkAsSeen, type TabType } from '@/hooks/use-unseen-counts'
import { useToast } from '@/components/ui/toast'
import Image from 'next/image'
import Link from 'next/link'
import { Loading } from '@/components/ui/loading'

const tabs = [
  { id: 'creative', label: 'Creative', icon: 'sparkles' },
  { id: 'clients', label: 'Client', icon: null },
  { id: 'links', label: 'Links', icon: null },
  { id: 'moodboards', label: 'Moodboards', icon: null },
  { id: 'conversation', label: 'Conversation', icon: null },
]

type ExportFormat =
  | 'a4-pdf'
  | 'high-res-png'
  | 'high-res-jpg'
  | 'instagram-square'
  | 'instagram-story'
  | 'desktop-wallpaper'
  | 'custom'

const exportFormats: { id: ExportFormat; label: string; icon: string; width: number; height: number; type: 'pdf' | 'image' }[] = [
  { id: 'a4-pdf', label: 'A4 PDF (Print)', icon: '📄', width: 297, height: 210, type: 'pdf' },
  { id: 'high-res-png', label: 'High-res PNG', icon: '🖼️', width: 3840, height: 2160, type: 'image' },
  { id: 'high-res-jpg', label: 'High-res JPG', icon: '🖼️', width: 3840, height: 2160, type: 'image' },
  { id: 'instagram-square', label: 'Instagram Square', icon: '📱', width: 1080, height: 1080, type: 'image' },
  { id: 'instagram-story', label: 'Instagram Story', icon: '📱', width: 1080, height: 1920, type: 'image' },
  { id: 'desktop-wallpaper', label: 'Desktop Wallpaper', icon: '💻', width: 1920, height: 1080, type: 'image' },
  { id: 'custom', label: 'Custom Size', icon: '📋', width: 0, height: 0, type: 'image' },
]

export default function ProjectDetailPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const router = useRouter()
  const { session } = useSession()
  const { showToast } = useToast()
  const { data: project, isLoading } = useConversation(projectId)
  const { data: assets } = useProjectAssets(projectId)
  const { data: moodboards, isLoading: moodboardsLoading } = useMoodboards(projectId)
  const createAsset = useCreateProjectAsset(projectId)
  const deleteAsset = useDeleteProjectAsset(projectId)
  const updateAssetCreative = useUpdateAssetCreative(projectId)
  const invalidateAssets = useInvalidateProjectAssets(projectId)
  const createMoodboard = useCreateMoodboard(projectId)
  const deleteMoodboard = useDeleteMoodboard(projectId)
  const deleteProject = useDeleteConversation()
  const updateProject = useUpdateConversation(projectId)
  const [activeTab, setActiveTab] = useState('creative')
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [isAddingLink, setIsAddingLink] = useState(false)
  const [isCreatingMoodboard, setIsCreatingMoodboard] = useState(false)
  const [linkUrl, setLinkUrl] = useState('')
  const [linkTitle, setLinkTitle] = useState('')
  const [showMoodboardHelp, setShowMoodboardHelp] = useState(false)
  const [showInviteDialog, setShowInviteDialog] = useState(false)
  const [lightboxImage, setLightboxImage] = useState<string | null>(null)
  const [lightboxImages, setLightboxImages] = useState<string[]>([])
  const [lightboxIndex, setLightboxIndex] = useState(0)
  const [showCreativePicker, setShowCreativePicker] = useState(false)
  const [isSelectingCreative, setIsSelectingCreative] = useState(false)
  const [showMoodboardCreator, setShowMoodboardCreator] = useState(false)
  const [showMoodboardModeSelector, setShowMoodboardModeSelector] = useState(false)
  const [showManualMoodboardCreator, setShowManualMoodboardCreator] = useState(false)
  const [showAIImageGenerator, setShowAIImageGenerator] = useState(false)
  const [showSubscribeDialog, setShowSubscribeDialog] = useState(false)
  const [showCustomSizeDialog, setShowCustomSizeDialog] = useState(false)
  const [showExportDialog, setShowExportDialog] = useState(false)
  const [exportMoodboard, setExportMoodboard] = useState<MoodboardWithImages | null>(null)
  const [customExportMoodboard, setCustomExportMoodboard] = useState<MoodboardWithImages | null>(null)
  const [customWidth, setCustomWidth] = useState('1920')
  const [customHeight, setCustomHeight] = useState('1080')
  const [isExporting, setIsExporting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const creativeFileInputRef = useRef<HTMLInputElement>(null)
  const { data: projectUsers } = useProjectUsers(projectId)
  const { data: messages } = useMessages(projectId)
  const sendMessage = useSendMessage(projectId)
  const { isSupported: pushSupported, isSubscribed: pushSubscribed, subscribe: pushSubscribe, unsubscribe: pushUnsubscribe } = usePushNotifications()
  const { data: allReactions } = useProjectReactions(projectId)
  const { data: unseenCounts } = useUnseenCounts()
  const { markSeen } = useMarkAsSeen(projectId)

  const currentUserId = session?.user?.id || ''

  // Compute ranked assets for automatic moodboard (sorted by likes, excludes flagged)
  const rankedAssets: RankedAsset[] = useMemo(() => {
    if (!assets || !allReactions) return []

    // Include images and links that have thumbnails
    const visualAssets = assets.filter(a =>
      a.asset_type === 'image' || (a.asset_type === 'link' && a.thumbnail_url)
    )

    // Calculate scores for each asset
    const scored = visualAssets.map(asset => {
      const assetReactions = allReactions.filter(r => r.asset_id === asset.id)
      const likes = assetReactions.filter(r => r.reaction_type === 'like').length
      const flags = assetReactions.filter(r => r.reaction_type === 'redflag').length
      const score = likes - (flags * 2)
      return { asset, score, flags }
    })

    // Filter out flagged images and sort by score (highest first)
    return scored
      .filter(a => a.flags === 0) // Exclude any image with red flags
      .sort((a, b) => b.score - a.score)
      .map(({ asset, score }) => ({ asset, score }))
  }, [assets, allReactions])

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

  // Get current user's role in this project
  const currentUserRole = userRoleMap.get(currentUserId) || null
  const isCreative = currentUserRole === 'creative'
  const isClient = currentUserRole === 'client'

  // Helper to check if a user is a creative (owner or creative role)
  const isUserCreative = (userId: string | null) => {
    if (!userId) return false
    const role = userRoleMap.get(userId)
    return role === 'creative'
  }

  // Check if project owner has subscription (stripeid starts with 'cus_' for Stripe customers)
  const projectOwner = projectUsers?.find(pu => pu.is_owner)
  const ownerHasSubscription = projectOwner?.user?.stripeid?.startsWith('cus_') ?? false

  // Filter assets for each tab
  // Client tab: only images uploaded by clients (not creatives)
  const clientAssets = useMemo(() =>
    assets?.filter(a => a.asset_type !== 'link' && !isUserCreative(a.uploaded_by_id)) || [],
    [assets, userRoleMap]
  )
  // Creative tab: images uploaded by creatives OR marked as creative
  const creativeAssets = useMemo(() =>
    assets?.filter(a => a.asset_type !== 'link' && (a.creative || isUserCreative(a.uploaded_by_id))) || [],
    [assets, userRoleMap]
  )

  // Compute image arrays for each tab for lightbox navigation
  const clientTabImages = useMemo(() =>
    clientAssets.map(a => a.url),
    [clientAssets]
  )
  const creativeTabImages = useMemo(() =>
    creativeAssets.map(a => a.url),
    [creativeAssets]
  )

  // Mark tab as seen when user views it
  useEffect(() => {
    if (!projectId) return

    // Map activeTab to the correct TabType
    const tabTypeMap: Record<string, TabType> = {
      'clients': 'client',
      'creative': 'creative',
      'links': 'links',
      'conversation': 'conversations',
    }

    const tabType = tabTypeMap[activeTab]
    if (tabType) {
      // Small delay to ensure the component is rendered
      const timer = setTimeout(() => {
        markSeen(tabType)
      }, 300)
      return () => clearTimeout(timer)
    }
  }, [activeTab, projectId, markSeen])

  // Mark project as seen when page loads
  useEffect(() => {
    if (projectId) {
      markSeen('project')
    }
  }, [projectId, markSeen])

  // Open lightbox with navigation context
  const openLightbox = useCallback((imageUrl: string, imageList: string[]) => {
    const index = imageList.indexOf(imageUrl)
    setLightboxImages(imageList)
    setLightboxIndex(index >= 0 ? index : 0)
    setLightboxImage(imageUrl)
  }, [])

  // Lightbox navigation
  const goToPrevImage = useCallback(() => {
    if (lightboxImages.length === 0) return
    const newIndex = (lightboxIndex - 1 + lightboxImages.length) % lightboxImages.length
    setLightboxIndex(newIndex)
    setLightboxImage(lightboxImages[newIndex])
  }, [lightboxImages, lightboxIndex])

  const goToNextImage = useCallback(() => {
    if (lightboxImages.length === 0) return
    const newIndex = (lightboxIndex + 1) % lightboxImages.length
    setLightboxIndex(newIndex)
    setLightboxImage(lightboxImages[newIndex])
  }, [lightboxImages, lightboxIndex])

  // Keyboard navigation for lightbox
  useEffect(() => {
    if (!lightboxImage) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        goToPrevImage()
      } else if (e.key === 'ArrowRight') {
        goToNextImage()
      } else if (e.key === 'Escape') {
        setLightboxImage(null)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [lightboxImage, goToPrevImage, goToNextImage])

  const handleSelectForCreative = async (assetIds: string[]) => {
    setIsSelectingCreative(true)
    try {
      for (const assetId of assetIds) {
        await updateAssetCreative.mutateAsync({ assetId, creative: true })
      }
    } finally {
      setIsSelectingCreative(false)
    }
  }

  const handleFileSelect = async (files: FileList | null, markAsCreative = false) => {
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
        const asset = await createAsset.mutateAsync({
          url: blob.url,
          filename: file.name,
        })

        // If uploading to creative tab, mark as creative
        if (markAsCreative && asset?.id) {
          await updateAssetCreative.mutateAsync({ assetId: asset.id, creative: true })
        }
      }
    } catch (error) {
      console.error('Upload failed:', error)
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      if (creativeFileInputRef.current) {
        creativeFileInputRef.current.value = ''
      }
    }
  }

  const handleDeleteAsset = async (assetId: string) => {
    if (!confirm('Delete this image?')) return
    try {
      await deleteAsset.mutateAsync(assetId)
    } catch (error) {
      console.error('Failed to delete asset:', error)
      alert(error instanceof Error ? error.message : 'Failed to delete asset')
    }
  }

  const handleRemoveFromCreative = async (assetId: string) => {
    if (!confirm('Remove this image from creative selection?')) return
    try {
      await updateAssetCreative.mutateAsync({ assetId, creative: false })
    } catch (error) {
      console.error('Failed to remove from creative:', error)
      alert(error instanceof Error ? error.message : 'Failed to remove from creative')
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

    // Add https:// if no protocol is provided
    let normalizedUrl = linkUrl.trim()
    if (!normalizedUrl.match(/^https?:\/\//i)) {
      normalizedUrl = 'https://' + normalizedUrl
    }

    setIsAddingLink(true)
    try {
      // Check if URL is a direct image link (actual image file, not a page)
      const urlPath = normalizedUrl.split('?')[0].toLowerCase()
      const isDirectImage = /\.(jpg|jpeg|png|gif|webp|svg|bmp)$/i.test(urlPath)

      let metadata = { title: null as string | null, image: null as string | null }

      if (isDirectImage) {
        // For direct image URLs, use the URL itself as the thumbnail
        metadata.image = normalizedUrl
        metadata.title = linkTitle || 'Image'
      } else {
        // Fetch URL metadata for thumbnail and title
        try {
          const metaRes = await fetch('/api/url-metadata', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: normalizedUrl }),
          })
          if (metaRes.ok) {
            metadata = await metaRes.json()
          }
        } catch {
          // Continue without metadata if fetch fails
        }
      }

      // Check if we got an image
      const hasImage = !!metadata.image

      await createAsset.mutateAsync({
        url: normalizedUrl,
        filename: '',
        asset_type: 'link',
        title: linkTitle || metadata.title || new URL(normalizedUrl).hostname,
        thumbnail_url: metadata.image,
      })
      setLinkUrl('')
      setLinkTitle('')

      // Notify user based on result
      if (hasImage) {
        showToast('Link added with image preview', 'success')
      } else {
        showToast('Link added but no image found. Try copying the direct image URL instead.', 'info')
      }
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

  const handleOpenMoodboardCreator = () => {
    setShowMoodboardModeSelector(true)
  }

  const handleSelectMoodboardMode = (mode: MoodboardMode) => {
    setShowMoodboardModeSelector(false)
    if (mode === 'automatic') {
      setShowMoodboardCreator(true)
    } else if (mode === 'manual') {
      setShowManualMoodboardCreator(true)
    }
  }

  const handleCreateMoodboard = async (options: MoodboardOptions) => {
    setIsCreatingMoodboard(true)
    try {
      await createMoodboard.mutateAsync({
        backgroundColor: options.backgroundColor,
        gridLayout: options.gridLayout,
        borderEnabled: options.borderEnabled,
        borderColor: options.borderColor,
        borderRadius: options.borderRadius,
        borderWidth: options.borderWidth,
        spacing: options.spacing,
        mode: 'automatic',
      })
      setShowMoodboardCreator(false)
      setActiveTab('moodboards')
    } catch (error) {
      console.error('Failed to create moodboard:', error)
      alert(error instanceof Error ? error.message : 'Failed to create moodboard')
    } finally {
      setIsCreatingMoodboard(false)
    }
  }

  const handleCreateManualMoodboard = async (options: ManualMoodboardOptions) => {
    setIsCreatingMoodboard(true)
    try {
      await createMoodboard.mutateAsync({
        backgroundColor: options.backgroundColor,
        gridLayout: options.gridLayout,
        borderRadius: options.borderRadius,
        spacing: options.spacing,
        aspectRatio: options.aspectRatio,
        mode: 'manual',
        selectedAssetIds: options.selectedAssetIds,
      })
      setShowManualMoodboardCreator(false)
      setActiveTab('moodboards')
    } catch (error) {
      console.error('Failed to create moodboard:', error)
      alert(error instanceof Error ? error.message : 'Failed to create moodboard')
    } finally {
      setIsCreatingMoodboard(false)
    }
  }

  const handleAIImageSaved = () => {
    // Invalidate assets query to refresh the list
    invalidateAssets()
    setActiveTab('creative')
  }

  // Helper function to convert hex to RGB
  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 26, g: 26, b: 26 }
  }

  // Helper to load image as base64 and get dimensions
  const loadImage = async (url: string, isExternal: boolean): Promise<{ base64: string; width: number; height: number } | null> => {
    try {
      const fetchUrl = isExternal
        ? `/api/image-proxy?url=${encodeURIComponent(url)}`
        : url
      const response = await fetch(fetchUrl)
      if (!response.ok) return null
      const blob = await response.blob()
      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader()
        reader.onloadend = () => resolve(reader.result as string)
        reader.readAsDataURL(blob)
      })

      const dimensions = await new Promise<{ width: number; height: number }>((resolve) => {
        const img = new window.Image()
        img.onload = () => resolve({ width: img.width, height: img.height })
        img.onerror = () => resolve({ width: 1, height: 1 })
        img.src = base64
      })

      return { base64, ...dimensions }
    } catch {
      return null
    }
  }

  // Get layout rectangles for canvas rendering (in pixels)
  type ImageRect = { x: number; y: number; w: number; h: number }
  const getLayoutRectsPixels = (
    layout: string,
    imageCount: number,
    canvasWidth: number,
    canvasHeight: number,
    spacing: number,
    margin: number,
    titleHeight: number
  ): ImageRect[] => {
    const count = imageCount
    const w = canvasWidth - margin * 2
    const h = canvasHeight - margin * 2 - titleHeight
    const x = margin
    const y = margin + titleHeight
    const s = spacing

    if (layout === '1' || count === 1) {
      return [{ x, y, w, h }]
    }

    if (layout === '2h') {
      const cellW = (w - s) / 2
      return [
        { x, y, w: cellW, h },
        { x: x + cellW + s, y, w: cellW, h }
      ]
    }
    if (layout === '2v') {
      const cellH = (h - s) / 2
      return [
        { x, y, w, h: cellH },
        { x, y: y + cellH + s, w, h: cellH }
      ]
    }
    if (layout === '2-big-left') {
      const bigW = (w - s) * 2 / 3
      const smallW = w - s - bigW
      return [
        { x, y, w: bigW, h },
        { x: x + bigW + s, y, w: smallW, h }
      ]
    }
    if (layout === '2-big-right') {
      const smallW = (w - s) / 3
      const bigW = w - s - smallW
      return [
        { x, y, w: smallW, h },
        { x: x + smallW + s, y, w: bigW, h }
      ]
    }

    if (layout === '3-top' || (layout === 'auto' && count === 3)) {
      const topH = (h - s) * 0.6
      const bottomH = h - s - topH
      const cellW = (w - s) / 2
      return [
        { x, y, w, h: topH },
        { x, y: y + topH + s, w: cellW, h: bottomH },
        { x: x + cellW + s, y: y + topH + s, w: cellW, h: bottomH }
      ]
    }
    if (layout === '3-bottom') {
      const topH = (h - s) / 2
      const bottomH = h - s - topH
      const cellW = (w - s) / 2
      return [
        { x, y, w: cellW, h: topH },
        { x: x + cellW + s, y, w: cellW, h: topH },
        { x, y: y + topH + s, w, h: bottomH }
      ]
    }
    if (layout === '3-left') {
      const leftW = (w - s) / 2
      const rightW = w - s - leftW
      const cellH = (h - s) / 2
      return [
        { x, y, w: leftW, h },
        { x: x + leftW + s, y, w: rightW, h: cellH },
        { x: x + leftW + s, y: y + cellH + s, w: rightW, h: cellH }
      ]
    }
    if (layout === '3-right') {
      const leftW = (w - s) / 2
      const rightW = w - s - leftW
      const cellH = (h - s) / 2
      return [
        { x, y, w: leftW, h: cellH },
        { x, y: y + cellH + s, w: leftW, h: cellH },
        { x: x + leftW + s, y, w: rightW, h }
      ]
    }
    if (layout === '3-row') {
      const cellW = (w - s * 2) / 3
      return [
        { x, y, w: cellW, h },
        { x: x + cellW + s, y, w: cellW, h },
        { x: x + cellW * 2 + s * 2, y, w: cellW, h }
      ]
    }
    if (layout === '3-col') {
      const cellH = (h - s * 2) / 3
      return [
        { x, y, w, h: cellH },
        { x, y: y + cellH + s, w, h: cellH },
        { x, y: y + cellH * 2 + s * 2, w, h: cellH }
      ]
    }

    if (layout === '2x2') {
      const cellW = (w - s) / 2
      const cellH = (h - s) / 2
      return [
        { x, y, w: cellW, h: cellH },
        { x: x + cellW + s, y, w: cellW, h: cellH },
        { x, y: y + cellH + s, w: cellW, h: cellH },
        { x: x + cellW + s, y: y + cellH + s, w: cellW, h: cellH }
      ]
    }
    if (layout === '4-top') {
      const topH = (h - s) * 2 / 3
      const bottomH = h - s - topH
      const cellW = (w - s * 2) / 3
      return [
        { x, y, w, h: topH },
        { x, y: y + topH + s, w: cellW, h: bottomH },
        { x: x + cellW + s, y: y + topH + s, w: cellW, h: bottomH },
        { x: x + cellW * 2 + s * 2, y: y + topH + s, w: cellW, h: bottomH }
      ]
    }
    if (layout === '4-left') {
      const leftW = (w - s) / 2
      const rightW = w - s - leftW
      const cellH = (h - s * 2) / 3
      return [
        { x, y, w: leftW, h },
        { x: x + leftW + s, y, w: rightW, h: cellH },
        { x: x + leftW + s, y: y + cellH + s, w: rightW, h: cellH },
        { x: x + leftW + s, y: y + cellH * 2 + s * 2, w: rightW, h: cellH }
      ]
    }
    if (layout === '4-row') {
      const cellW = (w - s * 3) / 4
      return [
        { x, y, w: cellW, h },
        { x: x + cellW + s, y, w: cellW, h },
        { x: x + cellW * 2 + s * 2, y, w: cellW, h },
        { x: x + cellW * 3 + s * 3, y, w: cellW, h }
      ]
    }
    if (layout === '4-col') {
      const cellH = (h - s * 3) / 4
      return [
        { x, y, w, h: cellH },
        { x, y: y + cellH + s, w, h: cellH },
        { x, y: y + cellH * 2 + s * 2, w, h: cellH },
        { x, y: y + cellH * 3 + s * 3, w, h: cellH }
      ]
    }
    if (layout === '4-diagonal') {
      const bigW = (w - s) * 2 / 3
      const smallW = w - s - bigW
      const bigH = (h - s) * 2 / 3
      const smallH = h - s - bigH
      return [
        { x, y, w: bigW, h: bigH },
        { x: x + bigW + s, y, w: smallW, h: smallH },
        { x: x + bigW + s, y: y + smallH + s, w: smallW, h: bigH - smallH },
        { x, y: y + bigH + s, w: bigW, h: smallH }
      ]
    }

    if (layout === '5-top2') {
      const topH = (h - s) / 2
      const bottomH = h - s - topH
      const topCellW = (w - s) / 2
      const bottomCellW = (w - s * 2) / 3
      return [
        { x, y, w: topCellW, h: topH },
        { x: x + topCellW + s, y, w: topCellW, h: topH },
        { x, y: y + topH + s, w: bottomCellW, h: bottomH },
        { x: x + bottomCellW + s, y: y + topH + s, w: bottomCellW, h: bottomH },
        { x: x + bottomCellW * 2 + s * 2, y: y + topH + s, w: bottomCellW, h: bottomH }
      ]
    }
    if (layout === '5-top3') {
      const topH = (h - s) / 2
      const bottomH = h - s - topH
      const topCellW = (w - s * 2) / 3
      const bottomCellW = (w - s) / 2
      return [
        { x, y, w: topCellW, h: topH },
        { x: x + topCellW + s, y, w: topCellW, h: topH },
        { x: x + topCellW * 2 + s * 2, y, w: topCellW, h: topH },
        { x, y: y + topH + s, w: bottomCellW, h: bottomH },
        { x: x + bottomCellW + s, y: y + topH + s, w: bottomCellW, h: bottomH }
      ]
    }
    if (layout === '5-big') {
      const bigW = (w - s) * 2 / 3
      const smallW = w - s - bigW
      return [
        { x, y, w: bigW, h },
        { x: x + bigW + s, y, w: smallW, h: (h - s) / 2 },
        { x: x + bigW + s, y: y + (h - s) / 2 + s, w: smallW, h: (h - s) / 2 },
        { x: x + bigW + s, y: y + (h - s) / 2 + s, w: smallW, h: (h - s) / 2 },
        { x: x + bigW + s, y: y + (h - s) / 2 + s, w: smallW, h: (h - s) / 2 }
      ].slice(0, Math.min(5, count)).map((rect, i) => {
        if (i === 0) return { x, y, w: bigW, h }
        const cellH = (h - s) / 2
        return {
          x: x + bigW + s,
          y: y + Math.floor((i - 1) / 1) * (cellH + s),
          w: smallW,
          h: cellH
        }
      })
    }

    if (layout === '3x2') {
      const cellW = (w - s * 2) / 3
      const cellH = (h - s) / 2
      return [
        { x, y, w: cellW, h: cellH },
        { x: x + cellW + s, y, w: cellW, h: cellH },
        { x: x + cellW * 2 + s * 2, y, w: cellW, h: cellH },
        { x, y: y + cellH + s, w: cellW, h: cellH },
        { x: x + cellW + s, y: y + cellH + s, w: cellW, h: cellH },
        { x: x + cellW * 2 + s * 2, y: y + cellH + s, w: cellW, h: cellH }
      ]
    }
    if (layout === '2x3') {
      const cellW = (w - s) / 2
      const cellH = (h - s * 2) / 3
      return [
        { x, y, w: cellW, h: cellH },
        { x: x + cellW + s, y, w: cellW, h: cellH },
        { x, y: y + cellH + s, w: cellW, h: cellH },
        { x: x + cellW + s, y: y + cellH + s, w: cellW, h: cellH },
        { x, y: y + cellH * 2 + s * 2, w: cellW, h: cellH },
        { x: x + cellW + s, y: y + cellH * 2 + s * 2, w: cellW, h: cellH }
      ]
    }
    if (layout === '6-big') {
      const bigW = (w - s) * 2 / 3
      const smallW = w - s - bigW
      const bigH = (h - s) * 2 / 3
      const smallH = (h - s * 2) / 3
      return [
        { x, y, w: bigW, h: bigH },
        { x: x + bigW + s, y, w: smallW, h: smallH },
        { x: x + bigW + s, y: y + smallH + s, w: smallW, h: smallH },
        { x, y: y + bigH + s, w: smallW, h: h - bigH - s },
        { x: x + smallW + s, y: y + bigH + s, w: smallW, h: h - bigH - s },
        { x: x + smallW * 2 + s * 2, y: y + bigH + s, w: w - smallW * 2 - s * 2, h: h - bigH - s }
      ]
    }

    // Manual grid layout (format: "manual-{rows}x{cols}")
    if (layout.startsWith('manual-')) {
      const match = layout.match(/manual-(\d+)x(\d+)/)
      if (match) {
        const rows = parseInt(match[1], 10)
        const cols = parseInt(match[2], 10)
        const cellW = (w - s * (cols - 1)) / cols
        const cellH = (h - s * (rows - 1)) / rows
        const rects: ImageRect[] = []
        for (let row = 0; row < rows; row++) {
          for (let col = 0; col < cols; col++) {
            rects.push({
              x: x + col * (cellW + s),
              y: y + row * (cellH + s),
              w: cellW,
              h: cellH
            })
          }
        }
        return rects.slice(0, count)
      }
    }

    // Default tiered layout
    const topCount = Math.min(2, count)
    const midCount = Math.min(3, count - topCount)
    const bottomCount = Math.min(4, count - topCount - midCount)
    const rects: ImageRect[] = []

    const topH = h * 0.45
    const midH = midCount > 0 ? h * 0.35 : 0
    const bottomH = bottomCount > 0 ? h - topH - midH - s * 2 : 0

    const topCellW = (w - s * (topCount - 1)) / topCount
    for (let i = 0; i < topCount; i++) {
      rects.push({ x: x + i * (topCellW + s), y, w: topCellW, h: topH })
    }

    if (midCount > 0) {
      const midCellW = (w - s * (midCount - 1)) / midCount
      for (let i = 0; i < midCount; i++) {
        rects.push({ x: x + i * (midCellW + s), y: y + topH + s, w: midCellW, h: midH })
      }
    }

    if (bottomCount > 0) {
      const bottomCellW = (w - s * (bottomCount - 1)) / bottomCount
      for (let i = 0; i < bottomCount; i++) {
        rects.push({ x: x + i * (bottomCellW + s), y: y + topH + midH + s * 2, w: bottomCellW, h: bottomH })
      }
    }

    return rects
  }

  // Unified export handler
  const handleExport = async (moodboard: MoodboardWithImages, format: ExportFormat, customDimensions?: { width: number; height: number }) => {
    setIsExporting(true)

    try {
      const formatConfig = exportFormats.find(f => f.id === format)
      if (!formatConfig) return

      const bgColor = moodboard.background_color || '#1A1A1A'
      const bg = hexToRgb(bgColor)
      const gridLayout = moodboard.grid_layout || '2x2'
      const spacingPx = moodboard.spacing ?? 8
      const borderEnabled = moodboard.border_enabled ?? false
      const borderWidth = moodboard.border_width ?? 0
      const borderColor = moodboard.border_color || '#FFFFFF'
      const borderRadius = moodboard.border_radius ?? 12

      // Filter valid images
      const validImages = moodboard.images.filter(img => {
        if (img.score < 0 || !img.asset) return false
        if (img.asset.asset_type === 'link') return !!img.asset.thumbnail_url
        return !!img.asset.url
      })

      const getImgUrl = (img: typeof validImages[0]) =>
        img.asset.asset_type === 'link' ? img.asset.thumbnail_url : img.asset.url

      if (format === 'a4-pdf') {
        // PDF export using jsPDF
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
        const usableHeight = pageHeight - margin * 2 - 30

        pdf.setDrawColor(bg.r, bg.g, bg.b)
        pdf.setLineWidth(0)
        pdf.setFillColor(bg.r, bg.g, bg.b)
        pdf.rect(0, 0, pageWidth, pageHeight, 'F')

        const titleColor = bg.r + bg.g + bg.b < 380 ? 255 : 51
        pdf.setFontSize(24)
        pdf.setTextColor(titleColor, titleColor, titleColor)
        pdf.text(moodboard.title, pageWidth / 2, margin + 10, { align: 'center' })

        if (moodboard.description) {
          pdf.setFontSize(12)
          pdf.setTextColor(titleColor === 255 ? 180 : 128, titleColor === 255 ? 180 : 128, titleColor === 255 ? 180 : 128)
          pdf.text(moodboard.description, pageWidth / 2, margin + 18, { align: 'center' })
        }

        const startY = margin + 25
        const spacing = spacingPx * 0.264583
        const borderWidthMm = borderWidth * 0.264583
        const borderRadiusMm = borderRadius * 0.264583

        // Get layout rects for PDF (using mm units)
        const layoutRects = getLayoutRectsPixels(
          gridLayout,
          validImages.length,
          usableWidth + margin * 2,
          usableHeight + startY,
          spacing,
          margin,
          startY - margin
        )

        for (let i = 0; i < Math.min(validImages.length, layoutRects.length); i++) {
          const img = validImages[i]
          const rect = layoutRects[i]
          const url = getImgUrl(img)
          const isExternal = img.asset.asset_type === 'link'

          if (!url) continue

          const imageData = await loadImage(url, isExternal)
          if (imageData) {
            const imgRatio = imageData.width / imageData.height
            const rectRatio = rect.w / rect.h

            let drawW: number, drawH: number, drawX: number, drawY: number

            if (imgRatio > rectRatio) {
              drawH = rect.h
              drawW = rect.h * imgRatio
              drawX = rect.x - (drawW - rect.w) / 2
              drawY = rect.y
            } else {
              drawW = rect.w
              drawH = rect.w / imgRatio
              drawX = rect.x
              drawY = rect.y - (drawH - rect.h) / 2
            }

            const ctx = pdf.context2d
            ctx.save()
            ctx.beginPath()
            ctx.rect(rect.x, rect.y, rect.w, rect.h)
            ctx.clip()
            pdf.addImage(imageData.base64, 'JPEG', drawX, drawY, drawW, drawH)
            ctx.restore()

            if (borderEnabled && borderWidthMm > 0) {
              const border = hexToRgb(borderColor)
              pdf.setDrawColor(border.r, border.g, border.b)
              pdf.setLineWidth(borderWidthMm)
              if (borderRadiusMm > 0) {
                pdf.roundedRect(rect.x, rect.y, rect.w, rect.h, borderRadiusMm, borderRadiusMm, 'S')
              } else {
                pdf.rect(rect.x, rect.y, rect.w, rect.h, 'S')
              }
            }
          } else {
            pdf.setFillColor(240, 240, 240)
            pdf.rect(rect.x, rect.y, rect.w, rect.h, 'F')
          }
        }

        pdf.setFontSize(8)
        pdf.setTextColor(titleColor === 255 ? 120 : 180, titleColor === 255 ? 120 : 180, titleColor === 255 ? 120 : 180)
        pdf.text(`Created with Moodkin • ${new Date().toLocaleDateString()}`, pageWidth / 2, pageHeight - 5, { align: 'center' })

        pdf.save(`${moodboard.title.replace(/[^a-z0-9]/gi, '_')}_moodboard.pdf`)
      } else {
        // Image export using Canvas
        const width = customDimensions?.width || formatConfig.width
        const height = customDimensions?.height || formatConfig.height
        const margin = Math.round(Math.min(width, height) * 0.03)
        const titleHeight = Math.round(height * 0.08)

        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')!

        // Fill background
        ctx.fillStyle = bgColor
        ctx.fillRect(0, 0, width, height)

        // Draw title
        const titleColor = bg.r + bg.g + bg.b < 380 ? '#FFFFFF' : '#333333'
        const fontSize = Math.round(height * 0.035)
        ctx.fillStyle = titleColor
        ctx.font = `bold ${fontSize}px system-ui, -apple-system, sans-serif`
        ctx.textAlign = 'center'
        ctx.fillText(moodboard.title, width / 2, margin + fontSize)

        // Draw description if exists
        if (moodboard.description) {
          const descFontSize = Math.round(fontSize * 0.6)
          ctx.fillStyle = bg.r + bg.g + bg.b < 380 ? '#AAAAAA' : '#666666'
          ctx.font = `${descFontSize}px system-ui, -apple-system, sans-serif`
          ctx.fillText(moodboard.description, width / 2, margin + fontSize + descFontSize + 5)
        }

        // Get layout rectangles
        const layoutRects = getLayoutRectsPixels(
          gridLayout,
          validImages.length,
          width,
          height - Math.round(height * 0.03), // Leave space for footer
          spacingPx,
          margin,
          titleHeight
        )

        // Load and draw images
        for (let i = 0; i < Math.min(validImages.length, layoutRects.length); i++) {
          const img = validImages[i]
          const rect = layoutRects[i]
          const url = getImgUrl(img)
          const isExternal = img.asset.asset_type === 'link'

          if (!url) continue

          const imageData = await loadImage(url, isExternal)
          if (imageData) {
            const imgRatio = imageData.width / imageData.height
            const rectRatio = rect.w / rect.h

            let drawW: number, drawH: number, drawX: number, drawY: number

            if (imgRatio > rectRatio) {
              drawH = rect.h
              drawW = rect.h * imgRatio
              drawX = rect.x - (drawW - rect.w) / 2
              drawY = rect.y
            } else {
              drawW = rect.w
              drawH = rect.w / imgRatio
              drawX = rect.x
              drawY = rect.y - (drawH - rect.h) / 2
            }

            // Create temporary image element
            const tempImg = new window.Image()
            tempImg.crossOrigin = 'anonymous'
            await new Promise<void>((resolve) => {
              tempImg.onload = () => resolve()
              tempImg.onerror = () => resolve()
              tempImg.src = imageData.base64
            })

            // Save context, clip to rect, draw image
            ctx.save()
            if (borderRadius > 0) {
              const r = borderRadius
              ctx.beginPath()
              ctx.moveTo(rect.x + r, rect.y)
              ctx.lineTo(rect.x + rect.w - r, rect.y)
              ctx.quadraticCurveTo(rect.x + rect.w, rect.y, rect.x + rect.w, rect.y + r)
              ctx.lineTo(rect.x + rect.w, rect.y + rect.h - r)
              ctx.quadraticCurveTo(rect.x + rect.w, rect.y + rect.h, rect.x + rect.w - r, rect.y + rect.h)
              ctx.lineTo(rect.x + r, rect.y + rect.h)
              ctx.quadraticCurveTo(rect.x, rect.y + rect.h, rect.x, rect.y + rect.h - r)
              ctx.lineTo(rect.x, rect.y + r)
              ctx.quadraticCurveTo(rect.x, rect.y, rect.x + r, rect.y)
              ctx.closePath()
              ctx.clip()
            } else {
              ctx.beginPath()
              ctx.rect(rect.x, rect.y, rect.w, rect.h)
              ctx.clip()
            }
            ctx.drawImage(tempImg, drawX, drawY, drawW, drawH)
            ctx.restore()

            // Draw border if enabled
            if (borderEnabled && borderWidth > 0) {
              ctx.strokeStyle = borderColor
              ctx.lineWidth = borderWidth
              if (borderRadius > 0) {
                const r = borderRadius
                ctx.beginPath()
                ctx.moveTo(rect.x + r, rect.y)
                ctx.lineTo(rect.x + rect.w - r, rect.y)
                ctx.quadraticCurveTo(rect.x + rect.w, rect.y, rect.x + rect.w, rect.y + r)
                ctx.lineTo(rect.x + rect.w, rect.y + rect.h - r)
                ctx.quadraticCurveTo(rect.x + rect.w, rect.y + rect.h, rect.x + rect.w - r, rect.y + rect.h)
                ctx.lineTo(rect.x + r, rect.y + rect.h)
                ctx.quadraticCurveTo(rect.x, rect.y + rect.h, rect.x, rect.y + rect.h - r)
                ctx.lineTo(rect.x, rect.y + r)
                ctx.quadraticCurveTo(rect.x, rect.y, rect.x + r, rect.y)
                ctx.closePath()
                ctx.stroke()
              } else {
                ctx.strokeRect(rect.x, rect.y, rect.w, rect.h)
              }
            }
          } else {
            // Placeholder
            ctx.fillStyle = '#F0F0F0'
            ctx.fillRect(rect.x, rect.y, rect.w, rect.h)
          }
        }

        // Draw footer
        const footerFontSize = Math.round(height * 0.015)
        ctx.fillStyle = bg.r + bg.g + bg.b < 380 ? '#888888' : '#AAAAAA'
        ctx.font = `${footerFontSize}px system-ui, -apple-system, sans-serif`
        ctx.textAlign = 'center'
        ctx.fillText(`Created with Moodkin • ${new Date().toLocaleDateString()}`, width / 2, height - margin)

        // Download
        const extension = format === 'high-res-jpg' ? 'jpg' : 'png'
        const mimeType = format === 'high-res-jpg' ? 'image/jpeg' : 'image/png'
        const quality = format === 'high-res-jpg' ? 0.95 : undefined

        canvas.toBlob((blob) => {
          if (blob) {
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `${moodboard.title.replace(/[^a-z0-9]/gi, '_')}_moodboard.${extension}`
            document.body.appendChild(a)
            a.click()
            document.body.removeChild(a)
            URL.revokeObjectURL(url)
          }
        }, mimeType, quality)
      }
    } finally {
      setIsExporting(false)
    }
  }

  // Handler for custom export with user dimensions
  const handleCustomExport = () => {
    if (customExportMoodboard) {
      const width = parseInt(customWidth) || 1920
      const height = parseInt(customHeight) || 1080
      handleExport(customExportMoodboard, 'custom', { width, height })
      setShowCustomSizeDialog(false)
      setCustomExportMoodboard(null)
    }
  }

  if (isLoading) {
    return <Loading message="Loading project..." />
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
              onClick={() => setShowInviteDialog(true)}
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
            <DropdownMenuItem onClick={() => setShowEditDialog(true)}>
              <Pencil className="w-4 h-4" />
              Edit Project.
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setShowInviteDialog(true)}>
              <Users className="w-4 h-4" />
              Manage Team
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
      <div className="flex flex-wrap gap-x-4 gap-y-2 border-b border-moodkin-light-gray/50 mb-6 pb-2">
        {tabs.map((tab) => {
          // Get unseen count for this tab (skip moodboards as it doesn't have tracking)
          const tabCountKey = tab.id === 'clients' ? 'client' : tab.id === 'conversation' ? 'conversations' : tab.id
          const unseenCount = tab.id !== 'moodboards' ? unseenCounts?.[projectId]?.[tabCountKey as keyof typeof unseenCounts[string]] : 0

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-1.5 text-sm font-medium transition-colors rounded-full inline-flex items-center gap-1.5 ${
                activeTab === tab.id
                  ? 'bg-moodkin-gold text-moodkin-dark'
                  : 'text-moodkin-gray hover:text-moodkin-dark hover:bg-moodkin-cream'
              }`}
            >
              {tab.icon === 'sparkles' && <Sparkles className="w-4 h-4" />}
              {tab.label}
              {unseenCount && unseenCount > 0 ? (
                <span className="bg-red-500 text-white text-xs font-bold rounded-full min-w-[18px] h-[18px] px-1 flex items-center justify-center ml-1">
                  {unseenCount > 99 ? '99+' : unseenCount}
                </span>
              ) : null}
            </button>
          )
        })}
      </div>

      {/* Content */}
      <div className="flex-1">
        {activeTab === 'clients' && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {/* AI Image Generator Card - only visible to project owner */}
            {projectOwner?.user_id === currentUserId && (
              ownerHasSubscription ? (
                <button
                  onClick={() => setShowAIImageGenerator(true)}
                  className="aspect-square bg-gradient-to-br from-moodkin-gold to-amber-600 rounded-2xl p-4 flex flex-col items-center justify-center relative overflow-hidden hover:from-amber-500 hover:to-amber-700 transition-all group"
                >
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.2),transparent_50%)]" />
                  <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                    <Sparkles className="w-8 h-8 text-white" />
                  </div>
                  <p className="font-bold text-moodkin-dark text-center text-sm">AI IMAGE</p>
                  <p className="font-bold text-moodkin-dark text-center text-sm">GENERATOR</p>
                </button>
              ) : (
                <button
                  onClick={() => setShowSubscribeDialog(true)}
                  className="aspect-square bg-gradient-to-br from-moodkin-gold to-amber-600 rounded-2xl p-4 flex flex-col items-center justify-center relative overflow-hidden hover:from-amber-500 hover:to-amber-700 transition-all group"
                >
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.2),transparent_50%)]" />
                  <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                    <Sparkles className="w-6 h-6 text-white" />
                  </div>
                  <p className="font-bold text-moodkin-dark text-center text-xs">AI IMAGE</p>
                  <p className="font-bold text-moodkin-dark text-center text-xs mb-2">GENERATOR</p>
                  <p className="text-[10px] text-moodkin-dark/70 text-center leading-tight">Premium feature</p>
                  <p className="text-[10px] text-moodkin-dark/70 text-center leading-tight">Subscribers only</p>
                </button>
              )
            )}

            {/* Client Assets - images uploaded by clients only */}
            {clientAssets.map((asset) => (
              <AssetCard
                key={asset.id}
                asset={asset}
                onDelete={handleDeleteAsset}
                currentUserId={currentUserId}
                onImageClick={(url) => openLightbox(url, clientTabImages)}
                canDelete={asset.uploaded_by_id === currentUserId || isCreative}
              />
            ))}

            {/* Add Asset Card - only visible to client users */}
            {isClient && (
              <label className="aspect-square bg-moodkin-cream/50 rounded-2xl border-2 border-dashed border-moodkin-light-gray flex flex-col items-center justify-center cursor-pointer hover:border-moodkin-gold hover:bg-moodkin-cream transition-colors">
                {isUploading ? (
                  <>
                    <Loader2 className="w-8 h-8 text-moodkin-gold mb-2 animate-spin" />
                    <p className="text-sm text-moodkin-gray font-medium">Uploading...</p>
                  </>
                ) : (
                  <>
                    <ImagePlus className="w-8 h-8 text-moodkin-gold mb-2" />
                    <p className="text-sm text-moodkin-gray font-medium">Add Image</p>
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
            )}
          </div>
        )}

        {activeTab === 'creative' && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {/* AI Image Generator Card - only visible to creative users */}
            {isCreative && ownerHasSubscription && (
              <button
                onClick={() => setShowAIImageGenerator(true)}
                className="aspect-square bg-gradient-to-br from-moodkin-gold to-amber-600 rounded-2xl p-4 flex flex-col items-center justify-center relative overflow-hidden hover:from-amber-500 hover:to-amber-700 transition-all group"
              >
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.2),transparent_50%)]" />
                <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                  <Sparkles className="w-8 h-8 text-white" />
                </div>
                <p className="font-bold text-moodkin-dark text-center text-sm">AI IMAGE</p>
                <p className="font-bold text-moodkin-dark text-center text-sm">GENERATOR</p>
              </button>
            )}

            {/* Upload Image button - only visible to creative users */}
            {isCreative && (
              <label className="aspect-square bg-moodkin-cream/50 rounded-2xl border-2 border-dashed border-moodkin-light-gray flex flex-col items-center justify-center cursor-pointer hover:border-moodkin-gold hover:bg-moodkin-cream transition-colors">
                {isUploading ? (
                  <Loader2 className="w-8 h-8 text-moodkin-gold animate-spin" />
                ) : (
                  <>
                    <ImagePlus className="w-8 h-8 text-moodkin-gold mb-2" />
                    <p className="text-sm text-moodkin-gray font-medium">Upload Image</p>
                  </>
                )}
                <input
                  type="file"
                  className="hidden"
                  ref={creativeFileInputRef}
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  multiple
                  onChange={(e) => handleFileSelect(e.target.files, true)}
                  disabled={isUploading}
                />
              </label>
            )}

            {/* Creative Assets - images uploaded by creatives OR marked as creative */}
            {creativeAssets.map((asset) => (
              <AssetCard
                key={asset.id}
                asset={asset}
                onDelete={handleRemoveFromCreative}
                currentUserId={currentUserId}
                onImageClick={(url) => openLightbox(url, creativeTabImages)}
                canDelete={asset.uploaded_by_id === currentUserId || isCreative}
              />
            ))}

            {/* Add from Uploads button - only visible to creative users */}
            {isCreative && (
              <button
                onClick={() => setShowCreativePicker(true)}
                className="aspect-square bg-moodkin-cream/50 rounded-2xl border-2 border-dashed border-moodkin-light-gray flex flex-col items-center justify-center cursor-pointer hover:border-moodkin-gold hover:bg-moodkin-cream transition-colors"
              >
                <Plus className="w-8 h-8 text-moodkin-gold mb-2" />
                <p className="text-sm text-moodkin-gray font-medium">Add from Client</p>
              </button>
            )}
          </div>
        )}

        {/* Creative Picker Dialog */}
        <AssetPickerDialog
          open={showCreativePicker}
          onClose={() => setShowCreativePicker(false)}
          assets={assets || []}
          onSelect={handleSelectForCreative}
          isLoading={isSelectingCreative}
        />

        {/* Moodboard Mode Selector */}
        <MoodboardModeSelector
          open={showMoodboardModeSelector}
          onClose={() => setShowMoodboardModeSelector(false)}
          onSelectMode={handleSelectMoodboardMode}
        />

        {/* Moodboard Creator Dialog (Automatic) */}
        <MoodboardCreatorDialog
          open={showMoodboardCreator}
          onClose={() => setShowMoodboardCreator(false)}
          onCreate={handleCreateMoodboard}
          rankedAssets={rankedAssets}
          isLoading={isCreatingMoodboard}
        />

        {/* Manual Moodboard Creator */}
        <ManualMoodboardCreator
          open={showManualMoodboardCreator}
          onClose={() => setShowManualMoodboardCreator(false)}
          onCreate={handleCreateManualMoodboard}
          assets={assets || []}
          isLoading={isCreatingMoodboard}
        />

        {/* AI Image Generator */}
        <AIImageGenerator
          open={showAIImageGenerator}
          onClose={() => setShowAIImageGenerator(false)}
          conversationId={projectId}
          onImageSaved={handleAIImageSaved}
        />

        {/* Subscribe Dialog */}
        <SubscribeDialog
          open={showSubscribeDialog}
          onClose={() => setShowSubscribeDialog(false)}
          onSubscribe={async () => {
            // Mock subscription - in production this would redirect to Stripe
            const response = await fetch('/api/user/subscription', {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ subscribed: true }),
            })
            if (response.ok) {
              // Refresh the page to get updated subscription status
              window.location.reload()
            }
          }}
        />

        {/* Custom Size Export Dialog */}
        <Dialog open={showCustomSizeDialog} onClose={() => {
          setShowCustomSizeDialog(false)
          setCustomExportMoodboard(null)
        }}>
          <DialogHeader>
            <DialogTitle>Custom Export Size</DialogTitle>
          </DialogHeader>
          <div className="p-6 space-y-4">
            <p className="text-sm text-moodkin-gray">
              Enter your desired dimensions in pixels:
            </p>
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-moodkin-dark mb-1">Width (px)</label>
                <input
                  type="number"
                  value={customWidth}
                  onChange={(e) => setCustomWidth(e.target.value)}
                  min="100"
                  max="8000"
                  className="w-full px-4 py-2 rounded-xl border border-moodkin-light-gray focus:outline-none focus:border-moodkin-gold"
                />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-moodkin-dark mb-1">Height (px)</label>
                <input
                  type="number"
                  value={customHeight}
                  onChange={(e) => setCustomHeight(e.target.value)}
                  min="100"
                  max="8000"
                  className="w-full px-4 py-2 rounded-xl border border-moodkin-light-gray focus:outline-none focus:border-moodkin-gold"
                />
              </div>
            </div>
            <div className="flex gap-2 text-xs text-moodkin-gray">
              <button
                type="button"
                onClick={() => { setCustomWidth('1920'); setCustomHeight('1080') }}
                className="px-2 py-1 rounded-lg bg-moodkin-cream hover:bg-moodkin-light-gray transition-colors"
              >
                1920×1080
              </button>
              <button
                type="button"
                onClick={() => { setCustomWidth('2560'); setCustomHeight('1440') }}
                className="px-2 py-1 rounded-lg bg-moodkin-cream hover:bg-moodkin-light-gray transition-colors"
              >
                2560×1440
              </button>
              <button
                type="button"
                onClick={() => { setCustomWidth('3840'); setCustomHeight('2160') }}
                className="px-2 py-1 rounded-lg bg-moodkin-cream hover:bg-moodkin-light-gray transition-colors"
              >
                4K
              </button>
              <button
                type="button"
                onClick={() => { setCustomWidth('1200'); setCustomHeight('1200') }}
                className="px-2 py-1 rounded-lg bg-moodkin-cream hover:bg-moodkin-light-gray transition-colors"
              >
                Square
              </button>
            </div>
            <div className="flex gap-3 pt-2">
              <Button
                onClick={() => {
                  setShowCustomSizeDialog(false)
                  setCustomExportMoodboard(null)
                }}
                className="flex-1 bg-moodkin-cream hover:bg-moodkin-light-gray text-moodkin-dark font-semibold rounded-xl py-2"
              >
                Cancel
              </Button>
              <Button
                onClick={handleCustomExport}
                disabled={isExporting || !customWidth || !customHeight}
                className="flex-1 bg-moodkin-gold hover:bg-moodkin-gold-hover text-moodkin-dark font-semibold rounded-xl py-2"
              >
                {isExporting ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Download className="w-4 h-4 mr-2" />
                )}
                Export PNG
              </Button>
            </div>
          </div>
        </Dialog>

        {/* Export Format Dialog */}
        <Dialog open={showExportDialog} onClose={() => {
          setShowExportDialog(false)
          setExportMoodboard(null)
        }}>
          <DialogHeader>
            <DialogTitle>Export Moodboard</DialogTitle>
          </DialogHeader>
          <div className="p-6 space-y-3">
            <p className="text-sm text-moodkin-gray mb-4">
              Choose an export format:
            </p>
            {exportFormats.map((format) => (
              <button
                key={format.id}
                type="button"
                disabled={isExporting}
                onClick={() => {
                  if (format.id === 'custom') {
                    setShowExportDialog(false)
                    setCustomExportMoodboard(exportMoodboard)
                    setShowCustomSizeDialog(true)
                  } else if (exportMoodboard) {
                    handleExport(exportMoodboard, format.id)
                    setShowExportDialog(false)
                    setExportMoodboard(null)
                  }
                }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-moodkin-light-gray hover:border-moodkin-gold hover:bg-moodkin-cream transition-colors text-left"
              >
                <span className="text-xl">{format.icon}</span>
                <span className="flex-1 font-medium text-moodkin-dark">{format.label}</span>
                {format.id !== 'custom' && (
                  <span className="text-sm text-moodkin-gray">
                    {format.width}×{format.height}
                  </span>
                )}
              </button>
            ))}
          </div>
        </Dialog>

        {activeTab === 'links' && (
          <div className="space-y-6">
            {/* Add Link Form */}
            <form onSubmit={handleAddLink} className="bg-white rounded-2xl p-4 shadow-sm">
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  placeholder="Paste URL (e.g. google.com, pinterest.com/...)"
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
            {/* Header with Create Button and Help */}
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-moodkin-dark">Your Moodboards</h2>
              <div className="flex items-center gap-2">
                <Button
                  onClick={handleOpenMoodboardCreator}
                  disabled={isCreatingMoodboard}
                  className="bg-moodkin-gold hover:bg-moodkin-gold-hover text-moodkin-dark font-semibold rounded-xl"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create Moodboard
                </Button>
                <button
                  onClick={() => setShowMoodboardHelp(true)}
                  className="p-2 text-moodkin-gray hover:text-moodkin-dark hover:bg-moodkin-cream rounded-xl transition-colors"
                  title="How moodboards work"
                >
                  <HelpCircle className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Moodboards Grid */}
            {moodboardsLoading ? (
              <div className="text-center py-8 text-moodkin-gray">
                <Loader2 className="w-8 h-8 mx-auto mb-3 animate-spin text-moodkin-gold" />
                <p>Loading moodboards...</p>
              </div>
            ) : moodboards && moodboards.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {moodboards.map((moodboard) => {
                  // Filter out flagged images and assets without valid image URLs
                  // For links, we need thumbnail_url; for images, we need url
                  const displayImages = moodboard.images.filter(img => {
                    if (img.score < 0 || !img.asset) return false
                    if (img.asset.asset_type === 'link') return !!img.asset.thumbnail_url
                    return !!img.asset.url
                  })
                  const bgColor = moodboard.background_color || '#1A1A1A'
                  const borderColor = moodboard.border_color || '#FFFFFF'
                  const borderRadius = moodboard.border_radius ?? 12
                  const borderWidth = moodboard.border_width ?? 0
                  const spacingPx = moodboard.spacing ?? 8
                  const gridLayout = moodboard.grid_layout || '2x2'

                  const imageStyle = {
                    borderRadius: `${borderRadius}px`,
                    border: borderWidth > 0 ? `${borderWidth}px solid ${borderColor}` : undefined,
                  }

                  // Helper to get image URL
                  const getImgUrl = (img: typeof displayImages[0]) =>
                    img.asset.asset_type === 'link' ? img.asset.thumbnail_url : img.asset.url

                  // Render image button
                  const renderImage = (img: typeof displayImages[0], extraClass = '') => {
                    const imgUrl = getImgUrl(img)
                    if (!imgUrl) return null
                    return (
                      <button
                        key={img.id}
                        onClick={() => setLightboxImage(imgUrl)}
                        className={`relative cursor-pointer hover:opacity-90 transition-opacity overflow-hidden ${extraClass}`}
                        style={imageStyle}
                      >
                        <Image src={imgUrl} alt="" fill className="object-cover" />
                      </button>
                    )
                  }

                  // Render layout based on grid_layout
                  const renderMoodboardLayout = () => {
                    // Single image
                    if (gridLayout === '1' || displayImages.length === 1) {
                      return displayImages[0] ? renderImage(displayImages[0], 'w-full h-full') : null
                    }

                    // 2 images layouts
                    if (gridLayout === '2h') {
                      return (
                        <div className="w-full h-full grid grid-cols-2" style={{ gap: `${spacingPx}px` }}>
                          {displayImages.slice(0, 2).map(img => renderImage(img))}
                        </div>
                      )
                    }
                    if (gridLayout === '2v') {
                      return (
                        <div className="w-full h-full grid grid-rows-2" style={{ gap: `${spacingPx}px` }}>
                          {displayImages.slice(0, 2).map(img => renderImage(img))}
                        </div>
                      )
                    }
                    if (gridLayout === '2-big-left') {
                      return (
                        <div className="w-full h-full grid grid-cols-3" style={{ gap: `${spacingPx}px` }}>
                          <div className="col-span-2 relative overflow-hidden" style={imageStyle}>
                            {displayImages[0] && <Image src={getImgUrl(displayImages[0])!} alt="" fill className="object-cover" onClick={() => setLightboxImage(getImgUrl(displayImages[0])!)} />}
                          </div>
                          {displayImages[1] && renderImage(displayImages[1])}
                        </div>
                      )
                    }
                    if (gridLayout === '2-big-right') {
                      return (
                        <div className="w-full h-full grid grid-cols-3" style={{ gap: `${spacingPx}px` }}>
                          {displayImages[0] && renderImage(displayImages[0])}
                          <div className="col-span-2 relative overflow-hidden" style={imageStyle}>
                            {displayImages[1] && <Image src={getImgUrl(displayImages[1])!} alt="" fill className="object-cover" onClick={() => setLightboxImage(getImgUrl(displayImages[1])!)} />}
                          </div>
                        </div>
                      )
                    }

                    // 3 images layouts (also handle 'auto' with 3 images)
                    if (gridLayout === '3-top' || (gridLayout === 'auto' && displayImages.length === 3)) {
                      return (
                        <div className="w-full h-full grid grid-rows-5" style={{ gap: `${spacingPx}px` }}>
                          <div className="row-span-3 relative overflow-hidden" style={imageStyle}>
                            {displayImages[0] && <Image src={getImgUrl(displayImages[0])!} alt="" fill className="object-cover" onClick={() => setLightboxImage(getImgUrl(displayImages[0])!)} />}
                          </div>
                          <div className="row-span-2 grid grid-cols-2" style={{ gap: `${spacingPx}px` }}>
                            {displayImages.slice(1, 3).map(img => renderImage(img))}
                          </div>
                        </div>
                      )
                    }
                    if (gridLayout === '3-bottom') {
                      return (
                        <div className="w-full h-full grid grid-rows-2" style={{ gap: `${spacingPx}px` }}>
                          <div className="grid grid-cols-2" style={{ gap: `${spacingPx}px` }}>
                            {displayImages.slice(0, 2).map(img => renderImage(img))}
                          </div>
                          {displayImages[2] && renderImage(displayImages[2])}
                        </div>
                      )
                    }
                    if (gridLayout === '3-left') {
                      return (
                        <div className="w-full h-full grid grid-cols-2" style={{ gap: `${spacingPx}px` }}>
                          {displayImages[0] && renderImage(displayImages[0])}
                          <div className="grid grid-rows-2" style={{ gap: `${spacingPx}px` }}>
                            {displayImages.slice(1, 3).map(img => renderImage(img))}
                          </div>
                        </div>
                      )
                    }
                    if (gridLayout === '3-right') {
                      return (
                        <div className="w-full h-full grid grid-cols-2" style={{ gap: `${spacingPx}px` }}>
                          <div className="grid grid-rows-2" style={{ gap: `${spacingPx}px` }}>
                            {displayImages.slice(0, 2).map(img => renderImage(img))}
                          </div>
                          {displayImages[2] && renderImage(displayImages[2])}
                        </div>
                      )
                    }
                    if (gridLayout === '3-row') {
                      return (
                        <div className="w-full h-full grid grid-cols-3" style={{ gap: `${spacingPx}px` }}>
                          {displayImages.slice(0, 3).map(img => renderImage(img))}
                        </div>
                      )
                    }
                    if (gridLayout === '3-col') {
                      return (
                        <div className="w-full h-full grid grid-rows-3" style={{ gap: `${spacingPx}px` }}>
                          {displayImages.slice(0, 3).map(img => renderImage(img))}
                        </div>
                      )
                    }

                    // 4 images layouts
                    if (gridLayout === '2x2') {
                      return (
                        <div className="w-full h-full grid grid-cols-2 grid-rows-2" style={{ gap: `${spacingPx}px` }}>
                          {displayImages.slice(0, 4).map(img => renderImage(img))}
                        </div>
                      )
                    }
                    if (gridLayout === '4-top') {
                      return (
                        <div className="w-full h-full grid grid-rows-3" style={{ gap: `${spacingPx}px` }}>
                          <div className="row-span-2 relative overflow-hidden cursor-pointer hover:opacity-90" style={imageStyle} onClick={() => displayImages[0] && setLightboxImage(getImgUrl(displayImages[0])!)}>
                            {displayImages[0] && <Image src={getImgUrl(displayImages[0])!} alt="" fill className="object-cover" />}
                          </div>
                          <div className="grid grid-cols-3" style={{ gap: `${spacingPx}px` }}>
                            {displayImages.slice(1, 4).map(img => renderImage(img))}
                          </div>
                        </div>
                      )
                    }
                    if (gridLayout === '4-left') {
                      return (
                        <div className="w-full h-full grid grid-cols-2" style={{ gap: `${spacingPx}px` }}>
                          {displayImages[0] && renderImage(displayImages[0])}
                          <div className="grid grid-rows-3" style={{ gap: `${spacingPx}px` }}>
                            {displayImages.slice(1, 4).map(img => renderImage(img))}
                          </div>
                        </div>
                      )
                    }
                    if (gridLayout === '4-row') {
                      return (
                        <div className="w-full h-full grid grid-cols-4" style={{ gap: `${spacingPx}px` }}>
                          {displayImages.slice(0, 4).map(img => renderImage(img))}
                        </div>
                      )
                    }
                    if (gridLayout === '4-col') {
                      return (
                        <div className="w-full h-full grid grid-rows-4" style={{ gap: `${spacingPx}px` }}>
                          {displayImages.slice(0, 4).map(img => renderImage(img))}
                        </div>
                      )
                    }
                    if (gridLayout === '4-diagonal') {
                      return (
                        <div className="w-full h-full grid grid-cols-3 grid-rows-3" style={{ gap: `${spacingPx}px` }}>
                          <div className="col-span-2 row-span-2 relative overflow-hidden cursor-pointer hover:opacity-90" style={imageStyle} onClick={() => displayImages[0] && setLightboxImage(getImgUrl(displayImages[0])!)}>
                            {displayImages[0] && <Image src={getImgUrl(displayImages[0])!} alt="" fill className="object-cover" />}
                          </div>
                          {displayImages[1] && renderImage(displayImages[1])}
                          {displayImages[2] && renderImage(displayImages[2])}
                          <div className="col-span-2 relative overflow-hidden cursor-pointer hover:opacity-90" style={imageStyle} onClick={() => displayImages[3] && setLightboxImage(getImgUrl(displayImages[3])!)}>
                            {displayImages[3] && <Image src={getImgUrl(displayImages[3])!} alt="" fill className="object-cover" />}
                          </div>
                        </div>
                      )
                    }

                    // 5 images layouts
                    if (gridLayout === '5-top2') {
                      return (
                        <div className="w-full h-full grid grid-rows-2" style={{ gap: `${spacingPx}px` }}>
                          <div className="grid grid-cols-2" style={{ gap: `${spacingPx}px` }}>
                            {displayImages.slice(0, 2).map(img => renderImage(img))}
                          </div>
                          <div className="grid grid-cols-3" style={{ gap: `${spacingPx}px` }}>
                            {displayImages.slice(2, 5).map(img => renderImage(img))}
                          </div>
                        </div>
                      )
                    }
                    if (gridLayout === '5-top3') {
                      return (
                        <div className="w-full h-full grid grid-rows-2" style={{ gap: `${spacingPx}px` }}>
                          <div className="grid grid-cols-3" style={{ gap: `${spacingPx}px` }}>
                            {displayImages.slice(0, 3).map(img => renderImage(img))}
                          </div>
                          <div className="grid grid-cols-2" style={{ gap: `${spacingPx}px` }}>
                            {displayImages.slice(3, 5).map(img => renderImage(img))}
                          </div>
                        </div>
                      )
                    }
                    if (gridLayout === '5-big') {
                      return (
                        <div className="w-full h-full grid grid-cols-3 grid-rows-2" style={{ gap: `${spacingPx}px` }}>
                          <div className="col-span-2 row-span-2 relative overflow-hidden cursor-pointer hover:opacity-90" style={imageStyle} onClick={() => displayImages[0] && setLightboxImage(getImgUrl(displayImages[0])!)}>
                            {displayImages[0] && <Image src={getImgUrl(displayImages[0])!} alt="" fill className="object-cover" />}
                          </div>
                          {displayImages.slice(1, 5).map(img => renderImage(img))}
                        </div>
                      )
                    }

                    // 6+ images layouts
                    if (gridLayout === '3x2') {
                      return (
                        <div className="w-full h-full grid grid-cols-3 grid-rows-2" style={{ gap: `${spacingPx}px` }}>
                          {displayImages.slice(0, 6).map(img => renderImage(img))}
                        </div>
                      )
                    }
                    if (gridLayout === '2x3') {
                      return (
                        <div className="w-full h-full grid grid-cols-2 grid-rows-3" style={{ gap: `${spacingPx}px` }}>
                          {displayImages.slice(0, 6).map(img => renderImage(img))}
                        </div>
                      )
                    }
                    if (gridLayout === '6-big') {
                      return (
                        <div className="w-full h-full grid grid-cols-3 grid-rows-3" style={{ gap: `${spacingPx}px` }}>
                          <div className="col-span-2 row-span-2 relative overflow-hidden cursor-pointer hover:opacity-90" style={imageStyle} onClick={() => displayImages[0] && setLightboxImage(getImgUrl(displayImages[0])!)}>
                            {displayImages[0] && <Image src={getImgUrl(displayImages[0])!} alt="" fill className="object-cover" />}
                          </div>
                          {displayImages.slice(1, 6).map(img => renderImage(img))}
                        </div>
                      )
                    }

                    // Manual grid layout (format: "manual-{rows}x{cols}")
                    if (gridLayout.startsWith('manual-')) {
                      const match = gridLayout.match(/manual-(\d+)x(\d+)/)
                      if (match) {
                        const rows = parseInt(match[1], 10)
                        const cols = parseInt(match[2], 10)
                        return (
                          <div
                            className="w-full h-full grid"
                            style={{
                              gridTemplateRows: `repeat(${rows}, 1fr)`,
                              gridTemplateColumns: `repeat(${cols}, 1fr)`,
                              gap: `${spacingPx}px`,
                            }}
                          >
                            {displayImages.map(img => renderImage(img))}
                          </div>
                        )
                      }
                    }

                    // Default: tiered layout for automatic moodboards or unknown layouts
                    const topImages = displayImages.slice(0, 2)
                    const midImages = displayImages.slice(2, 5)
                    const bottomImages = displayImages.slice(5, 9)
                    return (
                      <>
                        {/* Top row - largest images (most liked) */}
                        {topImages.length > 0 && (
                          <div className="flex-[3] flex" style={{ gap: `${spacingPx}px` }}>
                            {topImages.map(img => renderImage(img, 'flex-1'))}
                          </div>
                        )}
                        {/* Middle row - medium images */}
                        {midImages.length > 0 && (
                          <div className="flex-[2] flex" style={{ gap: `${spacingPx}px` }}>
                            {midImages.map(img => renderImage(img, 'flex-1'))}
                          </div>
                        )}
                        {/* Bottom row - smaller images */}
                        {bottomImages.length > 0 && (
                          <div className="flex-1 flex" style={{ gap: `${spacingPx}px` }}>
                            {bottomImages.map(img => renderImage(img, 'flex-1'))}
                            {displayImages.length > 9 && (
                              <div className="flex-1 flex items-center justify-center" style={{ ...imageStyle, backgroundColor: 'rgba(212, 175, 55, 0.2)' }}>
                                <span className="text-moodkin-dark font-bold text-sm">
                                  +{displayImages.length - 9}
                                </span>
                              </div>
                            )}
                          </div>
                        )}
                      </>
                    )
                  }

                  // Determine aspect ratio class
                  const aspectRatioClass = moodboard.aspect_ratio === 'portrait'
                    ? 'aspect-[3/4]'
                    : moodboard.aspect_ratio === 'landscape'
                      ? 'aspect-[4/3]'
                      : 'aspect-square'

                  return (
                  <div
                    key={moodboard.id}
                    className="bg-white rounded-2xl shadow-sm overflow-hidden"
                  >
                    {/* Moodboard Preview - Layout Based on grid_layout */}
                    <div
                      className={`flex flex-col ${aspectRatioClass}`}
                      style={{
                        backgroundColor: bgColor,
                        gap: `${spacingPx}px`,
                        padding: `${spacingPx}px`,
                      }}
                    >
                      {renderMoodboardLayout()}
                    </div>

                    {/* Moodboard Info */}
                    <div className="p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-bold text-moodkin-dark text-lg">{moodboard.title}</h3>
                          {moodboard.description && (
                            <p className="text-sm text-moodkin-gray mt-1">{moodboard.description}</p>
                          )}
                        </div>
                        {/* Delete button - only show for creators or creatives */}
                        {(moodboard.created_by_id === currentUserId || isCreative) && (
                          <button
                            onClick={() => {
                              if (confirm('Delete this moodboard?')) {
                                deleteMoodboard.mutate(moodboard.id)
                              }
                            }}
                            className="p-2 text-moodkin-gray hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete moodboard"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                      <div className="flex items-center justify-between mt-4">
                        <p className="text-xs text-moodkin-gray">
                          {displayImages.length} images • Created by {moodboard.created_by_name}
                        </p>
                        <button
                          type="button"
                          disabled={isExporting}
                          onClick={() => {
                            setExportMoodboard(moodboard)
                            setShowExportDialog(true)
                          }}
                          className={`inline-flex items-center bg-moodkin-gold hover:bg-moodkin-gold-hover text-moodkin-dark font-semibold rounded-xl px-4 py-2 text-sm cursor-pointer ${isExporting ? 'opacity-50' : ''}`}
                        >
                          {isExporting ? (
                            <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                          ) : (
                            <Download className="w-4 h-4 mr-1" />
                          )}
                          Export
                        </button>
                      </div>
                    </div>
                  </div>
                  )
                })}
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
              onSend={(text, imageUrl) => sendMessage.mutate({
                text_content: text || undefined,
                image_url: imageUrl,
              })}
              disabled={sendMessage.isPending}
            />
          </div>
        )}
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

      {/* Edit Project Dialog */}
      <EditProjectDialog
        open={showEditDialog}
        onClose={() => setShowEditDialog(false)}
        project={project}
        onSubmit={(data) => {
          updateProject.mutate(data, {
            onSuccess: () => setShowEditDialog(false),
          })
        }}
        isLoading={updateProject.isPending}
      />

      {/* Invite User Dialog */}
      <InviteUserDialog
        open={showInviteDialog}
        onClose={() => setShowInviteDialog(false)}
        projectId={projectId}
        projectTitle={project.title}
      />

      {/* Image Lightbox */}
      {lightboxImage && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
          onClick={() => setLightboxImage(null)}
        >
          {/* Close button */}
          <button
            onClick={() => setLightboxImage(null)}
            className="absolute top-4 right-4 p-2 text-white hover:bg-white/10 rounded-full transition-colors z-10"
          >
            <X className="w-8 h-8" />
          </button>

          {/* Image counter */}
          {lightboxImages.length > 1 && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 text-white/70 text-sm font-medium z-10">
              {lightboxIndex + 1} / {lightboxImages.length}
            </div>
          )}

          {/* Previous arrow */}
          {lightboxImages.length > 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                goToPrevImage()
              }}
              className="absolute left-4 top-1/2 -translate-y-1/2 p-3 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-colors z-10"
            >
              <ChevronLeft className="w-10 h-10" />
            </button>
          )}

          {/* Next arrow */}
          {lightboxImages.length > 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                goToNextImage()
              }}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-3 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-colors z-10"
            >
              <ChevronRight className="w-10 h-10" />
            </button>
          )}

          {/* Image */}
          <div className="relative w-[90vw] h-[90vh]">
            <Image
              src={lightboxImage}
              alt=""
              fill
              className="object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}

    </div>
  )
}
