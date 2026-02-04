'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Heart, Flag, MessageCircle, X, Send, Loader2, ExternalLink } from 'lucide-react'
import { useAssetReactions, useAddReaction, useRemoveReaction, useAssetComments, useAddComment } from '@/hooks/use-asset-interactions'
import type { ProjectAsset } from '@/types/database'

interface LinkCardProps {
  link: ProjectAsset
  onDelete: (id: string) => void
  currentUserId: string
  getLinkIcon: (url: string) => string
}

export function LinkCard({ link, onDelete, currentUserId, getLinkIcon }: LinkCardProps) {
  const [showComments, setShowComments] = useState(false)
  const [newComment, setNewComment] = useState('')

  const { data: reactions = [] } = useAssetReactions(link.id)
  const { data: comments = [] } = useAssetComments(link.id)
  const addReaction = useAddReaction(link.id)
  const removeReaction = useRemoveReaction(link.id)
  const addComment = useAddComment(link.id)

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

  const getHostname = (url: string) => {
    try {
      return new URL(url).hostname
    } catch {
      return url
    }
  }

  return (
    <div className="relative">
      <div className="group bg-white rounded-2xl shadow-sm hover:shadow-md transition-all relative overflow-hidden">
        {/* Thumbnail */}
        {link.thumbnail_url && (
          <a
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className="block relative h-32 bg-moodkin-light-gray"
          >
            <Image
              src={link.thumbnail_url}
              alt={link.title || ''}
              fill
              className="object-cover"
              unoptimized
            />
          </a>
        )}

        <div className="p-4">
          <a
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-start gap-3"
          >
            <span className="text-2xl">{getLinkIcon(link.url)}</span>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-moodkin-dark truncate group-hover:text-moodkin-gold transition-colors">
                {link.title || getHostname(link.url)}
              </p>
              <p className="text-sm text-moodkin-gray truncate">{link.url}</p>
              <p className="text-xs text-moodkin-gray mt-1">
                Added by {link.uploaded_by_name || 'Unknown'}
              </p>
            </div>
            <ExternalLink className="w-4 h-4 text-moodkin-gray group-hover:text-moodkin-gold flex-shrink-0" />
          </a>

          {/* Delete button */}
          <button
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              onDelete(link.id)
            }}
            className="absolute top-2 right-2 p-1.5 bg-red-500 hover:bg-red-600 rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-10"
          >
            <X className="w-3 h-3 text-white" />
          </button>

          {/* Interaction buttons */}
          <div className="flex items-center gap-4 mt-3 pt-3 border-t border-moodkin-light-gray/50">
            <button
              onClick={handleLike}
              disabled={addReaction.isPending || removeReaction.isPending}
              className={`flex items-center gap-1.5 text-sm transition-colors ${
                userLiked ? 'text-pink-500' : 'text-moodkin-gray hover:text-pink-500'
              }`}
            >
              <Heart className={`w-4 h-4 ${userLiked ? 'fill-current' : ''}`} />
              <span>{likes.length || 0}</span>
            </button>

            <button
              onClick={handleFlag}
              disabled={addReaction.isPending || removeReaction.isPending}
              className={`flex items-center gap-1.5 text-sm transition-colors ${
                userFlagged ? 'text-red-500' : 'text-moodkin-gray hover:text-red-500'
              }`}
            >
              <Flag className={`w-4 h-4 ${userFlagged ? 'fill-current' : ''}`} />
              <span>{flags.length || 0}</span>
            </button>

            <button
              onClick={() => setShowComments(!showComments)}
              className={`flex items-center gap-1.5 text-sm transition-colors ${
                showComments ? 'text-blue-500' : 'text-moodkin-gray hover:text-blue-500'
              }`}
            >
              <MessageCircle className="w-4 h-4" />
              <span>{comments.length || 0}</span>
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
