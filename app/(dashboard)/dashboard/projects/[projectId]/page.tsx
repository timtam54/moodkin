'use client'

import { useState, useRef, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { upload } from '@vercel/blob/client'
import { ChevronLeft, MoreHorizontal, Sparkles, ImagePlus, Trash2, Loader2, Link2, Plus, ExternalLink, Layout, Download, HelpCircle, Wand2, Heart, Flag, Brain, Lightbulb, Users, X, Bell, BellOff, Pencil } from 'lucide-react'
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
import { MessageList } from '@/components/conversation/message-list'
import { MessageInput } from '@/components/conversation/message-input'
import { usePushNotifications } from '@/hooks/use-push-notifications'
import { useProjectReactions } from '@/hooks/use-asset-interactions'
import Image from 'next/image'
import Link from 'next/link'
import { Loading } from '@/components/ui/loading'

const tabs = [
  { id: 'uploads', label: 'Client' },
  { id: 'creative', label: 'Creative' },

  { id: 'links', label: 'Links' },
  { id: 'moodboards', label: 'Moodboards' },
  { id: 'conversation', label: 'Conversation' },
]

export default function ProjectDetailPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const router = useRouter()
  const { session } = useSession()
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
  const [activeTab, setActiveTab] = useState('uploads')
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
  const [showCreativePicker, setShowCreativePicker] = useState(false)
  const [isSelectingCreative, setIsSelectingCreative] = useState(false)
  const [showMoodboardCreator, setShowMoodboardCreator] = useState(false)
  const [showMoodboardModeSelector, setShowMoodboardModeSelector] = useState(false)
  const [showManualMoodboardCreator, setShowManualMoodboardCreator] = useState(false)
  const [showAIImageGenerator, setShowAIImageGenerator] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { data: projectUsers } = useProjectUsers(projectId)
  const { data: messages } = useMessages(projectId)
  const sendMessage = useSendMessage(projectId)
  const { isSupported: pushSupported, isSubscribed: pushSubscribed, subscribe: pushSubscribe, unsubscribe: pushUnsubscribe } = usePushNotifications()
  const { data: allReactions } = useProjectReactions(projectId)

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

    // Filter out heavily flagged images and sort by score (highest first)
    return scored
      .filter(a => a.score >= -2) // Exclude images with too many flags
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
      alert(error instanceof Error ? error.message : 'Failed to delete asset')
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
    setActiveTab('uploads')
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
    const usableHeight = pageHeight - margin * 2 - 30 // Leave space for title

    // Add background color
    const bgColor = moodboard.background_color || '#1A1A1A'
    const hexToRgb = (hex: string) => {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
      return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
      } : { r: 26, g: 26, b: 26 }
    }
    const bg = hexToRgb(bgColor)

    // Reset any default stroke settings
    pdf.setDrawColor(bg.r, bg.g, bg.b)
    pdf.setLineWidth(0)

    pdf.setFillColor(bg.r, bg.g, bg.b)
    pdf.rect(0, 0, pageWidth, pageHeight, 'F')

    // Add title
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
    const spacingPx = moodboard.spacing ?? 8
    const spacing = spacingPx * 0.264583 // Convert px to mm
    const gridLayout = moodboard.grid_layout || '2x2'
    const borderEnabled = moodboard.border_enabled ?? false
    const borderWidth = moodboard.border_width ?? 0
    const borderWidthMm = borderWidth * 0.264583 // Convert px to mm
    const borderColor = moodboard.border_color || '#FFFFFF'
    const borderRadius = moodboard.border_radius ?? 12
    const borderRadiusMm = borderRadius * 0.264583 // Convert px to mm

    // Filter valid images
    const validImages = moodboard.images.filter(img => {
      if (img.score < 0 || !img.asset) return false
      if (img.asset.asset_type === 'link') return !!img.asset.thumbnail_url
      return !!img.asset.url
    })

    // Helper to get image URL
    const getImgUrl = (img: typeof validImages[0]) =>
      img.asset.asset_type === 'link' ? img.asset.thumbnail_url : img.asset.url

    // Helper to load image as base64 and get dimensions
    const loadImage = async (url: string, isExternal: boolean): Promise<{ base64: string; width: number; height: number } | null> => {
      try {
        // For external URLs (like link thumbnails), use the proxy to avoid CORS
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

        // Get image dimensions
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

    // Define layout positions based on grid_layout
    type ImageRect = { x: number; y: number; w: number; h: number }
    const getLayoutRects = (layout: string, images: typeof validImages): ImageRect[] => {
      const count = images.length
      const w = usableWidth
      const h = usableHeight
      const x = margin
      const y = startY
      const s = spacing

      // Single image
      if (layout === '1' || count === 1) {
        return [{ x, y, w, h }]
      }

      // 2 images
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

      // 3 images (also handle 'auto' with 3 images)
      if (layout === '3-top' || (layout === 'auto' && count === 3)) {
        const topH = (h - s) * 0.6  // 60% for top image
        const bottomH = h - s - topH  // 40% for bottom row
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

      // 4 images
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

      // 5 images
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
        const smallH = (h - s) / 2
        return [
          { x, y, w: bigW, h },
          { x: x + bigW + s, y, w: smallW, h: smallH },
          { x: x + bigW + s, y: y + smallH + s, w: smallW, h: smallH },
          { x, y: y + h + s, w: smallW, h: smallH }, // These would overflow - adjust
          { x: x + smallW + s, y: y + h + s, w: smallW, h: smallH }
        ].slice(0, 5).map((rect, i) => {
          // Recalculate for 5-big
          if (i === 0) return { x, y, w: bigW, h }
          const idx = i - 1
          const col = idx % 2
          const row = Math.floor(idx / 2)
          const cellW = smallW
          const cellH = (h - s) / 2
          return {
            x: x + bigW + s,
            y: y + row * (cellH + s),
            w: cellW,
            h: cellH
          }
        })
      }

      // 6 images
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

      // Default: tiered layout
      const topCount = Math.min(2, count)
      const midCount = Math.min(3, count - topCount)
      const bottomCount = Math.min(4, count - topCount - midCount)
      const rects: ImageRect[] = []

      const topH = h * 0.45
      const midH = midCount > 0 ? h * 0.35 : 0
      const bottomH = bottomCount > 0 ? h - topH - midH - s * 2 : 0

      // Top row
      const topCellW = (w - s * (topCount - 1)) / topCount
      for (let i = 0; i < topCount; i++) {
        rects.push({ x: x + i * (topCellW + s), y, w: topCellW, h: topH })
      }

      // Middle row
      if (midCount > 0) {
        const midCellW = (w - s * (midCount - 1)) / midCount
        for (let i = 0; i < midCount; i++) {
          rects.push({ x: x + i * (midCellW + s), y: y + topH + s, w: midCellW, h: midH })
        }
      }

      // Bottom row
      if (bottomCount > 0) {
        const bottomCellW = (w - s * (bottomCount - 1)) / bottomCount
        for (let i = 0; i < bottomCount; i++) {
          rects.push({ x: x + i * (bottomCellW + s), y: y + topH + midH + s * 2, w: bottomCellW, h: bottomH })
        }
      }

      return rects
    }

    const layoutRects = getLayoutRects(gridLayout, validImages)

    // Load and add images
    for (let i = 0; i < Math.min(validImages.length, layoutRects.length); i++) {
      const img = validImages[i]
      const rect = layoutRects[i]
      const url = getImgUrl(img)
      const isExternal = img.asset.asset_type === 'link'

      if (!url) continue

      const imageData = await loadImage(url, isExternal)
      if (imageData) {
        // Calculate dimensions to maintain aspect ratio (cover style - fill rect, crop overflow)
        const imgRatio = imageData.width / imageData.height
        const rectRatio = rect.w / rect.h

        let drawW: number, drawH: number, drawX: number, drawY: number

        if (imgRatio > rectRatio) {
          // Image is wider than rect - fit height, crop sides
          drawH = rect.h
          drawW = rect.h * imgRatio
          drawX = rect.x - (drawW - rect.w) / 2
          drawY = rect.y
        } else {
          // Image is taller than rect - fit width, crop top/bottom
          drawW = rect.w
          drawH = rect.w / imgRatio
          drawX = rect.x
          drawY = rect.y - (drawH - rect.h) / 2
        }

        // Use jsPDF context2d for proper clipping without border artifacts
        const ctx = pdf.context2d
        ctx.save()
        ctx.beginPath()
        ctx.rect(rect.x, rect.y, rect.w, rect.h)
        ctx.clip()
        pdf.addImage(imageData.base64, 'JPEG', drawX, drawY, drawW, drawH)
        ctx.restore()

        // Draw border if enabled
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
        // Draw placeholder
        pdf.setFillColor(240, 240, 240)
        pdf.rect(rect.x, rect.y, rect.w, rect.h, 'F')
      }
    }

    // Add footer
    pdf.setFontSize(8)
    pdf.setTextColor(titleColor === 255 ? 120 : 180, titleColor === 255 ? 120 : 180, titleColor === 255 ? 120 : 180)
    pdf.text(`Created with Moodkin • ${new Date().toLocaleDateString()}`, pageWidth / 2, pageHeight - 5, { align: 'center' })

    // Download
    pdf.save(`${moodboard.title.replace(/[^a-z0-9]/gi, '_')}_moodboard.pdf`)
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
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-3 py-1.5 text-sm font-medium transition-colors rounded-full ${
              activeTab === tab.id
                ? 'bg-moodkin-gold text-moodkin-dark'
                : 'text-moodkin-gray hover:text-moodkin-dark hover:bg-moodkin-cream'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1">
        {activeTab === 'uploads' && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {/* AI Image Generator Card */}
            <button
              onClick={() => setShowAIImageGenerator(true)}
              className="aspect-square bg-gradient-to-br from-violet-500 to-purple-600 rounded-2xl p-4 flex flex-col items-center justify-center relative overflow-hidden hover:from-violet-600 hover:to-purple-700 transition-all group"
            >
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.2),transparent_50%)]" />
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <Sparkles className="w-8 h-8 text-white" />
              </div>
              <p className="font-bold text-white text-center text-sm">AI IMAGE</p>
              <p className="font-bold text-white text-center text-sm">GENERATOR</p>
            </button>

            {/* Real Asset Cards (images only) */}
            {assets?.filter(a => a.asset_type !== 'link').map((asset) => (
              <AssetCard
                key={asset.id}
                asset={asset}
                onDelete={handleDeleteAsset}
                currentUserId={currentUserId}
                onImageClick={setLightboxImage}
                canDelete={asset.uploaded_by_id === currentUserId || isCreative}
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
            {/* Creative Assets - images where creative = true */}
            {assets?.filter(a => a.creative && a.asset_type !== 'link').map((asset) => (
              <AssetCard
                key={asset.id}
                asset={asset}
                onDelete={handleDeleteAsset}
                currentUserId={currentUserId}
                onImageClick={setLightboxImage}
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
                <p className="text-sm text-moodkin-gray font-medium">Add from Uploads</p>
              </button>
            )}
          </div>
        )}

        {activeTab === 'client' && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {/* Client Assets - images uploaded by client users */}
            {assets?.filter(a => userRoleMap.get(a.uploaded_by_id) === 'client' && a.asset_type !== 'link').map((asset) => (
              <AssetCard
                key={asset.id}
                asset={asset}
                onDelete={handleDeleteAsset}
                currentUserId={currentUserId}
                onImageClick={setLightboxImage}
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
                    <p className="text-sm text-moodkin-gray font-medium">Add Client</p>
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

                  return (
                  <div
                    key={moodboard.id}
                    className="bg-white rounded-2xl shadow-sm overflow-hidden"
                  >
                    {/* Moodboard Preview - Layout Based on grid_layout */}
                    <div
                      className="flex flex-col aspect-square"
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
          <button
            onClick={() => setLightboxImage(null)}
            className="absolute top-4 right-4 p-2 text-white hover:bg-white/10 rounded-full transition-colors"
          >
            <X className="w-8 h-8" />
          </button>
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
