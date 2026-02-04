'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Link as LinkIcon, Check, Archive } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface ConversationHeaderProps {
  title: string
  clientName: string
  status: string
  conversationId: string
  onArchive?: () => void
}

export function ConversationHeader({
  title,
  clientName,
  status,
  conversationId,
  onArchive,
}: ConversationHeaderProps) {
  const [copied, setCopied] = useState(false)
  const [generating, setGenerating] = useState(false)

  async function handleGenerateInvite() {
    setGenerating(true)
    try {
      const res = await fetch(`/api/conversations/${conversationId}/invite`, {
        method: 'POST',
      })
      if (!res.ok) throw new Error('Failed to generate invite')
      const { url } = await res.json()
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 3000)
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="flex items-center justify-between pb-4 border-b">
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard/projects"
          className="text-gray-400 hover:text-gray-600"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-semibold text-gray-900">{title}</h1>
            <Badge variant={status === 'active' ? 'success' : 'default'}>
              {status}
            </Badge>
          </div>
          <p className="text-sm text-gray-500">{clientName}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handleGenerateInvite}
          disabled={generating}
        >
          {copied ? (
            <><Check className="w-4 h-4 mr-1" /> Copied!</>
          ) : (
            <><LinkIcon className="w-4 h-4 mr-1" /> Invite Link</>
          )}
        </Button>
        {onArchive && status === 'active' && (
          <Button variant="ghost" size="sm" onClick={onArchive}>
            <Archive className="w-4 h-4" />
          </Button>
        )}
      </div>
    </div>
  )
}
