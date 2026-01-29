'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { ChevronLeft, MoreHorizontal, Sparkles, ImagePlus, ExternalLink } from 'lucide-react'
import { useConversation } from '@/hooks/use-conversations'
import { Button } from '@/components/ui/button'

// Placeholder images for demo
const placeholderAssets = [
  { id: '1', name: 'Portrait_01.jpg', url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&q=80' },
  { id: '2', name: 'Studio_Setup.png', url: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&q=80' },
  { id: '3', name: 'Fabric_Swatches.jpg', url: 'https://images.unsplash.com/photo-1558171813-4c088753af8f?w=400&q=80' },
  { id: '4', name: 'Location_Scout.jpg', url: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&q=80' },
]

const tabs = [
  { id: 'uploads', label: 'Uploads' },
  { id: 'creative', label: 'Creative' },
  { id: 'client', label: 'Client' },
  { id: 'links', label: 'Links' },
]

export default function ProjectDetailPage() {
  const { conversationId } = useParams<{ conversationId: string }>()
  const router = useRouter()
  const { data: project, isLoading } = useConversation(conversationId)
  const [activeTab, setActiveTab] = useState('uploads')

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
            <p className="text-sm text-moodkin-gold font-medium tracking-wider uppercase">MOODKIN</p>
            <h1 className="text-xl font-bold text-moodkin-dark">{project.title}</h1>
          </div>
        </div>
        <button className="p-2 hover:bg-moodkin-cream rounded-xl transition-colors">
          <MoreHorizontal className="w-6 h-6 text-moodkin-dark" />
        </button>
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

            {/* Asset Cards */}
            {placeholderAssets.map((asset) => (
              <div
                key={asset.id}
                className="aspect-square relative rounded-2xl overflow-hidden group cursor-pointer"
              >
                <Image
                  src={asset.url}
                  alt={asset.name}
                  fill
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                <p className="absolute bottom-3 left-3 text-white text-sm font-medium">
                  {asset.name}
                </p>
              </div>
            ))}

            {/* Add Asset Card */}
            <div className="aspect-square bg-moodkin-cream/50 rounded-2xl border-2 border-dashed border-moodkin-light-gray flex flex-col items-center justify-center cursor-pointer hover:border-moodkin-gold hover:bg-moodkin-cream transition-colors">
              <ImagePlus className="w-8 h-8 text-moodkin-gold mb-2" />
              <p className="text-sm text-moodkin-gray font-medium">Add Asset</p>
            </div>
          </div>
        )}

        {activeTab === 'creative' && (
          <div className="text-center py-12 text-moodkin-gray">
            Creative assets will appear here
          </div>
        )}

        {activeTab === 'client' && (
          <div className="text-center py-12 text-moodkin-gray">
            Client assets will appear here
          </div>
        )}

        {activeTab === 'links' && (
          <div className="text-center py-12 text-moodkin-gray">
            Links and references will appear here
          </div>
        )}
      </div>

      {/* Create Moodboard Button */}
      <div className="mt-8 pb-4">
        <Button className="w-full bg-moodkin-gold hover:bg-moodkin-gold-hover text-moodkin-dark font-bold rounded-2xl py-6 text-base tracking-wider">
          CREATE MOODBOARD
        </Button>
      </div>
    </div>
  )
}
