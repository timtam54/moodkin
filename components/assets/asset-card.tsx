'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Heart, Flag, MessageCircle, X, Send, Loader2 } from 'lucide-react'
import { useAssetReactions, useAddReaction, useRemoveReaction, useAssetComments, useAddComment } from '@/hooks/use-asset-interactions'
import type { ProjectAsset } from '@/types/database'

interface AssetCardProps {
  asset: ProjectAsset
  onDelete: (id: string) => void
  currentUserId: string
  onImageClick?: (url: string) => void
}

export function AssetCard({ asset, onDelete, currentUserId, onImageClick }: AssetCardProps) {
  const [showComments, setShowComments] = useState(false)
  const [newComment, setNewComment] = useState('')

  const { data: reactions = [] } = useAssetReactions(asset.id)
  const { data: comments = [] } = useAssetComments(asset.id)
  const addReaction = useAddReaction(asset.id)
  const removeReaction = useRemoveReaction(asset.id)
  const addComment = useAddComment(asset.id)

  const likes = reactions.filter(r => r.reaction_type === 'like')
  const flags = reactions.filter(r => r.reaction_type === 'redflag')

  const userLiked = likes.some(r => r.user_id === currentUserId)
  const userFlagged = flags.some(r => r.user_id === currentUserId)

  const handleLike = async () => {
    if (userLiked) {
      await removeReaction.mutateAsync('like')
    } else {
      await addReaction.mutateAsync('like')
    }
  }

  const handleFlag = async () => {
    if (userFlagged) {
      await removeReaction.mutateAsync('redflag')
    } else {
      await addReaction.mutateAsync('redflag')
    }
  }

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newComment.trim()) return
    await addComment.mutateAsync(newComment)
    setNewComment('')
  }

  return (
    <div className="relative">
      {/* Image */}
      <div
        className={`aspect-square relative rounded-2xl overflow-hidden group ${onImageClick ? 'cursor-pointer' : ''}`}
        onClick={() => onImageClick?.(asset.url)}
      >
        <Image
          src={asset.url}
          alt={asset.filename}
          fill
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />

        {/* Delete button */}
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(asset.id) }}
          className="absolute top-2 right-2 p-2 bg-red-500 hover:bg-red-600 rounded-full transition-colors shadow-lg z-10"
        >
          <X className="w-4 h-4 text-white" />
        </button>

        {/* Color Palette */}
        {asset.color_palette && asset.color_palette.length > 0 && (
          <div className="absolute top-2 left-2 flex gap-0.5">
            {asset.color_palette.slice(0, 5).map((color, idx) => (
              <div
                key={idx}
                className="w-4 h-4 rounded-full border border-white/30 shadow-sm"
                style={{ backgroundColor: color }}
                title={color}
              />
            ))}
          </div>
        )}

        {/* Bottom info */}
        <div className="absolute bottom-0 left-0 right-0 p-3">
          <p className="text-white text-sm font-medium truncate">
            {asset.filename}
          </p>
          <p className="text-white/70 text-xs truncate">
            by {asset.uploaded_by_name || 'Unknown'}
          </p>

          {/* Interaction buttons */}
          <div className="flex items-center gap-3 mt-2" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={handleLike}
              disabled={addReaction.isPending || removeReaction.isPending}
              className={`flex items-center gap-1 text-xs transition-colors ${
                userLiked ? 'text-pink-400' : 'text-white/80 hover:text-pink-400'
              }`}
            >
              <Heart className={`w-4 h-4 ${userLiked ? 'fill-current' : ''}`} />
              <span>{likes.length || ''}</span>
            </button>

            <button
              onClick={handleFlag}
              disabled={addReaction.isPending || removeReaction.isPending}
              className={`flex items-center gap-1 text-xs transition-colors ${
                userFlagged ? 'text-red-500' : 'text-white/80 hover:text-red-500'
              }`}
            >
              <Flag className={`w-4 h-4 ${userFlagged ? 'fill-current' : ''}`} />
              <span>{flags.length || ''}</span>
            </button>

            <button
              onClick={() => setShowComments(!showComments)}
              className={`flex items-center gap-1 text-xs transition-colors ${
                showComments ? 'text-blue-400' : 'text-white/80 hover:text-blue-400'
              }`}
            >
              <MessageCircle className="w-4 h-4" />
              <span>{comments.length || ''}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Comments panel */}
      {showComments && (
        <div className="mt-2 bg-white rounded-xl shadow-lg p-3 max-h-48 overflow-y-auto">
          {comments.length === 0 ? (
            <p className="text-sm text-moodkin-gray text-center py-2">No comments yet</p>
          ) : (
            <div className="space-y-2 mb-2">
              {comments.map((comment) => (
                <div key={comment.id} className="text-sm">
                  <span className="font-medium text-moodkin-dark">{comment.user_name}: </span>
                  <span className="text-moodkin-gray">{comment.content}</span>
                </div>
              ))}
            </div>
          )}

          <form onSubmit={handleAddComment} className="flex gap-2 mt-2 pt-2 border-t border-moodkin-light-gray">
            <input
              type="text"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Add a comment..."
              className="flex-1 text-sm px-2 py-1 rounded-lg border border-moodkin-light-gray focus:outline-none focus:border-moodkin-gold"
            />
            <button
              type="submit"
              disabled={addComment.isPending || !newComment.trim()}
              className="p-1.5 bg-moodkin-gold hover:bg-moodkin-gold-hover rounded-lg disabled:opacity-50"
            >
              {addComment.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin text-moodkin-dark" />
              ) : (
                <Send className="w-4 h-4 text-moodkin-dark" />
              )}
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
