'use client'

import { useState } from 'react'
import { Dialog, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/toast'
import { useProjectUsers, useInviteUser, useRemoveProjectUser, useResendInvite, useUpdateProjectUserRole } from '@/hooks/use-project-users'
import { Camera, Loader2, Mail, X, Clock, CheckCircle, Users, UserPlus, Send, Crown, User } from 'lucide-react'
import type { ProjectUserRole } from '@/types/database'

interface InviteUserDialogProps {
  open: boolean
  onClose: () => void
  projectId: string
  projectTitle: string
}

export function InviteUserDialog({ open, onClose, projectId, projectTitle }: InviteUserDialogProps) {
  const [activeTab, setActiveTab] = useState<'invite' | 'manage'>('invite')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<ProjectUserRole>('creative')
  const { showToast } = useToast()
  const { data: projectUsers, isLoading: usersLoading } = useProjectUsers(projectId)
  const inviteUser = useInviteUser(projectId)
  const removeUser = useRemoveProjectUser(projectId)
  const resendInvite = useResendInvite(projectId)
  const updateRole = useUpdateProjectUserRole(projectId)

  function handleToggleRole(userId: string, currentRole: ProjectUserRole) {
    const newRole: ProjectUserRole = currentRole === 'creative' ? 'client' : 'creative'
    updateRole.mutate(
      { userId, role: newRole },
      {
        onSuccess: () => {
          showToast(`Role updated to ${newRole}`, 'success')
        },
        onError: (error) => {
          showToast(error.message || 'Failed to update role', 'error')
        },
      }
    )
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return

    const inviteEmail = email.trim().toLowerCase()
    inviteUser.mutate(
      { email: inviteEmail, role },
      {
        onSuccess: () => {
          showToast(`Invite sent to ${inviteEmail}`, 'success')
          setEmail('')
          setRole('creative')
        },
        onError: (error) => {
          showToast(error.message || 'Failed to send invite', 'error')
        },
      }
    )
  }

  function handleRevoke(userId: string, userEmail: string) {
    if (!confirm(`Revoke invite for ${userEmail}?`)) return

    removeUser.mutate(userId, {
      onSuccess: () => {
        showToast(`Invite revoked for ${userEmail}`, 'success')
      },
      onError: (error) => {
        showToast(error.message || 'Failed to revoke invite', 'error')
      },
    })
  }

  function handleResend(userId: string, userEmail: string) {
    resendInvite.mutate(userId, {
      onSuccess: () => {
        showToast(`Invite resent to ${userEmail}`, 'success')
      },
      onError: (error) => {
        showToast(error.message || 'Failed to resend invite', 'error')
      },
    })
  }

  function handleClose() {
    if (!inviteUser.isPending) {
      setEmail('')
      setRole('creative')
      setActiveTab('invite')
      inviteUser.reset()
      onClose()
    }
  }

  const pendingInvites = projectUsers?.filter(u => u.invite_status === 'pending') || []
  const acceptedInvites = projectUsers?.filter(u => u.invite_status === 'accepted') || []

  return (
    <Dialog open={open} onClose={handleClose} className="max-w-lg">
      <DialogHeader>
        <DialogTitle>Project Collaborators</DialogTitle>
        <DialogDescription>
          Manage access to &quot;{projectTitle}&quot;
        </DialogDescription>
      </DialogHeader>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-moodkin-cream/50 rounded-xl mb-4">
        <button
          onClick={() => setActiveTab('invite')}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'invite'
              ? 'bg-white text-moodkin-dark shadow-sm'
              : 'text-moodkin-gray hover:text-moodkin-dark'
          }`}
        >
          <UserPlus className="w-4 h-4" />
          Send Invite
        </button>
        <button
          onClick={() => setActiveTab('manage')}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'manage'
              ? 'bg-white text-moodkin-dark shadow-sm'
              : 'text-moodkin-gray hover:text-moodkin-dark'
          }`}
        >
          <Users className="w-4 h-4" />
          Manage
          {projectUsers && projectUsers.length > 0 && (
            <span className="ml-1 px-1.5 py-0.5 bg-moodkin-gold/20 text-moodkin-dark text-xs rounded-full">
              {projectUsers.length}
            </span>
          )}
        </button>
      </div>

      {activeTab === 'invite' ? (
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Email Input */}
          <div>
            <label className="block text-sm font-medium text-moodkin-dark mb-2">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-moodkin-gray/50" />
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="collaborator@email.com"
                className="pl-11"
                required
              />
            </div>
          </div>

          {/* Role Selection */}
          <div>
            <label className="block text-sm font-medium text-moodkin-dark mb-2">
              Invite as
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setRole('creative')}
                className={`p-4 rounded-xl border-2 transition-all ${
                  role === 'creative'
                    ? 'border-moodkin-gold bg-moodkin-gold/10'
                    : 'border-moodkin-light-gray hover:border-moodkin-gold/50'
                }`}
              >
                <Camera className={`w-6 h-6 mx-auto mb-2 ${role === 'creative' ? 'text-moodkin-gold' : 'text-moodkin-gray'}`} />
                <p className={`font-medium text-sm ${role === 'creative' ? 'text-moodkin-dark' : 'text-moodkin-gray'}`}>
                  Creative
                </p>
                <p className="text-xs text-moodkin-gray mt-1">
                  Photographers, stylists, designers
                </p>
              </button>

              <button
                type="button"
                onClick={() => setRole('client')}
                className={`p-4 rounded-xl border-2 transition-all ${
                  role === 'client'
                    ? 'border-moodkin-gold bg-moodkin-gold/10'
                    : 'border-moodkin-light-gray hover:border-moodkin-gold/50'
                }`}
              >
                <User className={`w-6 h-6 mx-auto mb-2 ${role === 'client' ? 'text-moodkin-gold' : 'text-moodkin-gray'}`} />
                <p className={`font-medium text-sm ${role === 'client' ? 'text-moodkin-dark' : 'text-moodkin-gray'}`}>
                  Client
                </p>
                <p className="text-xs text-moodkin-gray mt-1">
                  View project and provide feedback
                </p>
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            variant="primary"
            className="w-full"
            disabled={inviteUser.isPending || !email.trim()}
          >
            {inviteUser.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Sending Invite...
              </>
            ) : (
              'Send Invitation'
            )}
          </Button>
        </form>
      ) : (
        <div className="space-y-4">
          {usersLoading ? (
            <div className="text-center py-8">
              <Loader2 className="w-6 h-6 text-moodkin-gold animate-spin mx-auto" />
            </div>
          ) : projectUsers && projectUsers.length > 0 ? (
            <>
              {/* Owner */}
              {projectUsers.filter(u => u.is_owner).length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold text-moodkin-gray uppercase tracking-wider mb-2">
                    Owner
                  </h3>
                  <div className="space-y-2">
                    {projectUsers.filter(u => u.is_owner).map((user) => (
                      <div
                        key={user.id}
                        className="flex items-center justify-between p-3 rounded-xl bg-moodkin-gold/10 border border-moodkin-gold/30"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-9 h-9 rounded-full bg-moodkin-gold/30 flex items-center justify-center flex-shrink-0">
                            <Crown className="w-4 h-4 text-moodkin-gold" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-moodkin-dark truncate">{user.email}</p>
                            <div className="flex items-center gap-2">
                              <span className="inline-flex items-center gap-1 text-xs text-moodkin-gold font-medium">
                                <Crown className="w-3 h-3" />
                                Owner
                              </span>
                              <span className="text-xs text-moodkin-gray">•</span>
                              <button
                                onClick={() => handleToggleRole(user.id, user.role)}
                                disabled={updateRole.isPending}
                                className={`inline-flex items-center gap-1 text-xs font-medium capitalize rounded px-1.5 py-0.5 transition-colors hover:bg-opacity-20 ${
                                  user.role === 'creative'
                                    ? 'text-purple-600 hover:bg-purple-200'
                                    : 'text-blue-600 hover:bg-blue-200'
                                }`}
                                title="Click to change role"
                              >
                                {user.role === 'creative' ? (
                                  <Camera className="w-3 h-3" />
                                ) : (
                                  <User className="w-3 h-3" />
                                )}
                                {user.role}
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Pending Invites */}
              {pendingInvites.filter(u => !u.is_owner).length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold text-moodkin-gray uppercase tracking-wider mb-2">
                    Pending Invites ({pendingInvites.filter(u => !u.is_owner).length})
                  </h3>
                  <div className="space-y-2">
                    {pendingInvites.filter(u => !u.is_owner).map((user) => (
                      <div
                        key={user.id}
                        className="flex items-center justify-between p-3 rounded-xl bg-amber-50 border border-amber-100"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${
                            user.role === 'creative' ? 'bg-purple-100' : 'bg-blue-100'
                          }`}>
                            {user.role === 'creative' ? (
                              <Camera className="w-4 h-4 text-purple-600" />
                            ) : (
                              <User className="w-4 h-4 text-blue-600" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-moodkin-dark truncate">{user.email}</p>
                            <div className="flex items-center gap-2">
                            <span className="inline-flex items-center gap-1 text-xs text-amber-600">
                                <Clock className="w-3 h-3" />
                                Pending
                              </span>
                              <button
                                onClick={() => handleToggleRole(user.id, user.role)}
                                disabled={updateRole.isPending}
                                className={`inline-flex items-center gap-1 text-xs font-medium capitalize rounded px-1.5 py-0.5 transition-colors hover:bg-opacity-20 ${
                                  user.role === 'creative'
                                    ? 'text-purple-600 hover:bg-purple-200'
                                    : 'text-blue-600 hover:bg-blue-200'
                                }`}
                                title="Click to change role"
                              >
                                {user.role === 'creative' ? (
                                  <Camera className="w-3 h-3" />
                                ) : (
                                  <User className="w-3 h-3" />
                                )}
                                {user.role}
                              </button>
                              
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button
                            onClick={() => handleResend(user.id, user.email)}
                            disabled={resendInvite.isPending}
                            className="p-2 text-moodkin-gray hover:text-moodkin-gold hover:bg-moodkin-gold/10 rounded-lg transition-colors"
                            title="Resend invite"
                          >
                            {resendInvite.isPending ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Send className="w-4 h-4" />
                            )}
                          </button>
                          <button
                            onClick={() => handleRevoke(user.id, user.email)}
                            disabled={removeUser.isPending}
                            className="p-2 text-moodkin-gray hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            title="Revoke invite"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Accepted Members */}
              {acceptedInvites.filter(u => !u.is_owner).length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold text-moodkin-gray uppercase tracking-wider mb-2">
                    Active Members ({acceptedInvites.filter(u => !u.is_owner).length})
                  </h3>
                  <div className="space-y-2">
                    {acceptedInvites.filter(u => !u.is_owner).map((user) => (
                      <div
                        key={user.id}
                        className={`flex items-center justify-between p-3 rounded-xl border ${
                          user.role === 'creative'
                            ? 'bg-purple-50 border-purple-100'
                            : 'bg-blue-50 border-blue-100'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${
                            user.role === 'creative' ? 'bg-purple-100' : 'bg-blue-100'
                          }`}>
                            {user.role === 'creative' ? (
                              <Camera className="w-4 h-4 text-purple-600" />
                            ) : (
                              <User className="w-4 h-4 text-blue-600" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-moodkin-dark truncate">{user.email}</p>
                            <div className="flex items-center gap-2">
                            <span className="inline-flex items-center gap-1 text-xs text-green-600">
                                <CheckCircle className="w-3 h-3" />
                                Active
                              </span>

                              <button
                                onClick={() => handleToggleRole(user.id, user.role)}
                                disabled={updateRole.isPending}
                                className={`inline-flex items-center gap-1 text-xs font-medium capitalize rounded px-1.5 py-0.5 transition-colors hover:bg-opacity-20 ${
                                  user.role === 'creative'
                                    ? 'text-purple-600 hover:bg-purple-200'
                                    : 'text-blue-600 hover:bg-blue-200'
                                }`}
                                title="Click to change role"
                              >
                                {user.role === 'creative' ? (
                                  <Camera className="w-3 h-3" />
                                ) : (
                                  <User className="w-3 h-3" />
                                )}
                                {user.role}
                              </button>
                             
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => handleRevoke(user.id, user.email)}
                          disabled={removeUser.isPending}
                          className="p-2 text-moodkin-gray hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
                          title="Remove access"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-8 text-moodkin-gray">
              <Users className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p className="font-medium">No collaborators yet</p>
              <p className="text-sm mt-1">Send an invite to get started</p>
              <Button
                onClick={() => setActiveTab('invite')}
                variant="outline"
                className="mt-4"
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Send Invite
              </Button>
            </div>
          )}
        </div>
      )}
    </Dialog>
  )
}
