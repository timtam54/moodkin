'use client'

import { Crown, HandHelping, Sparkles } from 'lucide-react'
import { Dialog } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

interface OwnershipInfoDialogProps {
  open: boolean
  onClose: () => void
  isOwner: boolean
  isSubscribed: boolean
  ownerEmail?: string | null
  onSubscribe?: () => void
}

export function OwnershipInfoDialog({
  open,
  onClose,
  isOwner,
  isSubscribed,
  ownerEmail,
  onSubscribe,
}: OwnershipInfoDialogProps) {
  return (
    <Dialog open={open} onClose={onClose}>
      <div className="text-center">
        <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${
          isOwner ? 'bg-moodkin-gold/20' : 'bg-moodkin-cream'
        }`}>
          {isOwner ? (
            <Crown className="w-8 h-8 text-moodkin-gold" />
          ) : (
            <HandHelping className="w-8 h-8 text-moodkin-gray" />
          )}
        </div>
        <h2 className="text-xl font-bold text-moodkin-dark mb-2">
          {isOwner ? "You're the Project Owner" : "You're a Collaborator"}
        </h2>
        <p className="text-moodkin-gray mb-6">
          {isOwner
            ? "As the owner, you manage this project. Your subscription unlocks premium features for yourself."
            : `This project is owned by ${ownerEmail || 'another user'}. Subscribe to unlock premium features like AI image generation.`
          }
        </p>

        {/* Subscription Status Badge */}
        <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl mb-4 ${
          isSubscribed
            ? 'bg-green-100 text-green-800'
            : 'bg-moodkin-light-gray/30 text-moodkin-gray'
        }`}>
          {isSubscribed ? (
            <>
              <Crown className="w-4 h-4 text-green-600" />
              <span className="text-sm font-medium">Premium Active</span>
            </>
          ) : (
            <span className="text-sm font-medium">Free Plan</span>
          )}
        </div>

        {/* Subscription benefits */}
        <div className="bg-moodkin-cream/50 rounded-xl p-4 mb-4">
          <h3 className="font-semibold text-moodkin-dark mb-3 flex items-center justify-center gap-2">
            <Sparkles className="w-4 h-4 text-moodkin-gold" />
            {isSubscribed ? 'Premium Features Active' : 'Premium Features'}
          </h3>
          <ul className="text-sm text-moodkin-dark space-y-2">
            <li className="flex items-center gap-2">
              <span className={isSubscribed ? 'text-green-600' : 'text-moodkin-gray'}>✓</span>
              Unlimited projects
            </li>
            <li className="flex items-center gap-2">
              <span className={isSubscribed ? 'text-green-600' : 'text-moodkin-gray'}>✓</span>
              100 AI image generations per month
            </li>
            <li className="flex items-center gap-2">
              <span className={isSubscribed ? 'text-green-600' : 'text-moodkin-gray'}>✓</span>
              1024×1024 resolution images
            </li>
          </ul>
        </div>

        {!isSubscribed && (
          <div className="bg-moodkin-light-gray/30 rounded-xl p-4 mb-4">
            <h3 className="font-semibold text-moodkin-dark mb-3">Free Tier Limits</h3>
            <ul className="text-sm text-moodkin-gray space-y-2">
              <li className="flex items-center gap-2">
                <span>•</span>
                3 projects maximum
              </li>
              <li className="flex items-center gap-2">
                <span>•</span>
                No AI image generations
              </li>
            </ul>
          </div>
        )}

        {isOwner && !isSubscribed && onSubscribe && (
          <Button
            onClick={() => {
              onClose()
              onSubscribe()
            }}
            className="w-full bg-moodkin-gold hover:bg-moodkin-gold-hover text-moodkin-dark font-semibold"
          >
            Subscribe to Unlock Premium
          </Button>
        )}

        {!isOwner && !isSubscribed && onSubscribe && (
          <Button
            onClick={() => {
              onClose()
              onSubscribe()
            }}
            className="w-full bg-moodkin-gold hover:bg-moodkin-gold-hover text-moodkin-dark font-semibold"
          >
            Subscribe to Unlock Premium
          </Button>
        )}
      </div>
    </Dialog>
  )
}
