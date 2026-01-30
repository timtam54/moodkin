'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Plus, Search, Users, UserPlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { EmptyState } from '@/components/ui/empty-state'
import { ClientCard } from '@/components/clients/client-card'
import { useClients } from '@/hooks/use-clients'

export default function ClientsPage() {
  const [search, setSearch] = useState('')
  const { data: clients, isLoading } = useClients(search || undefined)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-moodkin-dark">Clients</h1>
          <p className="text-moodkin-gray mt-1">Manage your client list</p>
        </div>
        <Link href="/dashboard/clients/new">
          <Button variant="primary">
            <Plus className="w-4 h-4 mr-2" />
            Add Client
          </Button>
        </Link>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-moodkin-gray" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search clients..."
          className="pl-10"
        />
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-moodkin-gray">Loading...</div>
      ) : !clients?.length ? (
        <div className="bg-white rounded-2xl shadow-sm p-8">
          <EmptyState
            icon={Users}
            title="No clients yet"
            description="Add your first client to get started"
            action={
              <Link href="/dashboard/clients/new">
                <Button variant="primary" size="sm">
                  <Plus className="w-4 h-4 mr-1" />
                  Add Client
                </Button>
              </Link>
            }
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {/* Add Client Card */}
          <Link
            href="/dashboard/clients/new"
            className="aspect-square bg-moodkin-gold rounded-2xl p-4 flex flex-col items-center justify-center cursor-pointer hover:bg-moodkin-gold-hover transition-colors"
          >
            <div className="w-16 h-16 bg-moodkin-gold-hover/30 rounded-full flex items-center justify-center mb-3">
              <UserPlus className="w-8 h-8 text-moodkin-dark" />
            </div>
            <p className="font-bold text-moodkin-dark text-center text-sm">ADD NEW</p>
            <p className="font-bold text-moodkin-dark text-center text-sm">CLIENT</p>
          </Link>

          {/* Client Cards */}
          {clients.map((client) => (
            <ClientCard key={client.id} client={client} />
          ))}
        </div>
      )}
    </div>
  )
}
