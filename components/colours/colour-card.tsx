'use client'

import { useState } from 'react'
import { Heart, Flag, MessageCircle, X, Send, Loader2, Copy, Check } from 'lucide-react'
import { useColourReactions, useAddColourReaction, useRemoveColourReaction, useColourComments, useAddColourComment } from '@/hooks/use-project-colours'
import type { ProjectColour } from '@/types/database'

interface ColourCardProps {
  colour: ProjectColour
  onDelete: (id: string) => void
  currentUserId: string
  currentUserName?: string
  canDelete: boolean
}

export function ColourCard({ colour, onDelete, currentUserId, currentUserName = 'Unknown', canDelete }: ColourCardProps) {
  const [showComments, setShowComments] = useState(false)
  const [newComment, setNewComment] = useState('')
  const [copied, setCopied] = useState(false)

  const { data: reactions = [] } = useColourReactions(colour.id)
  const { data: comments = [] } = useColourComments(colour.id)
  const addReaction = useAddColourReaction(colour.id, currentUserId, currentUserName)
  const removeReaction = useRemoveColourReaction(colour.id, currentUserId)
  const addComment = useAddColourComment(colour.id)

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

  const handleCopy = () => {
    navigator.clipboard.writeText(colour.hex_color)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Calculate if text should be light or dark based on background
  const isLightColor = (hex: string) => {
    const r = parseInt(hex.slice(1, 3), 16)
    const g = parseInt(hex.slice(3, 5), 16)
    const b = parseInt(hex.slice(5, 7), 16)
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
    return luminance > 0.5
  }

  const textColor = isLightColor(colour.hex_color) ? 'text-gray-900' : 'text-white'
  const textColorMuted = isLightColor(colour.hex_color) ? 'text-gray-700' : 'text-white/80'

  return (
    <div className="relative">
      {/* Colour swatch */}
      <div
        className="aspect-square relative rounded-2xl overflow-hidden shadow-sm"
        style={{ backgroundColor: colour.hex_color }}
      >
        {/* Delete button */}
        {canDelete && (
          <button
            onClick={() => onDelete(colour.id)}
            className="absolute top-2 right-2 p-2 bg-red-500 hover:bg-red-600 rounded-full transition-colors shadow-lg z-10"
          >
            <X className="w-4 h-4 text-white" />
          </button>
        )}

        {/* Copy button */}
        <button
          onClick={handleCopy}
          className={`absolute top-2 left-2 p-2 rounded-full transition-colors shadow-lg z-10 ${
            isLightColor(colour.hex_color) ? 'bg-black/10 hover:bg-black/20' : 'bg-white/10 hover:bg-white/20'
          }`}
          title="Copy hex code"
        >
          {copied ? (
            <Check className={`w-4 h-4 ${textColor}`} />
          ) : (
            <Copy className={`w-4 h-4 ${textColor}`} />
          )}
        </button>

        {/* Bottom info */}
        <div className="absolute bottom-0 left-0 right-0 p-3">
          <p className={`font-mono text-sm font-bold ${textColor}`}>
            {colour.hex_color}
          </p>
          {colour.name && (
            <p className={`text-sm ${textColorMuted}`}>{colour.name}</p>
          )}
          <p className={`text-xs ${textColorMuted} mt-1`}>
            by {colour.added_by_name || 'Unknown'}
          </p>

          {/* Interaction buttons */}
          <div className="flex items-center gap-3 mt-2">
            <button
              onClick={handleLike}
              disabled={addReaction.isPending || removeReaction.isPending}
              className={`flex items-center gap-1 text-xs transition-colors ${
                userLiked ? 'text-pink-400' : `${textColorMuted} hover:text-pink-400`
              }`}
            >
              <Heart className={`w-4 h-4 ${userLiked ? 'fill-current' : ''}`} />
              <span>{likes.length || ''}</span>
            </button>

            <button
              onClick={handleFlag}
              disabled={addReaction.isPending || removeReaction.isPending}
              className={`flex items-center gap-1 text-xs transition-colors ${
                userFlagged ? 'text-red-500' : `${textColorMuted} hover:text-red-500`
              }`}
            >
              <Flag className={`w-4 h-4 ${userFlagged ? 'fill-current' : ''}`} />
              <span>{flags.length || ''}</span>
            </button>

            <button
              onClick={() => setShowComments(!showComments)}
              className={`flex items-center gap-1 text-xs transition-colors ${
                showComments ? 'text-blue-400' : `${textColorMuted} hover:text-blue-400`
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
